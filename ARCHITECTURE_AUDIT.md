# Architecture Compliance Audit

This audit compares the current backend implementation with the documented architecture in [ARCHITECTURE.md](ARCHITECTURE.md), [docs/quidarc-software-architecture.md](docs/quidarc-software-architecture.md), [docs/quidarc-build-plan.md](docs/quidarc-build-plan.md), and [docs/quidarc-agent-governance.md](docs/quidarc-agent-governance.md).

## 1. Module status

| Module / area | Status | Notes |
|---|---|---|
| Server bootstrap | Implemented | The Fastify bootstrap is present and registers routes in [backend/server/index.ts](backend/server/index.ts). |
| HTTP routes | Implemented | Health, chat, wallet, permissions, and content routes exist under [backend/server/routes](backend/server/routes). |
| Orchestrator | Partially implemented | The orchestrator exists in [backend/server/modules/orchestrator/orchestrationService.ts](backend/server/modules/orchestrator/orchestrationService.ts), but it only performs simple intent detection and does not implement real tool-calling or LLM-backed orchestration. |
| Auth / session | Placeholder | The modules exist in [backend/server/modules/auth](backend/server/modules/auth), but they are placeholders and do not implement real auth or session behavior. |
| Execution engine | Partially implemented | The execution service exists in [backend/server/modules/execution/executionService.ts](backend/server/modules/execution/executionService.ts), but it is a simple confirmation stub rather than a real execution engine with Circle/App Kit or fail-closed enforcement. |
| Permission module | Partially implemented | Permission-card CRUD exists in [backend/server/modules/permission/permissionService.ts](backend/server/modules/permission/permissionService.ts), but enforcement is not implemented as a real server-side fail-closed policy. |
| Agent-wallet module | Placeholder | The module exists in [backend/server/modules/agent-wallet/walletService.ts](backend/server/modules/agent-wallet/walletService.ts), but it only provides placeholder wallet responses and balance lookup. It does not implement actual backend-held agent-wallet signing or custody behavior. |
| Audit module | Placeholder | The module exists in [backend/server/modules/audit/auditService.ts](backend/server/modules/audit/auditService.ts), but it does not yet record real agent actions or produce an activity feed. |
| Content module | Partially implemented | The content service exists in [backend/server/modules/content/contentService.ts](backend/server/modules/content/contentService.ts) and returns static content, which matches the current implementation scope. |
| Arc integration | Partially implemented | Arc helpers exist in [backend/server/integrations/arc/arcClient.ts](backend/server/integrations/arc/arcClient.ts), but the implementation is limited to RPC and balance helpers. |
| Circle integration | Placeholder | The placeholder client exists in [backend/server/integrations/circle/circleClient.ts](backend/server/integrations/circle/circleClient.ts), but there is no real Circle integration yet. |
| Anthropic integration | Placeholder | The placeholder client exists in [backend/server/integrations/anthropic/claudeClient.ts](backend/server/integrations/anthropic/claudeClient.ts), but there is no real provider integration yet. |
| Shared contracts and helpers | Implemented | Shared contracts exist under [backend/packages/contracts](backend/packages/contracts), and shared helpers exist under [backend/server/shared](backend/server/shared). |
| Persistence / database layer | Missing | No database or repository-backed persistence is implemented. |

## 2. Architectural rule compliance

