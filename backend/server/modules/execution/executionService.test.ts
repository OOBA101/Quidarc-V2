import { describe, expect, it, vi } from 'vitest';
import { ExecutionService } from './executionService.js';
import type { PermissionService } from '../permission/permissionService.js';
import type { AuditService } from '../audit/auditService.js';
import type { CircleClient } from '../../integrations/circle/circleClient.js';
import type { AgentWalletService } from '../agent-wallet/walletService.js';

/**
 * These are the governance-critical paths: executeAgentAction must NEVER
 * fabricate a submitted result, and must NEVER execute an action the
 * Permission Card didn't authorize. Every branch is exercised here with
 * injected fakes (no live Postgres / Circle) so the safety guarantees are
 * locked down before the demo.
 */

// Minimal fakes shaped to the constructor's injectable dependencies. Casting
// through `unknown` keeps TS strict happy without pulling in the DB layer.
function makeService(overrides: {
  authorized?: boolean;
  reason?: string;
  circleConfigured?: boolean;
  card?: { agentWalletAddress?: string | null } | null;
  agentWallet?: { circleWalletId?: string | null } | null;
  tokenId?: string | null;
}) {
  const permissionService = {
    authorize: vi.fn().mockResolvedValue(
      overrides.authorized === false
        ? { authorized: false, reason: overrides.reason ?? 'denied' }
        : { authorized: true, cardId: 'card-1', remainingLimit: 100 },
    ),
    getCard: vi.fn().mockResolvedValue(
      overrides.card === undefined ? { agentWalletAddress: '0xagent' } : overrides.card,
    ),
    recordSpend: vi.fn().mockResolvedValue(undefined),
  } as unknown as PermissionService;

  const auditService = {
    record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
  } as unknown as AuditService;

  const circleClient = {
    isConfigured: vi.fn().mockReturnValue(overrides.circleConfigured ?? false),
    getUsdcTokenId: vi.fn().mockResolvedValue(
      overrides.tokenId === undefined ? 'token-usdc' : overrides.tokenId,
    ),
    createUsdcTransfer: vi.fn().mockResolvedValue({ transactionId: 'tx-1' }),
    getTransactionStatus: vi.fn().mockResolvedValue({
      id: 'tx-1',
      state: 'CONFIRMED',
      txHash: '0xdeadbeef',
    }),
  } as unknown as CircleClient;

  const agentWalletService = {
    getWalletByAddress: vi.fn().mockResolvedValue(
      overrides.agentWallet === undefined ? { circleWalletId: 'cw-1' } : overrides.agentWallet,
    ),
  } as unknown as AgentWalletService;

  const service = new ExecutionService(
    permissionService,
    auditService,
    circleClient,
    agentWalletService,
  );

  return { service, permissionService, auditService, circleClient, agentWalletService };
}

const baseInput = {
  kind: 'transfer' as const,
  permissionCardId: 'card-1',
  protocol: 'direct-transfer',
  amount: '10',
  destinationAddress: '0x1234567890123456789012345678901234567890',
};

describe('ExecutionService.executeAgentAction — fail-closed authorization', () => {
  it('does not execute when the card denies authorization', async () => {
    const { service, circleClient } = makeService({ authorized: false, reason: 'over limit' });

    const result = await service.executeAgentAction(baseInput);

    expect(result).toEqual({ authorized: false, reason: 'over limit' });
    // Never reaches Circle when unauthorized.
    expect(circleClient.isConfigured).not.toHaveBeenCalled();
  });
});

describe('ExecutionService.executeAgentAction — honest incompleteness (never fabricate success)', () => {
  it('reports Circle-not-configured honestly instead of faking a submit', async () => {
    const { service, circleClient } = makeService({ circleConfigured: false });

    const result = await service.executeAgentAction(baseInput);

    expect(result.authorized).toBe(true);
    expect(result).toMatchObject({ executed: false });
    expect((result as { reason: string }).reason).toContain('Circle is not configured');
    expect(circleClient.createUsdcTransfer).not.toHaveBeenCalled();
  });

  it('reports swap/bridge/claim as unavailable rather than executing', async () => {
    const { service, circleClient } = makeService({ circleConfigured: true });

    const result = await service.executeAgentAction({ ...baseInput, kind: 'swap' });

    expect(result).toMatchObject({ authorized: true, executed: false });
    expect(circleClient.createUsdcTransfer).not.toHaveBeenCalled();
  });

  it('requires a destinationAddress for a transfer', async () => {
    const { service } = makeService({ circleConfigured: true });

    const result = await service.executeAgentAction({ ...baseInput, destinationAddress: undefined });

    expect(result).toMatchObject({ authorized: true, executed: false });
    expect((result as { reason: string }).reason).toContain('destinationAddress');
  });

  it('reports when the card has no Agent Wallet configured', async () => {
    const { service } = makeService({ circleConfigured: true, card: { agentWalletAddress: null } });

    const result = await service.executeAgentAction(baseInput);

    expect(result).toMatchObject({ authorized: true, executed: false });
    expect((result as { reason: string }).reason).toContain('no Agent Wallet');
  });

  it('reports when the Agent Wallet is not Circle-provisioned', async () => {
    const { service } = makeService({ circleConfigured: true, agentWallet: { circleWalletId: null } });

    const result = await service.executeAgentAction(baseInput);

    expect(result).toMatchObject({ authorized: true, executed: false });
    expect((result as { reason: string }).reason).toContain('circleWalletId');
  });

  it('reports when the Agent Wallet holds no USDC yet', async () => {
    const { service } = makeService({ circleConfigured: true, tokenId: null });

    const result = await service.executeAgentAction(baseInput);

    expect(result).toMatchObject({ authorized: true, executed: false });
    expect((result as { reason: string }).reason).toContain('no USDC');
  });
});

describe('ExecutionService.executeAgentAction — happy path records only after real confirmation', () => {
  it('executes, then records spend + audit against the real txHash', async () => {
    const { service, circleClient, auditService, permissionService } = makeService({
      circleConfigured: true,
    });

    const result = await service.executeAgentAction(baseInput);

    expect(result).toMatchObject({
      authorized: true,
      executed: true,
      transactionId: 'tx-1',
      txHash: '0xdeadbeef',
      state: 'CONFIRMED',
    });

    // txHash is polled (waitForTxHash=true) before any recording happens.
    expect(circleClient.getTransactionStatus).toHaveBeenCalledWith('tx-1', true);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: '0xdeadbeef', status: 'confirmed' }),
    );
    expect(permissionService.recordSpend).toHaveBeenCalledWith('card-1', 10);
  });
});
