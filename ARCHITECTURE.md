# Backend Architecture

This document describes the current backend implementation as it exists in the repository today. It is based on the code under the server directory and the shared contracts package, and it intentionally avoids adding features or architectural assumptions that are not present in the implementation.

## 1. Directory tree

```text
backend/
  package.json
  tsconfig.json
  dist/
  node_modules/
  packages/
    contracts/
      chat.ts
      permissions.ts
      wallet.ts
      execution.ts
  server/
    index.ts
    integrations/
      arc/
        arcClient.ts
        arcClient.test.ts
      circle/
        circleClient.ts
      anthropic/
        claudeClient.ts
    modules/
      auth/
        authService.ts
        sessionService.ts
        types.ts
        repository.ts
      orchestrator/
        orchestrationService.ts
        types.ts
        repository.ts
      execution/
        executionService.ts
        types.ts
        repository.ts
      permission/
        permissionService.ts
        dto/
          permissionCardDto.ts
        validators/
          permissionCardValidator.ts
      agent-wallet/
        walletService.ts
      audit/
        auditService.ts
      content/
        contentService.ts
    routes/
      chat.ts
      wallet.ts
      permissions.ts
      content.ts
      health.ts
      health.test.ts
    shared/
      constants/
      errors/
        index.ts
      types/
        index.ts
      utils/
        index.ts
  src/
    integrations/
      arc.test.ts
    routes/
      health.test.ts
```

## 2. Module responsibilities

### Server bootstrap

- server/index.ts
- Starts the Fastify application.
- Registers request hooks for CORS-style headers.
- Registers the HTTP routes for health, chat, wallet, permissions, and content.

### HTTP routes

- server/routes/chat.ts
  - Validates the chat request body.
  - Delegates chat handling to the orchestrator module.

- server/routes/wallet.ts
  - Validates wallet creation/import/balance requests.
  - Delegates to the agent-wallet module.

- server/routes/permissions.ts
  - Validates permission-card and transaction-confirmation input.
  - Delegates to the permission module and the execution module.

- server/routes/content.ts
  - Delegates news and dApp requests to the content module.

- server/routes/health.ts
  - Exposes a simple health endpoint.

### Modules

- server/modules/orchestrator/orchestrationService.ts
  - Receives chat text.
  - Detects simple intents such as swap, transfer, and balance.
  - Returns a structured response with an intent and optional confirmation payload.

- server/modules/agent-wallet/walletService.ts
  - Provides the current implementation shape for wallet operations.
  - Creates/imports placeholder wallet responses.
  - Calls the Arc integration to fetch a balance.

- server/modules/permission/permissionService.ts
  - Stores permission-card records in memory.
  - Supports listing cards, creating cards, and revoking cards.

- server/modules/execution/executionService.ts
  - Builds a simple execution confirmation response.
  - Produces a quote-like payload for swap or transfer actions.

- server/modules/auth/authService.ts
  - Defines a placeholder authentication service that returns a basic valid/anonymous result.

- server/modules/auth/sessionService.ts
  - Defines a placeholder session service that returns a placeholder session id.

- server/modules/audit/auditService.ts
  - Provides a minimal audit entry store and list method.

- server/modules/content/contentService.ts
  - Returns static placeholder news and dApp content.

### Integrations

- server/integrations/arc/arcClient.ts
  - Provides Arc Testnet configuration and balance helpers.
  - Uses viem for parsing, formatting, and balance fetching.

- server/integrations/circle/circleClient.ts
  - Placeholder integration stub.

- server/integrations/anthropic/claudeClient.ts
  - Placeholder integration stub.

### Shared layer

- server/shared/types/index.ts
  - Defines shared error-shape types.

- server/shared/errors/index.ts
  - Defines a simple AppError class.

- server/shared/utils/index.ts
  - Defines a small string utility helper.

### Contracts package

- packages/contracts/chat.ts
- packages/contracts/permissions.ts
- packages/contracts/wallet.ts
- packages/contracts/execution.ts