| Architectural rule | Status | Notes |
|---|---|---|
| Modular monolith structure | Partially compliant | The backend is organized into modules under [backend/server/modules](backend/server/modules), but the module boundaries are still structural placeholders rather than fully implemented domains. |
| Thin routes | Partially compliant | Routes validate input and delegate to services, but the current route layer still contains the main request validation surface and does not yet represent a fully separated transport layer. |
| Seven-module boundary alignment | Partially compliant | The expected domain modules are present, but several of them remain placeholder or partial implementations. |
| Server-side permission enforcement | Non-compliant | The permission service exists, but enforcement is not implemented in the fail-closed way described by the governance documentation. |
| Agent-wallet custody separation | Non-compliant | The project now uses an agent-wallet module, but the implementation does not yet reflect a real backend-held agent wallet with distinct custody behavior. |
| Instant revocation behavior | Non-compliant | Revocation is represented in the permission service, but no real enforcement path or revocation-driven block behavior is implemented. |
| Audit and traceability | Non-compliant | There is an audit module placeholder, but real action logging and traceability are not implemented. |
| Prompt-injection boundary | Non-compliant | The current orchestrator does not distinguish user chat input from retrieved content, and it does not enforce tool-calling boundaries based on authenticated user input. |
| Tool-surface minimization | Non-compliant | The current implementation does not expose a real tool-calling layer with explicitly scoped actions. |
| Persistence-backed state | Non-compliant | The architecture requires durable state, but the current implementation uses in-memory data structures in the permission service. |
| Real authentication and session handling | Non-compliant | The auth and session modules are placeholders only. |
| Real Circle / wallet execution integration | Non-compliant | The current implementation does not implement the real Circle/App Kit or signing path described in the architecture docs. |
| Health endpoint | Compliant | The health route exists in [backend/server/routes/health.ts](backend/server/routes/health.ts). |
| Arc-based balance lookup | Compliant | Arc balance lookup is implemented through [backend/server/integrations/arc/arcClient.ts](backend/server/integrations/arc/arcClient.ts) and [backend/server/modules/agent-wallet/walletService.ts](backend/server/modules/agent-wallet/walletService.ts). |
| Shared contracts package | Compliant | Shared contracts are present under [backend/packages/contracts](backend/packages/contracts). |

## 3. Non-compliant items and recommended next phases

### 3.1 Server-side permission enforcement

- Why it is non-compliant
  - The governance document requires fail-closed enforcement before any agent-wallet action. The current permission service only stores and revises card state; it does not evaluate a request against an active permission card in a real enforcement path before execution.
- Affected files
  - [backend/server/routes/permissions.ts](backend/server/routes/permissions.ts)
  - [backend/server/modules/permission/permissionService.ts](backend/server/modules/permission/permissionService.ts)
  - [backend/server/modules/execution/executionService.ts](backend/server/modules/execution/executionService.ts)
- Recommended next implementation phase
  - Phase 1: introduce a real permission-evaluation flow in the execution module that checks card status, allowed actions, protocol allowlist, expiry, and spend limits before any action is treated as authorized.

### 3.2 Agent-wallet custody separation

- Why it is non-compliant
  - The architecture requires a clear distinction between the user wallet and the backend-held agent wallet. The current implementation uses placeholder wallet responses, but it does not represent a real backend-owned agent-wallet custody model.
- Affected files
  - [backend/server/routes/wallet.ts](backend/server/routes/wallet.ts)
  - [backend/server/modules/agent-wallet/walletService.ts](backend/server/modules/agent-wallet/walletService.ts)
- Recommended next implementation phase
  - Phase 2: define and implement a real agent-wallet service boundary that models backend-held wallet state and separates it from client-side user-wallet handling.

### 3.3 Instant revocation behavior

- Why it is non-compliant
  - The governance document requires revocation to take effect immediately and fail closed. The current implementation only flips a status flag in memory and does not enforce that status in the execution flow.
- Affected files
  - [backend/server/modules/permission/permissionService.ts](backend/server/modules/permission/permissionService.ts)
  - [backend/server/routes/permissions.ts](backend/server/routes/permissions.ts)
- Recommended next implementation phase
  - Phase 1: wire permission status checks into the execution path so revoked cards immediately block downstream action.

### 3.4 Audit and traceability

- Why it is non-compliant
  - The architecture requires every agent action to be recorded with authorization context, parameters, transaction hash, and verified outcome. The current audit module is only a placeholder and does not log real actions.
