/**
 * Types mirror the approval envelope documented at:
 * https://docs.navalabs.ai/guardian/developers/overview#continue-only-after-approval
 *
 * DO NOT loosen these types to "any" or optional-everything just to make
 * a build pass — the whole point of this scaffold is that a malformed or
 * unexpected verdict shape fails the type check, and fails closed at
 * runtime too (see verify.ts).
 */

export type VerdictOutcome = "approved" | "rejected" | "pending";
export type ReasonCode = "allowed" | string; // "allowed" is the only pass value

export interface Verdict {
  outcome: VerdictOutcome;
  reasonCode: ReasonCode;
  /** Human/audit-facing explanation. Never used for authorization logic. */
  reason?: string;
  /** Evidence supporting the decision (policy checks that ran, results). */
  evidence?: Record<string, unknown>;
  /** Guardian's policy/verdict schema version. */
  version?: string;
  /** Guardian's internal verdict/request id, for audit correlation. */
  verdictId?: string;
}

/**
 * The overall status of a verification request as tracked by the SDK path.
 * EXECUTED / REJECTED / FAILED are terminal states that must NOT be treated
 * as authorizing execution, even if an earlier poll showed an approved verdict.
 */
export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTED"
  | "FAILED";

export interface VerificationResult {
  status: RequestStatus;
  canExecute: boolean;
  verdict: Verdict;
  /** Present on the MCP await-verification path; required there. */
  success?: boolean;
  requestId?: string;
}

/**
 * A "proposed action" is the exact, venue-native action the agent intends
 * to execute — not a natural-language description of intent. The
 * human-readable `description` field is for audit records only; Guardian
 * does not use it for policy reasoning.
 *
 * NOTE: the precise field names Guardian's API expects for a Uniswap
 * action are NOT confirmed from public docs in this session. This shape
 * is a reasonable placeholder based on what the docs say Guardian checks
 * (venue, asset, recipient) — confirm against the real schema at
 * docs.navalabs.ai/guardian/developers/policy-model and
 * docs.navalabs.ai/guardian/developers/supported-actions before relying
 * on it in production.
 */
export interface ProposedAction {
  agentId: string;
  venue: string; // e.g. "uniswap"
  chainId: number;
  /** Venue-native encoded call data for the exact action. */
  calldata: {
    to: string; // router contract address (e.g. Universal Router)
    data: string; // ABI-encoded calldata
    value: string; // wei, as string
  };
  /** Structured fields Guardian's deterministic checks evaluate. */
  checkFields: {
    asset: {
      tokenIn: string; // contract address
      tokenOut: string; // contract address
    };
    recipient: string;
    amountIn: string; // smallest unit, as string
    minAmountOut: string; // smallest unit, as string
    maxSlippageBps: number; // basis points
    deadline: number; // unix timestamp
  };
  /** Audit-only. Never used for policy authorization. */
  description?: string;
}
