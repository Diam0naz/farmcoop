# FarmCoop — Decentralized Farm Cooperative

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

## Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
|---|---|---|
| FarmCoop | `0xada6a79971025aa1d58884ad8620e34f7254d14d` | https://explorer.testnet.arc.io/address/0xada6a79971025aa1d58884ad8620e34f7254d14d |
| FarmCoopVerifier | `0x44f1e084b291e7a6ee9950c178047538d330df96` | https://explorer.testnet.arc.io/address/0x44f1e084b291e7a6ee9950c178047538d330df96 |

Coordinator / deployer wallet: `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`
Network: Arc Testnet (Chain ID: 5042002)
USDC: `0x3600000000000000000000000000000000000000` (6 decimals)

## Constructor Parameters (FarmCoop)
- reserveBps: 500 (5%)
- poolBps: 1000 (10%)
- quorumBps: 2000 (20%)
- votingWindow: 259200 (3 days)
- timelockDelay: 86400 (24h)
- maxExposureBps: 3000 (30%)
- voteCapBps: 1500 (15%)

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