- Affected files
  - [backend/server/modules/audit/auditService.ts](backend/server/modules/audit/auditService.ts)
  - [backend/server/routes/permissions.ts](backend/server/routes/permissions.ts)
  - [backend/server/modules/execution/executionService.ts](backend/server/modules/execution/executionService.ts)
- Recommended next implementation phase
  - Phase 2: add action-recording hooks in the execution path and expose the resulting data through the audit module.

### 3.5 Prompt-injection boundary

- Why it is non-compliant
  - The governance document requires retrieved content to be treated as data rather than executable instructions. The current orchestrator simply inspects free-form text and does not enforce a distinction between user prompts and content-derived text.
- Affected files
  - [backend/server/modules/orchestrator/orchestrationService.ts](backend/server/modules/orchestrator/orchestrationService.ts)
  - [backend/server/modules/content/contentService.ts](backend/server/modules/content/contentService.ts)
- Recommended next implementation phase
  - Phase 2: introduce a clear context model where user chat turns are the only source of executable intent, while content responses are treated as data only.

### 3.6 Tool-surface minimization

- Why it is non-compliant
  - The architecture calls for a narrow tool interface for execution actions. The current implementation does not expose a real tool layer and does not enforce scoped execution capabilities.
- Affected files
  - [backend/server/modules/orchestrator/orchestrationService.ts](backend/server/modules/orchestrator/orchestrationService.ts)
  - [backend/server/modules/execution/executionService.ts](backend/server/modules/execution/executionService.ts)
- Recommended next implementation phase
  - Phase 2: introduce explicit execution tools such as balance lookup, quote generation, and execution confirmation behind a constrained interface.

### 3.7 Persistence-backed state

- Why it is non-compliant
  - The architecture requires Postgres-backed persistence for permission cards, wallet records, and audit logs. The current implementation stores permission-card state in memory only.
- Affected files
  - [backend/server/modules/permission/permissionService.ts](backend/server/modules/permission/permissionService.ts)
  - [backend/server/modules/audit/auditService.ts](backend/server/modules/audit/auditService.ts)
- Recommended next implementation phase
  - Phase 3: add persistence abstractions and repositories behind the existing module boundaries, with persistence introduced after the module structure is stable.

### 3.8 Real authentication and session handling

- Why it is non-compliant
  - The architecture requires session-based auth for the web app. The current auth and session services are placeholders only.
- Affected files
  - [backend/server/modules/auth/authService.ts](backend/server/modules/auth/authService.ts)
  - [backend/server/modules/auth/sessionService.ts](backend/server/modules/auth/sessionService.ts)
- Recommended next implementation phase
  - Phase 2: implement authenticated request handling and session issuance after the core module structure is in place.

### 3.9 Real Circle / wallet execution integration

- Why it is non-compliant
  - The architecture and build plan call for a real Circle/App Kit execution path. The current implementation does not perform real swap or transfer execution through the documented execution path.
- Affected files
  - [backend/server/modules/execution/executionService.ts](backend/server/modules/execution/executionService.ts)
  - [backend/server/integrations/circle/circleClient.ts](backend/server/integrations/circle/circleClient.ts)
  - [backend/server/integrations/arc/arcClient.ts](backend/server/integrations/arc/arcClient.ts)
- Recommended next implementation phase
  - Phase 2: wire a real execution path through the execution module and the Circle/Arc integration clients.

## 4. Overall assessment

The current backend has achieved the architectural skeleton requested by the refactor: it now has a module-based server layout under [backend/server](backend/server), route-to-service delegation, provider-specific integration folders, and shared contracts. However, the implementation remains a structural scaffold rather than a full architecture-compliant backend.

The biggest gaps are in governance-critical areas:
- fail-closed permission enforcement
- real agent-wallet custody separation
- revocation enforcement
- auditability
- prompt-injection boundaries
- real persistence and authentication

These areas should be the focus of the next implementation phase.
