Good. Now I have a clear picture of everything. Here is the full implementation plan.

---

## Implementation Plan: FarmCoop — Decentralized Farm Cooperative

### Summary
A two-contract onchain system for Arc Testnet (redeploy to mainnet yourself once verified) that lets a farm cooperative manage produce orders with escrow payouts, a share-based investment pool, business listing funding with milestone escrow, and governance voting — all in USDC. A React frontend covers coordinator, member, buyer, and business roles.

---

### Architecture

**Blockchain:** Arc Testnet (chain ID 5042002). USDC is the only token, at `0x3600000000000000000000000000000000000000`. You answered "testnet first" — you redeploy to mainnet yourself once it is verified. Arc is EVM-compatible; USDC is the native gas asset.

**Contract 1 — `FarmCoop.sol`**
Covers members, produce orders (escrow + patronage payout), investment pool (NAV shares), and venture/governance proposals that wrap the Business Listing logic. Single contract to keep cross-feature accounting (pool value, share price) consistent.
Key functions: `addMember`, `createOrder`, `fundOrder`, `recordDelivery`, `confirmDelivery`, `claimPayout`, `depositPool`, `redeemShares`, `createListing`, `voteListing`, `approveMilestone`, `rejectMilestone`, `reclaimFunds`, `repay`.

**Contract 2 — `FarmCoopVerifier.sol`**
Thin permissioned contract. Holds the verifier address set (set at deploy). Exposes `verify(listingId)` and `isVerified(listingId)`. FarmCoop reads this; it is separately upgradeable without touching main accounting logic.

**Governance parameters (defaults from your answers):**
- Quorum: 20% of total shares
- Voting window: 3 days
- Timelock: 24 hours
- Vote weight cap: 15% of total shares per voter
- Max venture/listing exposure: 30% of pool value
- Split: 5% reserve / 10% pool / 85% patronage (set at deploy, immutable)

**Frontend:** Vite + React + TypeScript, wagmi + ConnectKit, Tailwind CSS.
Four role views: Coordinator, Member, Buyer, Business/Funder.
Pages: Orders, My Balance (claim), Pool, Marketplace, Business Dashboard.

**Wallet:** ConnectKit (standard).

---

### Files to Create / Modify

**Contracts**
1. `contracts/FarmCoop.sol` — Main contract: members, orders escrow, investment pool NAV, venture/listing governance, milestone escrow, repayment distribution. ReentrancyGuard on all USDC transfers.
2. `contracts/FarmCoopVerifier.sol` — Verifier role registry. Coordinator + verifier set mark listings as verified.
3. `contracts/test/FarmCoop.t.sol` — Foundry unit tests: payout math, rounding dust, split sums, double-spend prevention, voting cap, quorum, timelock, share price after profit/loss, redemption limits, milestone approval/rejection, reclaim, repayment pro-rata.
4. `contracts/test/FarmCoopVerifier.t.sol` — Tests for verifier access control.

**Config / wiring**
5. `src/config.ts` — Extend with contract addresses and ABI references (post-deploy).
6. `src/onchain-facts.ts` — Already exists; used for USDC address and chain config (no hardcoding).
7. `src/wagmi.ts` — wagmi config wired to Arc Testnet via `arcTestnet` from viem.

**Components**
8. `src/components/WalletBar.tsx` — ConnectKit button, shows address and USDC balance.
9. `src/components/RoleGate.tsx` — Detects connected address role (coordinator, member, buyer, business) from contract reads; gates views.
10. `src/components/TxLink.tsx` — Reusable component: shows contract address + `explorer.arc.io` link for every transaction hash.

**Pages**
11. `src/pages/OrdersPage.tsx` — Coordinator creates orders; buyer funds and confirms delivery; coordinator records quantities; members see payout status.
12. `src/pages/BalancePage.tsx` — Members see claimable USDC balance and click to withdraw. "Cash Out" button links to placeholder off-ramp URL.
13. `src/pages/PoolPage.tsx` — Deposit USDC → mint shares; redeem shares; shows current price per share, idle USDC, total pool value.
14. `src/pages/MarketplacePage.tsx` — Verified listings with funding target, funded amount, terms, milestone list, status (active/funded/completed/defaulted), verified badge.
15. `src/pages/BusinessDashboard.tsx` — Create listing, submit milestone proof (text + link/hash), repay principal + profit share.
16. `src/pages/FunderView.tsx` — Vote to fund listing, track milestones, vote to approve/reject milestone, claim repayment.
17. `src/App.tsx` — Route switching, role-aware navigation, Web3Provider wrapper.

