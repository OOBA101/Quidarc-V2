import { ClaudeClient } from '../../integrations/anthropic/claudeClient.js';

interface HandleChatContext {
  walletAddress?: string;
}

/**
 * Orchestrates chat requests through Claude for intent classification and
 * parameter extraction. This replaced the naive keyword-matcher — the AI now
 * understands ambiguity and extracts structured parameters — but the response
 * contract ({ reply, intent, confirmation }) is unchanged so the frontend flow
 * (chat → confirmation → user approves → execute) still works as before.
 *
 * The AI is an intent recommender, NOT an executor. It proposes a `confirmation`
 * object; the user confirms in the UI; execution then runs through the existing
 * /execution/agent-action path under Permission Card authorization.
 */
export class OrchestrationService {
  constructor(private readonly claudeClient = new ClaudeClient()) {}

  async handleChat(message: string, context?: HandleChatContext) {
    const result = await this.claudeClient.classifyIntent(message, context);

    // Build the confirmation object the frontend uses to trigger an action.
    // Only executable intents (transfer, swap) produce a confirmation; balance
    // and general do not. Swap is classified but honestly unavailable downstream.
    let confirmation: { kind: string; summary: string; parameters?: unknown } | null = null;
    if (result.intent === 'transfer' || result.intent === 'swap') {
      confirmation = {
        kind: result.intent,
        summary: message,
        parameters: result.parameters,
      };
    }

    return {
      reply: result.reply,
      intent: result.intent,
      confirmation,
    };
  }
}
