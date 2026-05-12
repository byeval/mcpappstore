type CloudflareWorkersModule = {
  env: Env;
};

// Keep the native Workers module out of Vite's dependency scanner during local dev.
const loadWorkersModule = new Function(
  'return import("cloudflare:workers")',
) as () => Promise<CloudflareWorkersModule>;

export async function getCloudflareEnv(): Promise<Env | null> {
  try {
    const { env } = await loadWorkersModule();
    return env;
  } catch {
    return null;
  }
}

export async function getEnvValue(key: string): Promise<string | undefined> {
  const runtimeEnv = await getCloudflareEnv();
  const runtimeValue = runtimeEnv?.[key as keyof Env];
  if (typeof runtimeValue === "string" && runtimeValue.length > 0) {
    return runtimeValue;
  }

  const processValue = process.env[key];
  return processValue && processValue.length > 0 ? processValue : undefined;
}

export async function getDb() {
  const env = await getCloudflareEnv();
  return env?.DB ?? null;
}

export async function getBucket() {
  const env = await getCloudflareEnv();
  return env?.BUCKET ?? null;
}

export async function getKv() {
  const env = await getCloudflareEnv();
  return env?.KV ?? null;
}