These files define shared TypeScript contracts for chat, permissions, wallet, and execution payloads.

## 3. Request flow

1. A request reaches the Fastify bootstrap in server/index.ts.
2. The request is routed to the appropriate route handler in server/routes.
3. Each route validates input using Zod schemas.
4. The route delegates to a module service under server/modules.
5. The module service performs the current implementation-specific behavior.
6. The response is returned to the client.

### Example: chat request

- POST /api/chat
- server/routes/chat.ts validates the request body.
- The route creates OrchestrationService and calls handleChat(message).
- The orchestrator returns a simple structured response.

### Example: permissions request

- GET /api/permissions or POST /api/permissions
- server/routes/permissions.ts delegates to PermissionService.
- POST /api/transactions/confirm delegates to ExecutionService.

## 4. Dependency rules

The current implementation follows a simple dependency structure:

- Routes depend on modules.
- Modules may depend on integrations.
- Modules may depend on shared types/errors/utils.
- The server bootstrap wires routes together.

The current implementation does not use a dependency injection container. Services are created directly inside routes.

### Current direction of dependencies

- Routes -> Modules
- Modules -> Integrations (where relevant)
- Modules -> Shared helpers/types
- Bootstrap -> Routes

## 5. Integration boundaries

The backend keeps external-system logic in the integrations tree.

### Current integrations

- Arc integration is used by the agent-wallet service for balance lookup.
- Circle and Anthropic integrations are present as placeholders only.

### Rule in practice

- Routes should not contain external provider logic.
- Modules may call the integration client layer.
- Integration clients are the only location that currently knows about provider-specific implementation details.

## 6. Naming conventions

The current implementation uses the following conventions:

- Files are named in camelCase, using the feature name as the primary identifier.
- Service files end in Service.ts where they implement a service class.
- Route files use the feature name, for example chat.ts, wallet.ts, permissions.ts.
- Module folders use lowercase names, often with hyphens for multi-word concepts such as agent-wallet.
- Shared contracts live in the packages/contracts folder.
- Shared runtime helpers live under server/shared.

## 7. Extension guidelines

The current codebase is intentionally simple. New functionality should follow these rules:

1. Keep HTTP concerns in routes.
2. Keep business logic in modules.
3. Keep provider-specific code in integrations.
4. Keep shared contracts in packages/contracts.
5. Keep cross-cutting helpers in server/shared.
6. Add placeholders for new modules before adding production logic.

## 8. Modules intentionally left as placeholders

The following modules exist but are not implemented beyond placeholder behavior:

- server/modules/auth/authService.ts
- server/modules/auth/sessionService.ts
- server/modules/agent-wallet/walletService.ts
- server/modules/audit/auditService.ts
- server/modules/content/contentService.ts
- server/modules/execution/executionService.ts
- server/integrations/circle/circleClient.ts
- server/integrations/anthropic/claudeClient.ts

These files provide structural boundaries and basic placeholder behavior only. They do not implement full authentication, persistence, real wallet operations, or external provider integration.

## 9. Future implementation phases

The current codebase does not implement persistence, real authentication, Circle integration, or full agent-wallet functionality. The existing structure is therefore a scaffold for future phases.

The likely next phases, based on the current code, are:

1. Replace placeholder module behavior with actual business logic.
2. Introduce persistence-backed repositories for permission cards, audit entries, and other state.
3. Implement real authentication and session handling.
4. Replace placeholder integration clients with real provider integrations.
5. Expand the orchestrator into a richer chat-capable workflow.

## 10. Current implementation constraints

The current backend implementation is intentionally limited to:

- Basic HTTP routing
- Simple module-based orchestration
- Placeholder permission-card handling
- Placeholder wallet and balance flow
- Placeholder content responses
- Placeholder integration boundaries

No real persistence, authentication, Circle integration, or Agent Wallet signing is implemented in the current codebase.
