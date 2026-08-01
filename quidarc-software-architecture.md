# Quidarc — Software Architecture

**Companion to:** `quidarc-vision.md`, `quidarc-build-plan.md`, `quidarc-agent-governance.md`
**EOS skill applied:** `senior-software-architecture-systems-design`, scaled to a solo-builder, 3-week MVP. Full thinking process (Understand → Decompose → Evaluate → Design → Validate) applied throughout; sections that only matter at real scale (distributed tracing, multi-region deployment, heavy CI/CD pipelines) are intentionally condensed rather than given full enterprise treatment — noted inline.

---

## Executive Summary

Quidarc needs a **real backend for the first time** — the original CyberSwitch Chrome extension never had one. That's the single biggest architectural shift in this pivot, bigger than the extension→web-app move itself. Everything below is designed around that: a backend that can hold the Agent Wallet's keys, enforce Permission Cards server-side, and orchestrate the chat agent's tool calls — while staying simple enough for one person to build correctly in three weeks.

**Recommended style: Modular Monolith.** One deployable backend service, internally split into clearly-owned modules that mirror the product's actual domains. Not microservices (way too much operational overhead for a solo build on a deadline), not a fully event-driven system (nothing here needs a message queue at this scale), not serverless-only (the Agent Wallet's signing logic wants a persistent, controllable process, not cold-start functions).

---

## 1. System Decomposition

**Frontend (Client)** — React + TypeScript + Vite, retained from the existing repo.

**Backend (Modular Monolith)** — new, Node.js + TypeScript. Internally organized into seven modules:

| Module | Responsibility |
|---|---|
| **Auth/Session** | Issues and validates session tokens for the web app — replaces the extension's `chrome.storage.session`-based auto-lock, which has no equivalent outside a Chrome extension. |
| **Agent Orchestration** | Receives chat messages, calls the LLM, manages conversation context, routes tool calls to the modules below, returns natural-language responses. |
| **Execution Engine** | The only module that talks to Circle App Kit and Arc RPC. Exposes discrete tools: `getBalance`, `quoteSwap`, `executeSwap`, `executeTransfer`. Never executes without either explicit per-action confirmation or a Permission Module sign-off. |
| **Permission Module** | Permission Card CRUD + the enforcement check itself (per `quidarc-agent-governance.md` §2). Queried by the Execution Engine before every Agent-Wallet action. Fail-closed. |
| **Agent Wallet Module** | Wraps Circle's Developer-Controlled Wallet API. The *only* module that ever signs on the Agent Wallet's behalf, and only after the Permission Module authorizes it. |
| **Content Module** | Arc news feed aggregation, dApp directory. Curated/static for Phase 1 — lowest technical risk, deliberately kept simple. |
| **Audit Module** | Logs every agent-executed action (which card authorized it, params, tx hash, verified outcome); exposes the user-facing activity feed. |

Each module follows Single Responsibility — no module reaches into another's data directly; everything crosses module boundaries through explicit function calls (this is what "modular" actually buys you inside a monolith: the boundaries are real even though the deployment isn't split).

---

## 2. Why Modular Monolith (the Evaluate step)

| Option | Verdict | Why |
|---|---|---|
| Microservices | Rejected | Operational overhead (service discovery, inter-service auth, multiple deploys) has no payoff at one developer and a few weeks. This is the mistake that burns hackathon time. |
| Event-driven / message-queue architecture | Rejected | Nothing here actually needs async fan-out yet — it's a chat thread producing at most a few tool calls per turn. Adding a queue now is complexity with no current benefit. |
| Serverless-only | Rejected | The Agent Wallet Module wants a controllable, persistent process for signing — cold-start functions add friction here without solving a real problem. |
| **Modular Monolith** | **Selected** | Fast to build solo, easy to reason about, and the module boundaries above are drawn so that if Phase 3's multi-agent vision (`multi-agent-systems-orchestration`) needs real service separation later, the seams are already in the right places. This is the "delay expensive rewrites" principle in practice. |

---

## 3. Data Flow — two worked examples