---

### Build Sequence

1. **Write contracts** — `FarmCoop.sol` and `FarmCoopVerifier.sol`. Implement all features with ReentrancyGuard, CEI ordering, SafeERC20, pull-over-push payouts, and the fixed split percentages.
2. **Security review** — Balanced review of both contracts (critical + high findings fixed automatically). Covers reentrancy, access control, integer math, approval handling, DoS, timestamp dependence, and centralization risk.
3. **Slither static analysis** — Run against both contracts; fix or surface actionable findings.
4. **Unit tests** — Foundry `.t.sol` covering every item in your testing list: payout math + rounding, split sum correctness, double-spend prevention on claims, 15% voting cap, 20% quorum, 24h timelock, share price after profit and loss, redemption limit (idle only), milestone approval/rejection, pro-rata reclaim, repayment distribution.
5. **Deploy to Arc Testnet** — Deploy `FarmCoopVerifier` first (coordinator address + verifier set), then `FarmCoop` (constructor receives verifier contract address, coordinator address, USDC address, and split/governance params). Arc Testnet, Mode 1 (platform deployer).
6. **Wire frontend** — Build all pages and components. Read contract addresses from `src/config.ts`; read chain/USDC facts from `@/onchain-facts`. Every transaction shows a `TxLink` with explorer URL. Role detection drives which views render.
7. **Smoke test offer** — After deploy, offer to run a post-deploy integration test that walks through one full order (create → fund → record quantities → confirm → claim) with small USDC amounts.

---

### Done When

- [ ] `FarmCoop.sol` and `FarmCoopVerifier.sol` compile cleanly on Arc EVM (Paris target, solc 0.8.x).
- [ ] All Foundry unit tests pass: payout math, rounding, split sums, double-spend, voting cap, quorum, timelock, share price, redemption limits, milestone flows, repayment.
- [ ] Security review finds no unresolved Critical or High issues.
- [ ] Both contracts deployed to Arc Testnet with on-chain addresses recorded in `contracts/contract-metadata/`.
- [ ] Frontend loads, detects wallet role (coordinator / member / buyer / business), and routes to the correct views.
- [ ] Every transaction surface shows contract address + Arc explorer link.
- [ ] Pool page shows live price per share, idle USDC, deposit and redeem flows work.
- [ ] Marketplace lists verified listings with milestone status; business dashboard creates/submits proofs; funder view votes and claims.
- [ ] "Cash Out" button present on Balance page (placeholder off-ramp link).
- [ ] No hardcoded chain IDs, USDC addresses, or RPC URLs — all read from `@/onchain-facts`.

---

One note before building: your spec includes two separate "section 4" headings (Venture Proposals and Business Listings). The plan above replaces the standalone venture-proposal mechanism with the Business Listings system, which is richer and covers the same governance need. The investment pool's share price still updates on listing profit/loss. If you want both systems running in parallel (venture proposals AND business listings as separate governance tracks), say so and the contract scope expands.

## Ready to build?

Approve this plan to start, or let me know if anything needs adjusting — split percentages, governance parameters, the coordinator address you want to use at deploy time, or whether you want the optional order-to-repayment routing included. The plan is saved to `arc-studio-plans/PLAN.md`.

A few things to confirm before you approve and build:

**Coordinator address** — at deploy time the contract will accept a `coordinator` address as a constructor argument. This should be your multisig or the address you'll use to call admin functions. If you want the deployer wallet to also be the coordinator, that is fine — just confirm and the deploy script will use it.

**Venture Proposals vs. Business Listings** — the plan above replaces the standalone venture-proposal track with the Business Listings system (it covers the same use case: pool funds an external manager, profit/loss updates share price). If you want both as separate on-chain governance tracks, say so before building starts.

**Optional order-to-repayment routing** — your spec flagged this as optional: a business can route its produce order payments so a fixed percentage goes to loan repayment automatically. This is deferred for now. Say "include it" if you want it in scope.

Everything else follows your answers: testnet first, separate contracts, 20% quorum / 3-day window / 24h timelock, coordinator supplied at deploy.

**Approve this plan to begin building, or reply with any changes.**
