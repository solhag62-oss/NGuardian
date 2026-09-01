import type { ProposedAction } from "../types.js";

export interface SwapIntent {
  agentId: string;
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string; // smallest unit, as string (e.g. wei for 18-decimals)
  minAmountOut: string; // smallest unit, as string
  maxSlippageBps: number;
  recipient: string;
  routerAddress: string; // Universal Router address for the target chain
  /** Pre-built ABI-encoded calldata for the swap. Building this from the
   *  intent (command encoding, Permit2 signature, etc.) is your app's job —
   *  Guardian evaluates the exact call, so this must be the real calldata
   *  the agent intends to submit, not a placeholder. */
  encodedCalldata: string;
  value?: string;
  deadlineSecondsFromNow?: number;
  description?: string;
}

/**
 * Builds the structured ProposedAction Guardian would evaluate for a
 * Uniswap Universal Router swap. Field names for `checkFields` follow the
 * three checks the docs explicitly name for Guardian's current coverage:
 * venue, asset, recipient (docs.navalabs.ai/guardian/policy-checks).
 * Confirm exact expected field names against the real policy-model docs
 * before submitting against a live Guardian instance.
 */
export function buildUniswapSwapAction(intent: SwapIntent): ProposedAction {
  const deadline =
    Math.floor(Date.now() / 1000) + (intent.deadlineSecondsFromNow ?? 300);

  return {
    agentId: intent.agentId,
    venue: "uniswap",
    chainId: intent.chainId,
    calldata: {
      to: intent.routerAddress,
      data: intent.encodedCalldata,
      value: intent.value ?? "0",
    },
    checkFields: {
      asset: {
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
      },
      recipient: intent.recipient,
      amountIn: intent.amountIn,
      minAmountOut: intent.minAmountOut,
      maxSlippageBps: intent.maxSlippageBps,
      deadline,
    },
    description: intent.description,
  };
}
