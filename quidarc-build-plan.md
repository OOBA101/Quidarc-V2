# Quidarc — Phased Build Plan

**Companion to:** `quidarc-vision.md`
**How to read this:** Phase 1 (hackathon MVP) is specified to implementation-ready detail — features, requirements, user journeys, business rules, data model, and handoff briefs for the next EOS skills. Phase 2 and Phase 3 stay directional; they get their own full requirements pass when they actually start.

---

## Timeline Anchor

- **Programmable Money Hackathon** (Encode Club × Arc House): started July 13, 2026
- **Final submission checkpoint:** Sunday, August 9, 2026
- **Demo Day:** Thursday, August 20, 2026
- That's **3 weeks from today (July 20)** to the real deadline. Treat Aug 9 as the hard line; Aug 20 is presentation day.

## Circle/Arc Platform Facts (verified against current docs — this section replaces earlier partial research)

**Core chain**
- Arc is EVM-compatible — Hardhat, Foundry, Viem, and Ethers all work as-is. The existing CyberSwitch codebase's ethers.js/viem stack carries over directly.
- USDC is the native gas token (not a separate gas asset).
- Sub-second, deterministic finality — good for chat UX; confirmations won't feel laggy.
- Opt-in privacy (confidential balances/transactions) and a post-quantum security roadmap are both listed as in-progress, not fully live — don't build Phase 1 around either.
- **Mainnet:** third-party coverage still points to summer 2026; Circle hasn't published an exact date. Build against testnet; don't hard-commit demo-day claims to a specific mainnet date.

