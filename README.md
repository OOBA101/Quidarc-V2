# Quidarc

**The intelligent gateway to the Arc ecosystem.**

A chat-first, AI-native wallet and ecosystem companion for [Arc](https://www.arc.network) (Circle's USDC-native L1). Built for the [Programmable Money Hackathon](https://www.encodeclub.com/programmes/arc-hackathon) (Encode Club × Arc House), Agentic Track.

Instead of navigating Send/Receive/Swap screens, you tell the agent what you want — "swap 500 USDC into BTC," "what's new on Arc," "find the best lending protocol" — and it handles the rest, inside explicit, revocable permission boundaries you control.

## Planning Docs

Read in this order before touching code:

1. [`docs/quidarc-vision.md`](docs/quidarc-vision.md) — product vision, the six ecosystem modules, why this exists
2. [`docs/quidarc-build-plan.md`](docs/quidarc-build-plan.md) — Phase 1 MVP scope, requirements, and the current sprint plan
3. [`docs/quidarc-agent-governance.md`](docs/quidarc-agent-governance.md) — the agent wallet custody model and Permission Card system. **Read this before working on anything touching money movement.**
4. [`docs/quidarc-software-architecture.md`](docs/quidarc-software-architecture.md) — module breakdown, tech stack, ADRs

## Hackathon Deadlines

- **Final submission checkpoint:** Sunday, August 9, 2026
- **Demo Day:** Thursday, August 20, 2026

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite, ethers.js / viem |
| Backend | Node.js + TypeScript (Fastify) |
| Database | Postgres |
| Chain | Arc Testnet (Chain ID 5042002) |
| Swap/Transfer | Circle App Kit |
| Agent Wallet | Circle Developer-Controlled Wallets |
| LLM | Anthropic Claude API |

Full rationale for each choice is in the architecture doc.

## Team

3 contributors, 3 tracks (see the build plan for the current split):

- **Track A — Wallet & Chain Integration**
- **Track B — Backend & Agent Orchestration**
- **Track C — Frontend & Content**

## Getting Started

Setup instructions will be filled in once the initial scaffold is committed (Sprint 1). Contribution workflow is in [`CONTRIBUTING.md`](CONTRIBUTING.md).
