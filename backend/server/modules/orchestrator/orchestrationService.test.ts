import { describe, expect, it, vi } from 'vitest';
import { OrchestrationService } from './orchestrationService.js';
import type { ClaudeClient } from '../../integrations/anthropic/claudeClient.js';

/**
 * The orchestrator's job is a stable frontend contract: { reply, intent,
 * confirmation }. A confirmation object must appear ONLY for executable intents
 * (transfer, swap) — never for balance/general — because the frontend uses it
 * to trigger the confirm→execute flow. These tests lock that contract down with
 * an injected ClaudeClient fake (no live Anthropic API).
 */
function makeService(classifyResult: {
  intent: string;
  reply: string;
  parameters?: unknown;
}) {
  const claudeClient = {
    classifyIntent: vi.fn().mockResolvedValue(classifyResult),
  } as unknown as ClaudeClient;

  return new OrchestrationService(claudeClient);
}

describe('OrchestrationService.handleChat — confirmation contract', () => {
  it('produces a confirmation for a transfer intent', async () => {
    const service = makeService({
      intent: 'transfer',
      reply: 'Ready to send 10 USDC.',
      parameters: { amount: '10', destinationAddress: '0xabc' },
    });

    const result = await service.handleChat('send 10 usdc to 0xabc');

    expect(result.intent).toBe('transfer');
    expect(result.confirmation).toMatchObject({
      kind: 'transfer',
      parameters: { amount: '10', destinationAddress: '0xabc' },
    });
  });

  it('produces a confirmation for a swap intent', async () => {
    const service = makeService({ intent: 'swap', reply: 'Swap requested.' });

    const result = await service.handleChat('swap tokens');

    expect(result.confirmation).toMatchObject({ kind: 'swap' });
  });

  it('does NOT produce a confirmation for a balance intent', async () => {
    const service = makeService({ intent: 'balance', reply: 'Your balance is 42 USDC.' });

    const result = await service.handleChat('what is my balance');

    expect(result.intent).toBe('balance');
    expect(result.confirmation).toBeNull();
  });

  it('does NOT produce a confirmation for a general intent', async () => {
    const service = makeService({ intent: 'general', reply: 'Hello!' });

    const result = await service.handleChat('hi');

    expect(result.confirmation).toBeNull();
  });

  it('passes the reply through unchanged', async () => {
    const service = makeService({ intent: 'general', reply: 'A specific reply.' });

    const result = await service.handleChat('anything');

    expect(result.reply).toBe('A specific reply.');
  });
});
