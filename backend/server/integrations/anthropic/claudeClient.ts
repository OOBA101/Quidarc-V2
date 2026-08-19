import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages.mjs';
import { env } from '../../config/env.js';
import { AgentWalletService } from '../../modules/agent-wallet/walletService.js';
import { PermissionService } from '../../modules/permission/permissionService.js';
import { ContentService } from '../../modules/content/contentService.js';

interface IntentClassificationContext {
  walletAddress?: string;
}

interface IntentClassificationResult {
  intent: 'balance' | 'transfer' | 'swap' | 'bridge' | 'claim' | 'general';
  reply: string;
  parameters?: {
    amount?: string;
    destinationAddress?: string;
    protocol?: string;
  };
}

/**
 * Anthropic Claude integration for intent classification and parameter extraction.
 * Uses Messages API (not Agent SDK) — the AI proposes structured actions, user
 * confirms via the existing frontend flow, and execution stays behind Permission
 * Card authorization. The AI is an intent recommender, not an autonomous executor.
 */
export class ClaudeClient {
  private client: Anthropic | null = null;
  private readonly walletService = new AgentWalletService();
  private readonly permissionService = new PermissionService();
  private readonly contentService = new ContentService();

  constructor() {
    if (this.isConfigured()) {
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
  }

  isConfigured() {
    return Boolean(env.ANTHROPIC_API_KEY.trim());
  }

  async getStatus() {
    return {
      provider: 'anthropic',
      status: this.isConfigured() ? 'configured' : 'not_configured',
      mock: !this.isConfigured(),
    };
  }

  /**
   * Classifies user intent and extracts parameters using Claude Messages API.
   * Read-only tools (getBalance, listPermissionCards) give the AI real context
   * to answer balance/card questions without fabricating. Execution tools are
   * NOT exposed — the AI proposes, the user confirms, executeAgentAction runs
   * under Permission Card authorization afterward.
   */
  async classifyIntent(
    message: string,
    context?: IntentClassificationContext,
  ): Promise<IntentClassificationResult> {
    if (!this.isConfigured()) {
      return {
        intent: 'general',
        reply: 'I can help with balance checks, swaps, transfers, and Arc ecosystem discovery.',
      };
    }

    const tools: Tool[] = [
      {
        name: 'getBalance',
        description: 'Get the USDC balance of a wallet address on Arc Testnet.',
        input_schema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The wallet address (0x...)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'listPermissionCards',
        description: 'List active Permission Cards owned by a wallet address.',
        input_schema: {
          type: 'object',
          properties: {
            ownerWallet: {
              type: 'string',
              description: 'The owner wallet address',
            },
          },
          required: ['ownerWallet'],
        },
      },
      {
        name: 'getArcEcosystemInfo',
        description:
          'Get real, current Arc ecosystem news and a directory of dApps/platforms (trading, lending, yield) available on Arc. Use this whenever the user asks about Arc news, what dApps exist, or where to trade, lend, or earn yield on Arc.',
        input_schema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              enum: ['news', 'dapps', 'both'],
              description: 'Which kind of ecosystem info to retrieve.',
            },
          },
          required: ['topic'],
        },
      },
    ];

    const systemPrompt = `You are Quidarc AI Assistant, an intent classifier and parameter extractor for a non-custodial wallet on Arc Testnet (EVM-compatible, USDC-native chain).

Your job: classify user intent into one of these categories and extract relevant parameters:
- balance: user asks about their USDC balance
- transfer: user wants to send USDC to another address
- swap: user wants to swap tokens (currently unavailable on Arc Testnet demo)
- bridge: user wants to bridge assets (currently unavailable)
- claim: user wants to claim rewards (currently unavailable)
- general: greeting, question, or off-topic

Parameter extraction (for transfer intent):
- amount: numeric USDC amount in decimal format (e.g. "10.5")
- destinationAddress: recipient 0x address (42 chars starting with 0x)
- protocol: if mentioned (e.g. "uniswap", "direct-transfer")

If the user's transfer request is ambiguous (no amount, or "send to Alice" without an address), ask for clarification in your reply rather than guessing.

Use the read-only tools (getBalance, listPermissionCards, getArcEcosystemInfo) when the user asks about their balance, their cards, or what's happening on Arc — news, dApps, or where to trade/lend/earn yield. Never invent ecosystem news, dApp names, or links; only state what getArcEcosystemInfo actually returns, and if it doesn't cover what the user asked, say so rather than guessing. You cannot execute transfers directly — you propose the structured intent, the user confirms, and the backend executes under Permission Card authorization.

Keep replies concise, friendly, and production-fintech-appropriate.`;

    const messages: MessageParam[] = [{ role: 'user', content: message }];

    let response = await this.client!.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools,
    });

    // Bounded tool-use loop: allow up to 3 tool calls (balance + cards reads).
    let toolUseCount = 0;
    const maxToolUses = 3;

    while (response.stop_reason === 'tool_use' && toolUseCount < maxToolUses) {
      const toolUseBlock = response.content.find((block) => block.type === 'tool_use');
      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break;

      toolUseCount++;

      const toolResult = await this.executeTool(
        toolUseBlock.name,
        toolUseBlock.input as Record<string, unknown>,
        context,
      );

      messages.push(
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      );

      response = await this.client!.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    // Extract the final text reply and intent from the assistant's response.
    const textBlock = response.content.find((block) => block.type === 'text');
    const reply = textBlock && textBlock.type === 'text' ? textBlock.text : 'Request processed.';

    // Classify intent from the reply heuristically (the AI's reply hints at the intent).
    const normalized = reply.toLowerCase();
    let intent: IntentClassificationResult['intent'] = 'general';
    if (normalized.includes('balance') || normalized.includes('usdc')) intent = 'balance';
    else if (normalized.includes('transfer') || normalized.includes('send')) intent = 'transfer';
    else if (normalized.includes('swap')) intent = 'swap';
    else if (normalized.includes('bridge')) intent = 'bridge';
    else if (normalized.includes('claim')) intent = 'claim';

    // Extract parameters from the message heuristically (the AI doesn't return structured output yet).
    const parameters: IntentClassificationResult['parameters'] = {};
    if (intent === 'transfer') {
      const amountMatch = message.match(/\b(\d+(?:\.\d+)?)\s*(?:usdc)?\b/i);
      if (amountMatch) parameters.amount = amountMatch[1];

      const addressMatch = message.match(/\b(0x[a-fA-F0-9]{40})\b/);
      if (addressMatch) parameters.destinationAddress = addressMatch[1];

      if (message.toLowerCase().includes('uniswap')) parameters.protocol = 'uniswap';
      else parameters.protocol = 'direct-transfer';
    }

    return { intent, reply, parameters };
  }

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    context?: IntentClassificationContext,
  ): Promise<unknown> {
    if (name === 'getBalance') {
      const address = input.address as string;
      return this.walletService.getBalance(address);
    }

    if (name === 'listPermissionCards') {
      const ownerWallet = (input.ownerWallet as string) || context?.walletAddress;
      if (!ownerWallet) {
        return { error: 'No wallet address provided.' };
      }
      return this.permissionService.listCards(ownerWallet);
    }

    if (name === 'getArcEcosystemInfo') {
      const topic = (input.topic as string) || 'both';
      const result: Record<string, unknown> = {};
      if (topic === 'news' || topic === 'both') result.news = await this.contentService.listNews();
      if (topic === 'dapps' || topic === 'both') result.dapps = this.contentService.listDApps();
      return result;
    }

    return { error: `Unknown tool: ${name}` };
  }
}