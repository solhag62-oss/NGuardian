import { config } from "../src/config.js";
import { createGuardianClient } from "../src/guardianClient.js";
import { verifyBeforeExecution } from "../src/verify.js";
import { buildUniswapSwapAction } from "../src/actions/uniswapSwap.js";

/**
 * Stand-in for your agent's actual venue submission. Guardian never does
 * this step — signing and submission stay entirely in your app, per the
 * documented ownership split.
 */
async function submitToUniswap(): Promise<void> {
  console.log("[venue] Submitting approved swap to Uniswap Universal Router...");
  // your wallet/signing/broadcast logic goes here — never inside the
  // Guardian client, never before an approved verdict.
}

async function main() {
  const client = createGuardianClient();

  const action = buildUniswapSwapAction({
    agentId: config.navaAgentId,
    chainId: 1,
    tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC (example)
    tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (example)
    amountIn: "100000000", // 100 USDC (6 decimals)
    minAmountOut: "0", // TODO: compute from a real quote + slippage tolerance
    maxSlippageBps: 200, // 2%
    recipient: "0x0000000000000000000000000000000000dEaD", // TODO: real wallet
    routerAddress: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Universal Router (mainnet)
    encodedCalldata: "0x", // TODO: real ABI-encoded Universal Router calldata
    description: "Swap 100 USDC for ETH, max 2% slippage",
  });

  console.log("[guardian] Requesting verdict for proposed action...");
  const gate = await verifyBeforeExecution(client, action);

  if (!gate.allowed) {
    console.error(`[guardian] BLOCKED: ${gate.reason}`);
    if (gate.verdict) {
      console.error(`[guardian] verdict detail:`, gate.verdict.verdict);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `[guardian] APPROVED (verdictId=${gate.verdict.verdict.verdictId ?? "n/a"})`
  );
  await submitToUniswap();
}

main().catch((err) => {
  // Any unexpected error is a blocked path too — never fall through to
  // execution on an exception.
  console.error("[fatal] unhandled error, action was NOT submitted:", err);
  process.exitCode = 1;
});
