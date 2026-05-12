import type { NextRequest } from "next/server";

import { getEnvValue } from "@/lib/cloudflare";

const encoder = new TextEncoder();
const accessCertCacheTtlMs = 10 * 60 * 1000;

interface AccessJwtPayload {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  name?: string;
  common_name?: string;
  sub?: string;
}

interface AccessJwtHeader {
  alg?: string;
  kid?: string;
}

type AccessJwk = JsonWebKey & { kid?: string };

let accessCertCache:
  | {
      certsUrl: string;
      expiresAt: number;
      keys: AccessJwk[];
    }
  | null = null;

function decodeBase64(value: string): string {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeJwtPart<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
  } catch {
    return null;
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);

  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAdminAuthorized(authHeader: string | null, hostname?: string): Promise<boolean> {
  return isBasicAdminAuthorized(authHeader, hostname);
}

async function isBasicAdminAuthorized(authHeader: string | null, hostname?: string): Promise<boolean> {
  const adminUser = await getEnvValue("ADMIN_USER");
  const adminPassHash = await getEnvValue("ADMIN_PASS_HASH");

  if (!adminUser || !adminPassHash) {
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  if (!authHeader?.startsWith("Basic ")) {
    return false;
  }

  const decoded = decodeBase64(authHeader.slice(6));
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return false;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  const passwordHash = await sha256Hex(password);

  return constantTimeEqual(username, adminUser) && constantTimeEqual(passwordHash, adminPassHash);
}

async function accessConfig(): Promise<{ teamDomain: string; aud: string } | null> {
  const rawTeamDomain =
    (await getEnvValue("CF_ACCESS_TEAM_DOMAIN")) ?? (await getEnvValue("CLOUDFLARE_ACCESS_TEAM_DOMAIN"));
  const aud = (await getEnvValue("CF_ACCESS_AUD")) ?? (await getEnvValue("CLOUDFLARE_ACCESS_AUD"));

  if (!rawTeamDomain || !aud) {
    return null;
  }

  const teamDomain = rawTeamDomain.startsWith("http") ? rawTeamDomain : `https://${rawTeamDomain}`;

  return {
    teamDomain: teamDomain.replace(/\/$/, ""),
    aud,
  };
}

async function getAccessSigningKeys(teamDomain: string): Promise<AccessJwk[]> {
  const certsUrl = `${teamDomain}/cdn-cgi/access/certs`;
  const now = Date.now();

  if (accessCertCache && accessCertCache.certsUrl === certsUrl && accessCertCache.expiresAt > now) {
    return accessCertCache.keys;
  }

  const response = await fetch(certsUrl, {
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { keys?: AccessJwk[] };
  const keys = payload.keys ?? [];
  accessCertCache = {
    certsUrl,
    expiresAt: now + accessCertCacheTtlMs,
    keys,
  };

  return keys;
}

function hasExpectedAudience(payload: AccessJwtPayload, expectedAud: string): boolean {
  if (Array.isArray(payload.aud)) {
    return payload.aud.includes(expectedAud);
  }

  return payload.aud === expectedAud;
}

async function verifyAccessJwt(request: Request | NextRequest): Promise<AccessJwtPayload | null> {
  const config = await accessConfig();
  if (!config) {
    return null;
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  const parts = token?.split(".");
  if (!parts || parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart<AccessJwtHeader>(encodedHeader);
  const payload = decodeJwtPart<AccessJwtPayload>(encodedPayload);
  if (!header || !payload || header.alg !== "RS256") {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== config.teamDomain ||
    !hasExpectedAudience(payload, config.aud) ||
    (payload.exp !== undefined && payload.exp <= nowSeconds) ||
    (payload.nbf !== undefined && payload.nbf > nowSeconds + 60)
  ) {
    return null;
  }

  const keys = await getAccessSigningKeys(config.teamDomain);
  const candidateKeys = header.kid ? keys.filter((key) => key.kid === header.kid) : keys;
  const signedData = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64Url(encodedSignature);

  for (const key of candidateKeys) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        "jwk",
        key,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      if (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData)) {
        return payload;
      }
    } catch {
      // Try the next key. Access exposes the active and recently rotated signing keys.
    }
  }

  return null;
}

export async function isAdminRequestAuthorized(request: Request | NextRequest, hostname?: string): Promise<boolean> {
  if (await verifyAccessJwt(request)) {
    return true;
  }

  return isBasicAdminAuthorized(request.headers.get("authorization"), hostname);
}

export function basicAuthChallenge() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MCP App Store Admin"',
    },
  });
}

export async function getReviewer(request: Request | NextRequest): Promise<string> {
  const accessPayload = await verifyAccessJwt(request);
  if (accessPayload) {
    return accessPayload.email ?? accessPayload.name ?? accessPayload.common_name ?? accessPayload.sub ?? "cloudflare-access";
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return "admin";
  }

  const decoded = decodeBase64(authHeader.slice(6));
  return decoded.split(":")[0] || "admin";
}