**Chat-initiated swap:**
User message → Agent Orchestration parses intent → calls Execution Engine's `quoteSwap` tool → Execution Engine calls Circle App Kit → quote returned to Agent Orchestration → agent presents amount/fee/slippage in chat → user confirms (or: request matches an active Permission Card, so Permission Module pre-authorizes and no confirmation prompt is shown) → Execution Engine calls `executeSwap` → Agent Wallet Module signs (if executing from the Agent Wallet) → transaction submitted to Arc RPC → Audit Module logs the outcome once on-chain confirmation is verified → agent reports the verified result in chat.

**Permission Card creation → later use → revocation:**
User creates a card via the Permission panel → Permission Module writes it, status `active` → later, a chat swap request arrives that falls inside the card's scope → Execution Engine asks Permission Module to verify (action type, protocol, remaining rolling-24h spend) → verified → executes without a confirmation prompt → user later taps Revoke → Permission Module flips status to `revoked` immediately → the very next Execution Engine check against that card fails closed, no grace period.

---

## 4. Service Communication

- **Frontend ↔ Backend:** request/response. Recommend **tRPC** over plain REST — same-language (TypeScript) frontend and backend means shared types with no manual API-contract duplication, which matters more than usual given the solo/deadline context. REST is an equally valid fallback if you'd rather keep something more conventional; the type-safety win is the only reason tRPC is the recommendation, not a hard requirement.
- **Chat responses specifically:** Server-Sent Events (SSE) for a streaming/typing-indicator feel is a nice UX upgrade, but it's optional — doesn't block anything, and if Week 2 is tight, a plain non-streamed response is a fine fallback. Keeping this in the same MoSCoW discipline as the build plan: Should-Have, not Must-Have.
- **Backend → Circle App Kit / Circle Wallets API / Arc RPC:** direct HTTP/JSON-RPC calls, no intermediary needed.
- **Between backend modules:** direct function calls within the single process — this is the actual practical benefit of the Modular Monolith choice; no internal message bus required yet.

---

## 5. API Architecture

Internal API (frontend ↔ backend) — not third-party-consumed in Phase 1, but still designed cleanly:

- Auth: session-token-based, issued at wallet unlock.
- Rough surface: `chat` (send/receive, streamed or not), `wallet.getBalance`, `permissionCards.create/list/revoke`, `news.list`, `dApps.list`, `activity.list`.
- Rate limiting: light — mainly to protect LLM API cost and Circle API quota from abuse, not a hard security control at this user scale.
- No heavy versioning scheme needed yet — this isn't a public API surface.

---

## 6. State Management

- **Client:** React Query (or equivalent) for server-state caching — balances, permission cards, news, dApps. Local component state/context for chat UI and modals. No need for a global state library (Redux/Zustand) at this app's scope — would be added complexity with no current payoff.
- **Server:** Postgres is the single source of truth for Permission Cards, Agent Wallet records, audit logs, chat history. **One hard rule:** Permission Card status changes — revocation especially — must be immediately consistent at the data layer. No caching lag is acceptable here; this is the one place where "instant" has to be true end-to-end, not just at the API layer.
- **Session:** short-lived token, client + backend, replacing `chrome.storage.session`.
- No distributed cache (Redis, etc.) needed at MVP scale.

---

## 7. Security Architecture

