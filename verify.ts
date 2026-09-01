import type { GuardianClient } from "./guardianClient.js";
import type { ProposedAction, VerificationResult } from "./types.js";

export type Gate =
  | { allowed: true; verdict: VerificationResult }
  | { allowed: false; reason: string; verdict?: VerificationResult };

/**
 * The single choke point every execution path must go through.
 *
 * Mirrors the exact rule from the docs
 * (guardian/developers/overview#continue-only-after-approval):
 *
 *   status === "APPROVED" AND canExecute === true AND
 *   verdict.outcome === "approved" AND verdict.reasonCode === "allowed"
 *
 * Anything else — pending, missing, malformed, rejected, timed out,
 * EXECUTED/REJECTED/FAILED from a stale poll — is blocked. No partial
 * credit, no "well 3 of 4 fields matched."
 */
export async function verifyBeforeExecution(
  client: GuardianClient,
  action: ProposedAction
): Promise<Gate> {
  let result: VerificationResult;

  try {
    result = await client.requestVerification(action);
  } catch (err) {
    return {
      allowed: false,
      reason: `verification_request_failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const approved =
    result.status === "APPROVED" &&
    result.canExecute === true &&
    result.verdict.outcome === "approved" &&
    result.verdict.reasonCode === "allowed";

  if (!approved) {
    return {
      allowed: false,
      reason: `not_approved: status=${result.status} outcome=${result.verdict.outcome} reasonCode=${result.verdict.reasonCode}`,
      verdict: result,
    };
  }

  return { allowed: true, verdict: result };
}