**The full developer stack** (per Circle's own framing: *"Wallets for UX, Contracts for execution, Gateway for balance abstraction, CCTP for cross-chain movement, and Arc for coordination"*)

| Product | What it actually is | Relevance to Quidarc |
|---|---|---|
| **App Kit** | Wraps CCTP; ships Bridge, Swap, Send, Unified Balance as ready UI/SDK flows | Fastest path to FR-03/FR-04 (swap/transfer through chat) — confirmed, still the right pick |
| **Agent Stack** | Circle's dedicated suite for AI agents: agent wallets, a CLI, an agent marketplace, and a Nanopayments protocol. Launched publicly this spring alongside Arc's token sale — this is genuinely new. | **This is the intended toolkit for Quidarc's whole premise.** The "agent wallets" primitive is the direct implementation path for the Agent Wallet concept. The agent marketplace component is conceptually identical to Quidarc's own Phase 3 "community agent marketplace" idea. |
| **Circle Wallets** | Three distinct types: **Developer-Controlled** (custodial, backend holds keys — built for automation/treasury/payouts), **User-Controlled** (embedded wallets, Web2 login via Google/Apple/email OTP/PIN, still non-custodial to Circle), **Modular** (smart contract wallets, passkeys, gasless txns, ERC-4337) | Developer-Controlled is the natural fit for the Agent Wallet (see governance doc). User-Controlled is a real alternative to CyberSwitch's existing seed-phrase flow for the *user's* wallet — flagged as an open decision below. |
| **Contracts** | Curated smart contract template library, deployable on Arc testnet | Relevant if Quidarc ever needs custom on-chain logic (e.g., a Permission Card enforced on-chain rather than in the backend) — a Phase 2 consideration, not Phase 1. |
| **CCTP (V2)** | Native cross-chain USDC burn-and-mint. Always use V2 — V1 is legacy except where a specific chain requires it. | Underlies App Kit's Bridge flow — don't integrate directly unless doing custom cross-chain logic App Kit doesn't cover. |
| **Gateway** | Unified USDC balance across chains, sub-500ms transfers, non-custodial (user-signed, trustless withdrawal even if Circle's API is down) | Strong fit for Phase 2 portfolio/unified-balance features. Distinct from CCTP: Gateway = balance unification + instant liquidity access; CCTP = the underlying cross-chain transfer mechanism. |
| **Gateway Nanopayments** | Gasless USDC micropayments down to $0.000001, via the x402 protocol, batched settlement | Built for pay-per-request APIs and agent-to-agent/agent-to-service payments — directly relevant once Quidarc's agent needs to "hire" other services (Phase 2/3 territory, not Phase 1). |
| **Paymaster** | Lets a wallet pay gas in USDC instead of a chain's native token | Less critical on Arc specifically since gas is already USDC-native — more relevant if Quidarc ever supports other chains. |
| **Gas Station** | Sponsors gas entirely for Circle Wallet transactions (different from Paymaster — this is "someone else pays," not "pay in a different asset") | Worth knowing, not a Phase 1 priority. |
| **StableFX** | Institutional-grade FX engine for stablecoin currency pairs — **permissioned**, requires KYB/AML approval, aimed at PSPs, fintechs, OTC desks, prime brokers | **Not relevant to Phase 1.** This serves institutional accounts, not individual consumer wallets. Only becomes relevant if Quidarc pursues an enterprise/institutional tier in Phase 3. |
| **Circle Skills** | Circle's own open-source repo of AI-assisted development patterns (Apache 2.0, on GitHub) — covers CCTP/Bridge Kit, wallet-type selection, Gateway, Smart Contract Platform. Explicitly splits "durable guidance" (the skill) from "live product data" (Circle's own MCP server). | Worth pulling into the build process directly — this is the same skills-based pattern the EOS itself uses, and Circle's MCP server is a candidate live data source for Quidarc's own agent tool-calling layer. |
- Confirmed DEX/lending participants already deployed on Arc testnet (relevant if a non-App-Kit swap route is ever needed): Uniswap Labs, Curve, Aerodrome/Velodrome (Dromos Labs), Euler Finance, Fluid.



## Phase 1 — Hackathon MVP (target: Aug 9)

### Feature Inventory (MoSCoW)

**Must Have**
- Web app wallet: create/import (client-side, non-custodial)
- Chat interface — single conversational thread, agent responds and confirms before acting
- Intent parsing for swap / transfer / balance queries
- Execute swaps through chat (one integration path — App Kit or a single DEX — not multi-route aggregation)
- Execute transfers through chat
- Agent permission system: create / view / **instantly revoke** a Permission Card (spend cap, protocol allowlist, expiry)
- Arc news feed (curated is fine — doesn't need to be a live pipeline)
- Curated dApp explorer (static list is fine for MVP)

**Should Have**
- Pre-sign transaction explanation ("here's exactly what this swap will do") before every execution
- Basic portfolio view (balances by asset)

**Could Have**
- Bridge execution through chat (App Kit gives you this close to free if swap/send are already wired up)
- Claim-rewards through chat

**Won't Have (this phase)**
- Fully autonomous scheduled tasks (recurring buys, price-triggered actions) — Phase 2
- Multiple agents, agent marketplace — Phase 3
- Multisig / social recovery — later

### Functional Requirements (Phase 1)

Numbered so downstream EOS skills (architecture, backend) can reference them directly.

**FR-01 — Wallet Creation**
Trigger: user selects "Create Wallet." Inputs: a password. Behavior: generate a keypair client-side, encrypt the private key with a password-derived key, store the encrypted blob. Output: address displayed, encrypted key persisted locally. Failure: weak passwords rejected before generation.

**FR-02 — Wallet Import**
Trigger: user selects "Import Wallet." Inputs: seed phrase or private key + new password. Behavior: validate format, derive address, encrypt and store. Failure: invalid input → explicit error, no partial state saved.

**FR-03 — Chat-Initiated Swap**
Trigger: natural-language swap request. Inputs: parsed `{fromToken, toToken, amount}`. Behavior: resolve a route (App Kit / integrated DEX), return a structured confirmation — amount out, fee, slippage — before executing. Output: transaction submitted only after explicit confirmation, unless covered by an active Permission Card that already authorizes it. Failure: insufficient balance or no route found → a clear chat response, never a silent failure.

**FR-04 — Chat-Initiated Transfer**
Same confirmation pattern as FR-03, for direct sends: resolve recipient and amount, confirm, execute.

**FR-05 — Agent Permission Card (create)**
Trigger: user opts to delegate to the agent. Inputs: allowed actions (swap/bridge/LP/claim), daily spend limit, protocol allowlist, expiry date. Behavior: stored as a scoped, revocable delegation record; the agent checks this record before auto-executing anything without per-action confirmation. Output: a visible, editable Permission Card in the UI.

**FR-06 — Agent Permission Card (revoke)**
Trigger: user taps "Revoke," any time. Behavior: immediate — in-flight or future agent actions under that card are blocked instantly. This is a Must Have from day one; delegation without instant revocation isn't shippable.

**FR-07 — Arc News Feed**
Behavior: display curated/aggregated Arc ecosystem updates. Source list is still open — see Unknowns below.

**FR-08 — dApp Explorer**
Behavior: display a curated, categorized list of Arc dApps; "open via chat" routes to the app or surfaces a summary.

### Non-Functional Requirements (Phase 1)

- **Security (the one that matters most):** private keys never leave the client unencrypted; encrypted key material is never transmitted to any backend.
- **Security:** Permission Card enforcement is fail-closed — if the backend/agent can't verify a card's current status, it refuses to act rather than defaulting to allow.
- **Auditability:** every agent-executed action is logged against the specific Permission Card it acted under, and that log is visible to the user.
- **Performance:** balance/portfolio chat queries respond in under 2s; swap quotes under 3s.
- **Reliability:** if the swap-execution integration is down, the agent says so plainly — it never hangs or fabricates a result.
- **Compatibility:** runs on Arc Testnet now with a clean path to Mainnet — chain ID and RPC endpoint configurable, never hardcoded.

### Key User Journeys (Phase 1)

1. **First wallet → first chat action.** New user creates a wallet → lands in chat → asks for a balance → agent responds → asks to swap → agent quotes → user confirms → transaction executes → agent confirms on-chain.
2. **Delegating to the agent.** User says "let the agent handle small swaps for me" → agent explains what a Permission Card is → user sets limits (protocol, cap, expiry) → card created → future in-scope requests execute without per-action confirmation → user can view/revoke from a visible panel at any time, not buried in settings.
3. **Discovery.** User asks "what's new on Arc" → agent surfaces news highlights → asks "show me lending protocols" → agent surfaces the curated dApp list → says "open the top one" → routed.

### Business Rules (Phase 1)

- Any agent action outside an active Permission Card's scope always requires explicit per-action confirmation. No exceptions.
- Spend limits are enforced per rolling 24-hour window from card creation (flagged below — confirm rolling vs. calendar-day is actually what you want).
- A Permission Card's protocol allowlist is enforced at the execution layer, never trusted from the frontend alone.
- Expired Permission Cards auto-revoke. No silent renewal.

### Data Discovery (Phase 1)

| Entity | Sensitivity | Notes |
|---|---|---|
| Wallet | High | Address + client-encrypted key material. Never sent to backend in plaintext. |
| Permission Card | Medium-High | Owner wallet, allowed actions, spend cap, allowlist, expiry, status. Backend needs this to enforce agent actions. |
| Chat / transaction history | Medium | Message log + linked tx hashes. Needed for "explain every transaction" and for the audit trail. |
| Arc news content | Low | Cached/aggregated. |

### Constraints (Phase 1)

- **Timeline:** ~2.5 weeks remaining (today is Wednesday, July 22) to the Aug 9 checkpoint drives every scope decision above.
- **Team:** confirmed 3 people (Eric + 2 teammates) as of the team's formation for the hackathon. See the parallel-track sprint plan below — this replaces the earlier solo-builder assumption.
- **Codebase:** reusing the CyberSwitch Wallet repo (React + TS + Vite, ethers.js/viem, Arc Testnet). **Reusable as-is:** key generation/encryption logic, resilient balance-fetching patterns, transaction display components. **Needs rework:** anything built on `chrome.storage.session` (the auto-lock mechanism) — that API doesn't exist outside a Chrome extension and needs a web-app-appropriate replacement (in-memory session state + idle timeout, or a real backend session). The extension's manifest/background-script/content-script layer for dApp injection has no web-app equivalent and can be dropped entirely — Quidarc doesn't need to inject into other sites.
- **Infrastructure:** this is the first time the product needs a real backend. The extension never had one. A backend is required for chat/agent orchestration, Permission Card enforcement, and news aggregation — a genuinely new architectural layer, not a tweak.

### Risks (Phase 1)

1. **Agent overreach / unauthorized spend — Critical.** Mitigation: fail-closed permission checks, small default limits, mandatory confirmation outside scope, instant revocation always available.
2. **Agent wallet custody model is still undecided — High.** The user's own wallet stays non-custodial (client-side keys) — that part's settled. What's open: does the *agent's* wallet hold independent keys somewhere (and how does it sign headlessly?), or is "delegation" actually a scoped session-key/allowance grant against the user's own wallet with no separate custody at all? Circle's own platform draws exactly this distinction (developer-controlled vs. user-controlled vs. modular wallets, plus a Gateway/nanopayment service) — that's the right starting point for resolving this rather than inventing a custody model from nothing. This should be resolved before Skill 02 (Software Architecture) runs — it changes the architecture significantly.
3. **Timeline compression — High.** Mitigated by the MoSCoW cuts above, reusing existing wallet-core code, and keeping news/dApp content static.
4. **DEX/aggregator integration specifics on Arc Testnet — Medium, mostly resolved.** Uniswap, Curve, and others are confirmed live on testnet, and Circle's App Kit likely covers swap/bridge/send directly — the remaining open item is just picking the specific integration path, not whether one exists.
5. **Hallucinated agent actions — Medium.** The agent must never "confirm" something it hasn't actually verified on-chain. Covered by the fail-closed / explicit-failure NFRs above.

### Phase 1 Execution Roadmap — 3-Person Sprint Plan

Today is **Wednesday, July 22** — 19 days to the Aug 9 submission checkpoint (a little under 3 weeks, starting mid-week). Demo Day (Aug 20) follows 11 days after; treat that window as presentation/polish, not build time.

**Team confirmed at 3** (Eric + 2 teammates). Split below follows the seven backend modules and frontend surfaces from `quidarc-software-architecture.md` into three tracks along natural boundaries — **this is a default split, not a fixed assignment.** I don't know the two teammates' actual strengths; rebalance freely, especially Track A, which assumes whoever's closest to the existing wallet codebase (sounds like Eric, given the original CyberSwitch key-gen/encryption/balance-fetching work) owns it.

**Track A — Wallet & Chain Integration**
Port wallet creation/import → Execution Engine module (Circle App Kit swap/transfer) → Agent Wallet Module (Circle Developer-Controlled Wallet signing).

**Track B — Backend & Agent Orchestration**
Backend scaffold (Auth/Session, Postgres, API layer) → LLM/Agent Orchestration tool-calling → Permission Module (CRUD + enforcement).

**Track C — Frontend & Content**
Web app shell (drop the extension-specific layer) → Chat UI → Permission Card panel + transaction confirmation modal → news/dApp content + activity log view.

Tracks converge in Sprint 2–3 since the chat flow only works once Track A's execution tools, Track B's orchestration, and Track C's UI are all wired together — that convergence point is the highest-coordination moment in the whole build, worth a standing daily sync once Sprint 2 starts.

---

**Sprint 1 — Jul 22 to Jul 26 (5 days): Foundation, in parallel**

- **Day 1, all three:** repo created, everyone added as a collaborator, branch strategy agreed (see `CONTRIBUTING.md`), planning docs committed to `/docs`. **Also Day 1:** lock the agent-wallet custody model if it isn't already — it's resolved in `quidarc-agent-governance.md`, so this should just be a quick team read-through and confirmation, not a fresh decision.
- Track A: port wallet create/import into the new web app shell.
- Track B: backend scaffold live and reachable (health check), Postgres provisioned, module folder structure per the architecture doc.
- Track C: web app shell (routing, extension-layer removed), chat UI shell with stubbed responses.

*Exit criteria:* repo live with all 3 people pushing to it. Wallet create/import works in the web app. Backend reachable. Chat UI renders (even unwired).

**Sprint 2 — Jul 27 to Aug 2 (7 days): Core build, tracks converge**

- Track A: Execution Engine wired to Circle App Kit (swap + transfer); Agent Wallet Module signing logic.
- Track B: Agent Orchestration wired to Track A's execution tools via tool-calling; Permission Module CRUD.
- Track C: Permission Card panel UI, transaction confirmation modal, chat UI wired to the real backend (no longer stubbed).

*Exit criteria:* chat → balance / chat → swap / chat → transfer work end-to-end on Arc Testnet, gated by explicit confirmation. Permission Cards can be created (enforcement itself lands in Sprint 3).

**Sprint 3 — Aug 3 to Aug 9 (7 days): Enforcement, content, and shipping**

- Track A + B together: Permission Card fail-closed enforcement wired into the live execution path; **explicitly test instant revocation as a team** — this is the single most important trust-building moment in the demo, worth more than one set of eyes on it.
- Track C: news feed + dApp explorer content finalized, activity/audit log view, portfolio view.
- All three: rehearse the three key user journeys end-to-end together. Repo cleanup + README. Record the 3-minute pitch video (worth noting: this plays directly to Eric's existing AI-video-production background — a natural fit for whoever owns that piece). Submit by Aug 9, ideally with a day or two of buffer.

*Exit criteria:* every Must-Have works end-to-end, repo is public and clean, video is recorded, submission is in.

**If a sprint runs long:** Should-Have and Could-Have items (portfolio view, bridge execution, claim-rewards) slip first — never the Must-Haves. Cutting scope beats missing Aug 9.

---

## Phase 2 — Post-Hackathon (directional)

- Autonomous/scheduled execution (recurring buys, price-triggered actions)
- Portfolio analysis & spending insights
- Notification engine
- The full standalone Agent Wallet (once Phase 1's custody-model decision is proven out, Phase 2 is where a genuinely separate agent-held wallet gets built on top of it)
- Learning hub

## Phase 3 — Mainnet Era (directional)

- Multiple specialized agents — maps directly onto the `multi-agent-systems-orchestration` EOS skill
- Community agent marketplace
- Enterprise accounts, shared wallets, DAO tooling
- Plugin ecosystem
- Cross-chain support

---

## Verified Facts / Assumptions / Unknowns / Clarifications

*(Per EOS Skill 01, Phase 12 — kept explicit rather than building on silent guesses.)*

**Verified facts**
- Hackathon dates (start July 13, final submission Aug 9, demo day Aug 20) and a dedicated Agentic Track — confirmed via Encode Club / Arc House.
- Arc is EVM-compatible, testnet-live, uses USDC as native gas, and has an App Kit covering bridge/swap/send/unified balance.
- Existing CyberSwitch codebase: React + TS + Vite, ethers.js/viem, targets Arc Testnet (Chain ID 5042002).
- **Team is 3 people** (Eric + 2 teammates) — confirmed; the sprint plan above reflects this.

**Assumptions (please confirm)**
- Phase 1 ships on Arc Testnet, not mainnet.
- One swap integration path is enough for the MVP — not multi-route aggregation.
- Track assignments in the sprint plan are a default based on module boundaries, not confirmed skillsets for the two teammates — rebalance as needed.

**Unknowns**
- Exact source list for the Arc news feed (official blog? community.arc.io? a specific RSS/API?).
- Whether Gateway Nanopayments is realistically wireable within the hackathon window — treated as Phase 2/3, not Phase 1, per the tooling map above (it solves agent-to-service payments, which isn't a Phase 1 feature).

**Clarifications — resolved**
1. ~~Agent wallet custody model~~ — **resolved in `quidarc-agent-governance.md`.** Developer-Controlled Wallet for the agent, manually-funded for Phase 1 (no auto-pull from the user's wallet yet).
2. ~~Rolling 24h vs. calendar-day spend limits~~ — **resolved:** rolling 24h, more conservative and standard for spend-limit patterns. See governance doc.
3. ~~Team size~~ — **resolved: 3 people.** Sprint plan above splits work into 3 tracks accordingly.

**Clarifications still open**
4. Specific role fit within the team — the 3-track split is a default based on module boundaries, not confirmed against actual teammate skillsets.
5. **From the governance pass:** self-custody (existing seed-phrase flow) vs. Circle User-Controlled Wallets (embedded, Web2 login) for the *user's own* wallet — see governance doc for the tradeoff; defaulted to keeping the existing flow unless you say otherwise.

---

## Engineering Handoff Briefs

**→ Architecture Brief (Skill 02 — Senior Software Architecture):** Web app, not extension — needs a real backend for the first time, for chat/agent orchestration, Permission Card enforcement, and news aggregation. Reuse wallet-core crypto logic from the existing repo; replace `chrome.storage.session`-based session handling; drop the extension-specific injection layer entirely. Central open question: agent wallet custody model (see Clarifications). The chat agent's tool-calling layer (swap/transfer/permission-check actions) is a strong fit for an MCP-based architecture — this maps directly to the "MCP Integration Architecture" section already defined in the `multi-agent-systems-orchestration` EOS skill.

**→ Database Brief (Skill 03 — Senior Database Architect):** Core entities: Wallet, PermissionCard, ChatMessage, TransactionRecord, NewsItem, DAppListing. PermissionCard and TransactionRecord need the most careful access-control design — they're the sensitivity-critical entities.

**→ Backend/API Brief (Skill 04 — API & Backend Architect):** Endpoints/services needed for: wallet ops (client-encrypted, backend mostly blind to key material), chat/agent orchestration (tool-calling — this is where the AI-agent EOS skill set applies directly), swap/transfer execution against App Kit or a chosen DEX integration, Permission Card CRUD + fail-closed enforcement, news aggregation, dApp directory.

**→ Frontend Brief (Skill 05 — Frontend & UI Architect):** Chat-first UI is the primary surface, not a traditional wallet dashboard. Needs: chat thread, a visible Permission Card management panel, a pre-sign transaction confirmation modal, a basic portfolio view, news feed, dApp directory.

**→ Testing Brief:** Highest-risk flows to test exhaustively: permission-scoped agent execution never exceeding granted scope, instant revocation, wallet creation/import key handling, and the confirm-before-execute swap/transfer flow.

## Recommended Next Steps

1. Confirm the Clarifications above — the agent wallet custody model is the one that actually blocks architecture work.
2. Run Skill 02 (Senior Software Architecture) against the Architecture Brief above.
3. Decide the news-feed source list and confirm the Gateway/nanopayment skill's current availability before locking Phase 1 vs. Phase 2 scope for the agent wallet.
4. Once architecture, database, backend, and frontend are specified, `senior-software-engineer` implementation can start against the existing repo, reusing what's reusable per the Constraints section above.