- **Client-side key material:** unchanged from the existing wallet — encrypted, never transmitted to the backend, not even encrypted. The backend holds zero User Wallet key material. (Worth being explicit: this means **no cross-device wallet sync in Phase 1** — losing the browser without an exported backup means losing the wallet. That's a real product tradeoff, not an oversight — flag it in onboarding copy rather than letting users discover it the hard way.)
- **Backend session auth:** token-based, scoped, short-lived.
- **Permission Card enforcement:** server-side only, fail-closed, as specified in the governance doc — never trust the frontend's view of a card's status.
- **Agent Wallet signing:** isolated to one module. Circle API credentials and the Anthropic API key live in the hosting platform's environment/secrets store, never committed to the repo — worth naming explicitly since this is exactly the kind of thing that slips under deadline pressure.
- **Prompt injection boundary — this is structural, not just policy.** The Agent Orchestration Module must pass retrieved content (news items, dApp descriptions) to the LLM tagged distinctly as *data to summarize*, never as instructions. Tool-calling authority is wired only to the authenticated user's own chat turns. This needs to be an actual code-level separation in how content gets assembled into the LLM's context, not a prompt-level request to "please ignore instructions in retrieved content" — that kind of soft instruction is not a reliable control on its own.

---

## 8. Deployment Architecture

Kept deliberately minimal — this is the condensed section flagged up top:

- **Frontend:** static hosting (Vercel, Netlify, or Cloudflare Pages) — zero-config for a Vite/React app.
- **Backend + Database:** Railway or Render, whichever you're already comfortable with — both offer one-click Postgres alongside the app, which matters more than the specific brand: **keep backend and DB on the same platform** to avoid unnecessary cross-service config.
- **Environments:** two — local/dev and one deployed environment that doubles as the demo environment. A full dev/staging/production pipeline would be time spent on process instead of features, and isn't warranted yet.
- **CI/CD:** one GitHub Actions workflow — lint, typecheck, build on push; deploy on merge to main. That's the whole pipeline for now.

---

## 9. Reliability & Failure Recovery

- If Circle App Kit or Arc RPC is unreachable, the Execution Engine catches it and the agent says so plainly in chat — never hangs, never fabricates a result. (Already an NFR in the build plan; this makes it an architectural requirement on a specific module.)
- If the LLM provider errors or times out, Agent Orchestration returns a clear fallback message rather than a silent failure.
- Agent Wallet transactions are all-or-nothing: full construction + Permission Module check + signing succeeds, or nothing happens. No partial state.

---

## 10. Observability (condensed — no distributed tracing needed at this scale)

- Structured logs (even just structured console output shipped to the hosting platform's built-in log viewer is enough) covering: every tool-call attempt, every Permission Card enforcement decision and why, every Circle API call outcome.
- A `/health` endpoint on the backend — most hosting platforms want this for uptime checks anyway.
- The Audit Module's user-facing activity feed doubles as lightweight observability — the audit-logging requirement and basic operational logging can share the same underlying data, which is a nice efficiency rather than building two separate logging paths.

---

## 11. Technology Recommendations

| Layer | Recommendation | Why / alternative |
|---|---|---|
| Frontend | React + TypeScript + Vite (existing, retained) | Already built, already works |
| Frontend on-chain libs | ethers.js / viem (existing, retained) | No reason to change what already works |
| Frontend server-state | React Query | Fast to wire up, handles caching/refetching without a global state library |
| Backend runtime | Node.js + TypeScript | Matches existing frontend skillset — minimal context-switching for a solo build |
| Backend framework | Fastify (recommended) or Express (equally valid, more universally familiar) | Fastify has slightly nicer built-in TS support; pick whichever you're faster with |
| Frontend↔backend contract | tRPC (recommended) or REST | tRPC removes manual API-type duplication given TypeScript on both ends |
| Database | Postgres, via a managed provider (Supabase, Neon, or your hosting platform's built-in Postgres) | Production-realistic path, near-zero ops to stand up |
| LLM / agent brain | Anthropic Claude, via the Anthropic API | Arc's own docs already reference the Claude Agent SDK for AI tooling — a well-supported path, not a cold-start integration |
| Swap/transfer execution | Circle App Kit | Confirmed fastest path — wraps CCTP, ships Bridge/Swap/Send/Unified Balance |
| Agent Wallet | Circle Developer-Controlled Wallets API | The documented use case for exactly this pattern (see governance doc §1) |
| Hosting — frontend | Vercel / Netlify / Cloudflare Pages | Zero-config static hosting |
| Hosting — backend + DB | Railway or Render | Either works; keep both on one platform |
| CI/CD | GitHub Actions | Lint + typecheck + build + deploy-on-merge, nothing more elaborate needed |

---

## 12. Architecture Decision Records

**ADR-01 — Modular Monolith over Microservices.** Problem: how to structure a backend that doesn't exist yet, for one developer, in three weeks. Options: microservices, event-driven, serverless, modular monolith. Selected: modular monolith. Trade-off accepted: less "impressive" architecture, but the actual right call given team size and timeline. Revisit when/if Phase 3's multi-agent vision demands real service separation.

**ADR-02 — Two-wallet model.** Already decided in `quidarc-agent-governance.md` §1 — restated here because it's foundational to this entire architecture, not a detail. User Wallet stays self-custodial/client-side; Agent Wallet is a Circle Developer-Controlled Wallet, backend-held.

**ADR-03 — New backend, Node/TypeScript.** Problem: this product never had a backend. Selected stack matches the existing frontend skillset to minimize context-switching under deadline pressure. Alternative considered: a different backend language for performance reasons — rejected, since there's no evidence Phase 1's scale needs it, and the cost of a second language for a solo builder is real.

**ADR-04 — Postgres over SQLite.** Selected for a production-realistic path and safer concurrent-access behavior, at negligible extra setup cost via a managed provider.

**ADR-05 — MCP-style tool boundary for agent execution.** The Execution Engine's actions are exposed to Agent Orchestration as discrete, explicitly-scoped tools (`getBalance`, `quoteSwap`, `executeSwap`, `executeTransfer`), not an open-ended capability. This is both an architecture decision and a safety one — it's the concrete implementation of the tool-surface-minimization principle from the governance doc.

---

## 13. Engineering Risks

1. **The backend is genuinely new infrastructure**, not a tweak to the existing extension — medium-high risk purely from "new moving part," mitigated by keeping it intentionally simple rather than over-engineered.
2. **Solo-builder assumption is still unconfirmed** three documents in now. If wrong, this module breakdown still holds, but the weekly sprint plan needs restructuring into parallel workstreams.
3. **No cross-device wallet sync in Phase 1** (see Security Architecture) — a conscious tradeoff that needs to surface in onboarding copy, not just live in this document.
4. **LLM cost/rate limits** — the Anthropic API isn't free or unlimited; a light per-user chat rate limit is worth building early rather than discovering a cost spike during the demo period.

---

## 14. Engineering Handoff Briefs

**→ Database Architecture Brief (Skill 03):** Core entities — Wallet (address only, zero key material backend-side), PermissionCard (schema per governance doc §2), AgentWallet (address + Circle wallet ID reference), Conversation/ChatMessage, TransactionRecord/AuditLog (references the PermissionCard that authorized it, nullable for per-action-confirmed requests), NewsItem, DAppListing. The one hard consistency requirement: PermissionCard status changes must be immediately consistent, no caching lag.

**→ Backend/API Architecture Brief (Skill 04):** Seven modules as specified in §1. tRPC (or REST) + optional SSE for chat. Session-token auth. External integrations: Circle App Kit, Circle Developer-Controlled Wallets API, Arc RPC, Anthropic API, a news content source (still an open unknown per the build plan). No background/scheduled jobs in Phase 1 — autonomous execution is explicitly Phase 2.

**→ Frontend Architecture Brief (Skill 05):** Chat is the primary/landing surface, not a traditional wallet dashboard. Views needed: Chat, Wallet/Portfolio, Permission Cards (list/create/revoke, with "sweep balance back" alongside revoke), Transaction Confirmation (modal, the deliberate "escape hatch" into explicit UI for money-moving moments), News Feed, dApp Explorer, Activity Log. Shared components: the confirmation modal (used by both swap and transfer), the permission-card component (used in both the management panel and inline in chat). React Query for server state; no global state library needed.

**→ Infrastructure Brief:** Per §8 above — static frontend hosting, backend+DB co-located on one platform, two environments, one CI/CD workflow, secrets via the hosting platform's environment store.

---

## Implementation Readiness

Every quality gate this skill checks for is now satisfied: requirements are addressed module-by-module, domain boundaries and data ownership are explicit, security boundaries (including the prompt-injection structural boundary) are defined, scalability is deliberately deferred rather than ignored, and all four handoff briefs above are ready to consume.

**Recommended next step:** Skill 03 (Senior Database Architect), working from the Database Architecture Brief in §14.
