# Implementation Plan: FarmCoop — Decentralized Farm Cooperative

## Summary
A two-contract onchain system for Arc Testnet (redeploy to mainnet yourself once verified) that lets a farm cooperative manage produce orders with escrow payouts, a share-based investment pool, business listing funding with milestone escrow, and governance voting — all in USDC. A React frontend covers coordinator, member, buyer, and business roles.

---

## Architecture

**Blockchain:** Arc Testnet (chain ID 5042002). USDC is the only token, at `0x3600000000000000000000000000000000000000`. You answered "testnet first" — you redeploy to mainnet yourself once it is verified. Arc is EVM-compatible; USDC is the native gas asset.

**Contract 1 — `FarmCoop.sol`**
Covers members, produce orders (escrow + patronage payout), investment pool (NAV shares), and the Business Listing / milestone escrow / governance system.
Key functions: `addMember`, `createOrder`, `fundOrder`, `recordDelivery`, `confirmDelivery`, `claimPayout`, `depositPool`, `redeemShares`, `createListing`, `voteListing`, `approveMilestone`, `rejectMilestone`, `reclaimFunds`, `repay`.

**Contract 2 — `FarmCoopVerifier.sol`**
Thin permissioned contract. Holds the verifier address set (set at deploy). Exposes `verify(listingId)` and `isVerified(listingId)`. FarmCoop reads this; it is separately upgradeable without touching main accounting logic.

**Governance parameters:**
- Quorum: 20% of total shares
- Voting window: 3 days
- Timelock: 24 hours
- Vote weight cap: 15% of total shares per voter
- Max venture/listing exposure: 30% of pool value
- Split: 5% reserve / 10% pool / 85% patronage (set at deploy, immutable)

**Frontend:** Vite + React + TypeScript, wagmi + ConnectKit, Tailwind CSS.
Four role views: Coordinator, Member, Buyer, Business/Funder.
Pages: Orders, My Balance (claim), Pool, Marketplace, Business Dashboard, Funder View.

**Wallet:** ConnectKit.

---

## Files to Create / Modify

### Contracts
1. `contracts/FarmCoop.sol` — Main contract: members, orders escrow, investment pool NAV, listing governance, milestone escrow, repayment distribution. ReentrancyGuard on all USDC transfers.
2. `contracts/FarmCoopVerifier.sol` — Verifier role registry. Coordinator + verifier set mark listings as verified.
3. `contracts/test/FarmCoop.t.sol` — Foundry unit tests covering every item in the testing requirements.
4. `contracts/test/FarmCoopVerifier.t.sol` — Tests for verifier access control.

### Config / wiring
5. `src/config.ts` — Extend with contract addresses and ABI references (post-deploy).
6. `src/wagmi.ts` — wagmi config wired to Arc Testnet via `arcTestnet` from viem.

### Components
7. `src/components/WalletBar.tsx` — ConnectKit button, shows address and USDC balance.
8. `src/components/RoleGate.tsx` — Detects connected address role from contract reads; gates views.
9. `src/components/TxLink.tsx` — Shows contract address + explorer.arc.io link for every transaction.

### Pages
10. `src/pages/OrdersPage.tsx` — Coordinator creates orders; buyer funds and confirms delivery; coordinator records quantities.
11. `src/pages/BalancePage.tsx` — Members see claimable USDC balance and withdraw. "Cash Out" button links to placeholder off-ramp.
12. `src/pages/PoolPage.tsx` — Deposit USDC → mint shares; redeem shares; shows price per share, idle USDC, total pool value.
13. `src/pages/MarketplacePage.tsx` — Verified listings with target, funded amount, terms, milestones, status, verified badge.
14. `src/pages/BusinessDashboard.tsx` — Create listing, submit milestone proof, repay.
15. `src/pages/FunderView.tsx` — Vote to fund, track milestones, vote approve/reject milestone, claim repayment.
16. `src/App.tsx` — Route switching, role-aware navigation, Web3Provider wrapper.

---

## Build Sequence

1. **Write contracts** — `FarmCoop.sol` and `FarmCoopVerifier.sol`. ReentrancyGuard, CEI ordering, SafeERC20, pull-over-push, fixed split.
2. **Security review** — Balanced review (critical + high auto-fixed). Covers reentrancy, access control, integer math, approvals, DoS, timestamp dependence, centralization.
3. **Slither static analysis** — Both contracts; fix actionable findings.
4. **Unit tests** — Foundry `.t.sol`: payout math, rounding dust, split sum correctness, double-spend prevention, 15% voting cap, 20% quorum, 24h timelock, share price after profit/loss, redemption limit, milestone approve/reject, reclaim, repayment pro-rata.
5. **Deploy to Arc Testnet** — `FarmCoopVerifier` first (coordinator + verifier set), then `FarmCoop` (receives verifier address, coordinator, USDC, split/governance params). Mode 1 platform deployer.
6. **Wire frontend** — All pages and components. Addresses from `src/config.ts`; chain/USDC facts from `@/onchain-facts`. TxLink on every transaction. Role detection drives views.
7. **Smoke test offer** — Offer post-deploy integration test: one full order (create → fund → record → confirm → claim) with small USDC amounts.

---

## Done When

- [ ] Both contracts compile cleanly (Paris EVM, solc 0.8.x).
- [ ] All Foundry unit tests pass: payout math, rounding, split sums, double-spend, voting cap, quorum, timelock, share price, redemption limits, milestone flows, repayment.
- [ ] Security review: no unresolved Critical or High issues.
- [ ] Both contracts deployed to Arc Testnet; addresses in `contracts/contract-metadata/`.
- [ ] Frontend loads, detects wallet role, routes to correct views.
- [ ] Every transaction surface shows contract address + Arc explorer link.
- [ ] Pool page: live price per share, deposit and redeem work.
- [ ] Marketplace lists verified listings with milestone status.
- [ ] Business dashboard: create listing, submit proof, repay.
- [ ] Funder view: vote, track milestones, claim repayment.
- [ ] "Cash Out" button on Balance page (placeholder off-ramp link).
- [ ] No hardcoded chain IDs, USDC addresses, or RPC URLs — all read from `@/onchain-facts`.

---

## Notes

- "Section 4 — Venture Proposals" is replaced by the Business Listings system, which covers the same governance need (pool funds an external manager, profit/loss updates share price). If you want both running as separate tracks, the contract scope expands.
- Coordinator address is supplied at deploy time (not the deployer wallet).
- Optional order-to-repayment routing (auto-deduct repayment from order payout) is deferred unless time permits.
- Arc mainnet redeploy: you do this yourself from your own wallet once testnet is verified. Mainnet moves real USDC.
