import { config } from "./config.js";
import type { ProposedAction, VerificationResult } from "./types.js";

/**
 * The one interface the rest of the app talks to. Swap the implementation
 * (REST now, real @navalabs/sdk later) without touching verify.ts or your
 * agent logic.
 */
export interface GuardianClient {
  /**
   * Submit the exact proposed action and wait for a terminal verdict
   * (approved/rejected) or until the timeout elapses.
   *
   * Implementations MUST return a "blocked-looking" result (status other
   * than APPROVED, canExecute: false) rather than throwing, for any
   * business-level rejection — reserve thrown errors for transport/auth
   * failures. verify.ts treats both cases as blocked either way, but this
   * keeps call sites simple.
   */
  requestVerification(action: ProposedAction): Promise<VerificationResult>;
}

/**
 * Advanced REST path. Use only if the SDK/MCP genuinely can't fit your
 * host environment — this is what the docs recommend, not the default.
 *
 * IMPORTANT: the endpoint path and body shape below are NOT confirmed
 * against Nava's actual API reference (that page's schema wasn't
 * retrievable through public search in this session). Treat this as a
 * wiring skeleton: the retry/timeout/fail-closed behavior is solid, but
 * update the URL, body, and response parsing to match the real
 * docs.navalabs.ai/guardian/developers/submit-an-action spec before you
 * rely on this against a live environment.
 */
export class RestGuardianClient implements GuardianClient {
  constructor(
    private readonly baseUrl = config.navaApiBaseUrl,
    private readonly apiKey = config.navaApiKey,
    private readonly timeoutMs = config.verdictTimeoutMs
  ) {}

  async requestVerification(action: ProposedAction): Promise<VerificationResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // TODO: confirm real endpoint path, e.g. POST /v1/guardian/verdicts
      const res = await fetch(`${this.baseUrl}/v1/guardian/verdicts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(action),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Fail closed: surface as blocked, never as an approved-by-default.
        return blockedResult(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as unknown;
      return parseAndValidateResult(json);
    } catch (err) {
      // Network error, timeout/abort, JSON parse failure — all blocked.
      return blockedResult(err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Stub for the real @navalabs/sdk path. Requires Developer Preview access
 * to the restricted @navalabs packages. Once you have access:
 *
 *   npm install @navalabs/sdk
 *
 * and replace this class body with the real
 * `requestVerification()` + `waitForVerification()` calls per
 * https://docs.navalabs.ai/sdk/typescript
 */
export class SdkGuardianClient implements GuardianClient {
  async requestVerification(_action: ProposedAction): Promise<VerificationResult> {
    throw new Error(
      "SdkGuardianClient is a stub. Install @navalabs/sdk (requires Developer " +
        "Preview access) and implement this against the real SDK before using " +
        "NAVA_CLIENT_MODE=sdk."
    );
  }
}

export function createGuardianClient(): GuardianClient {
  return config.clientMode === "sdk"
    ? new SdkGuardianClient()
    : new RestGuardianClient();
}

function blockedResult(reason: string): VerificationResult {
  return {
    status: "FAILED",
    canExecute: false,
    verdict: {
      outcome: "rejected",
      reasonCode: "transport_error",
      reason,
    },
  };
}

/**
 * Strict runtime validation of whatever the server returned. Guards against
 * a malformed/unexpected shape being treated as approved just because a
 * field happened to be truthy.
 */
function parseAndValidateResult(json: unknown): VerificationResult {
  if (
    typeof json !== "object" ||
    json === null ||
    !("status" in json) ||
    !("canExecute" in json) ||
    !("verdict" in json)
  ) {
    return blockedResult("malformed_response");
  }

  const obj = json as Record<string, unknown>;
  const verdict = obj.verdict as Record<string, unknown> | undefined;

  if (
    typeof obj.status !== "string" ||
    typeof obj.canExecute !== "boolean" ||
    typeof verdict !== "object" ||
    verdict === null ||
    typeof verdict.outcome !== "string" ||
    typeof verdict.reasonCode !== "string"
  ) {
    return blockedResult("malformed_verdict_shape");
  }

  return obj as unknown as VerificationResult;
}
