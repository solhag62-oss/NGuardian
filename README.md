# nava-guardian-starter

A starter scaffold for integrating **Nava Guardian** (Developer Preview) to gate
a Uniswap swap action before your agent executes it.

Nava Guardian is a policy verdict engine, not an executor. Your app builds the
exact action, asks Guardian for a verdict, and only submits to the venue after
an `approved` verdict. Guardian never signs or holds keys.
Source: https://docs.navalabs.ai/guardian/developers/overview

## What's confirmed vs. what's inferred

This scaffold is built from what the public docs state explicitly (fetched
2026-09-01):

**Confirmed from docs (`guardian/developers/overview`):**
- Two supported integration paths: Nava MCP server (agent tool use) or
  `@navalabs/sdk` (application code), both requiring access to restricted
  `@navalabs` packages.
- The exact approval envelope your integration must check before continuing:
  - SDK: `status === "APPROVED"`, `canExecute === true`,
    `verdict.outcome === "approved"`, `verdict.reasonCode === "allowed"`
  - MCP `await-verification`: same four fields **plus** `success === true`
  - Anything else (`pending`, missing, malformed, `EXECUTED`, `REJECTED`,
    `FAILED`, timeout) must be treated as blocked.
- Auth: agent API key with least-privilege `verdicts:create:own` scope,
  supplied via secret store/env — never in prompts, source, logs, or query
  strings.
- An advanced raw-REST path exists but is meant only for when the SDK/MCP
  can't fit your host environment.
- Developer Preview currently decodes Uniswap and Hyperliquid actions only.

**NOT confirmed (inferred/placeholder — verify against your Nava Developer
Preview access before relying on it):**
- The exact REST endpoint paths, request body shape, and headers for
  "submit an action" / "handle verdicts". The docs page describing this
  (`guardian/developers/submit-an-action`) exists but its detailed schema
  wasn't retrievable through public search/fetch in this session.
- The exact shape of a "proposed action" object for a Uniswap swap (which
  fields Guardian expects — venue identifiers, token addresses, slippage
  units, etc.).

**Action item:** once you have Developer Preview access, pull the real
`@navalabs/sdk` and the actual REST reference
(`docs.navalabs.ai/guardian/developers/submit-an-action`,
`docs.navalabs.ai/api-reference/guardian`) and swap `src/guardianClient.ts`'s
`RestGuardianClient` implementation for either:
1. the real SDK client (`SdkGuardianClient`, stub included), or
2. corrected REST field names.

Nothing else in this scaffold should need to change — the rest of the app
only talks to the `GuardianClient` interface.

## Structure

```
src/
  config.ts            # env/config loading
  types.ts             # Verdict + action types (matches documented envelope)
  guardianClient.ts     # GuardianClient interface + REST stub + SDK stub
  actions/uniswapSwap.ts  # builds a structured "proposed action" for a swap
  verify.ts             # orchestrator: build -> request -> wait -> gate
  index.ts              # example agent flow
examples/
  run-swap-example.ts   # runnable demo
```

## Setup

```bash
npm install
cp .env.example .env
# fill in NAVA_API_KEY, NAVA_AGENT_ID from your Developer Preview dashboard
npm run example
```

## Safety rules this scaffold enforces

- Never authorizes execution from `verdict.outcome` alone — checks the full
  envelope.
- Treats every non-approved state (including transport failure and timeout)
  as **blocked**, fail-closed.
- Keeps signing/wallet logic completely out of the Guardian client — that's
  explicitly your app's job per the docs' ownership split.
- Never logs the API key.
- Requests a fresh verdict if the action changes in any way (new verdict per
  exact action, not per "intent").
