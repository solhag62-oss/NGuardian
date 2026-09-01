import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return v;
}

export const config = {
  navaApiKey: required("NAVA_API_KEY"),
  navaAgentId: required("NAVA_AGENT_ID"),
  navaApiBaseUrl: process.env.NAVA_API_BASE_URL ?? "https://api.navalabs.ai",
  clientMode: (process.env.NAVA_CLIENT_MODE ?? "rest") as "rest" | "sdk",
  verdictTimeoutMs: Number(process.env.NAVA_VERDICT_TIMEOUT_MS ?? 15000),
};

// Guardrail: fail loudly at import time if someone accidentally logs this
// module. Never spread `config` into console.log / error output / analytics.
