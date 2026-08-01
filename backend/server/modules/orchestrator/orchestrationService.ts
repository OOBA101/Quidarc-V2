export class OrchestrationService {
  async handleChat(message: string) {
    const normalized = message.toLowerCase();

    if (normalized.includes('swap')) {
      return {
        reply: 'Swap intent detected. Routed through the orchestrator boundary.',
        intent: 'swap',
        confirmation: { kind: 'swap', summary: message },
      };
    }

    if (normalized.includes('transfer')) {
      return {
        reply: 'Transfer intent detected. Routed through the orchestrator boundary.',
        intent: 'transfer',
        confirmation: { kind: 'transfer', summary: message },
      };
    }

    if (normalized.includes('balance')) {
      return {
        reply: 'Balance request received. Routed through the orchestrator boundary.',
        intent: 'balance',
        confirmation: null,
      };
    }

    return {
      reply: 'I can help with balance checks, swaps, transfers, and Arc ecosystem discovery.',
      intent: 'general',
      confirmation: null,
    };
  }
}
