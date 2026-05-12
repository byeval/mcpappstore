import { getEnvValue } from "@/lib/cloudflare";

export interface TurnstileResult {
  success: boolean;
  skipped?: boolean;
  message?: string;
}

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<TurnstileResult> {
  const secret = await getEnvValue("TURNSTILE_SECRET");
  if (!secret) {
    return {
      success: true,
      skipped: true,
    };
  }

  if (!token) {
    return {
      success: false,
      message: "Captcha token missing.",
    };
  }

  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", token);
  if (ip) {
    formData.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  if (payload.success) {
    return { success: true };
  }

  return {
    success: false,
    message: payload["error-codes"]?.join(", ") || "Captcha verification failed.",
  };
}
