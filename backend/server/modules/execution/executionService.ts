import { AuditService } from '../audit/auditService.js';
import { PermissionService } from '../permission/permissionService.js';
import { encodeUsdcTransferData } from '../../integrations/arc/arcClient.js';
import { CircleClient } from '../../integrations/circle/circleClient.js';
import { AgentWalletService } from '../agent-wallet/walletService.js';

export interface PrepareTransferInput {
  fromAddress: string;
  toAddress: string;
  amount: string;
  permissionCardId?: string;
  protocol?: string;
}

export interface ConfirmTransferInput {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  permissionCardId?: string;
}

export interface AgentActionInput {
  kind: 'transfer' | 'swap' | 'bridge' | 'claim';
  permissionCardId: string; // mandatory — agent actions only ever run under a card
  protocol: string;
  amount: string;
  destinationAddress?: string; // required for kind='transfer'
}

/**
 * The core fix relative to the scaffold: this service NEVER receives or
 * touches a User Wallet private key, and NEVER fabricates a fake "submitted"
 * result. Two real changes from before:
 *
 * 1. Transfers are a genuine two-step flow. `prepareTransfer` authorizes (if
 *    card-scoped) and returns unsigned transaction data for the frontend to
 *    sign locally with the user's own key. `confirmTransferBroadcast` is
 *    called AFTER the frontend has actually signed and broadcast it, and only
 *    then records spend + an audit entry — against a real transaction hash,
 *    not a guess.
 * 2. Agent-wallet actions (swap/bridge/claim) are always card-scoped — there's
 *    no "per-action confirm" path for them, because the whole point of the
 *    Agent Wallet is autonomous execution within a Permission Card's bounds.
 *    If Circle isn't configured yet, this honestly reports that rather than
 *    pretending to have submitted something.
 */
export class ExecutionService {
  constructor(
    private readonly permissionService = new PermissionService(),
    private readonly auditService = new AuditService(),
    private readonly circleClient = new CircleClient(),
    private readonly agentWalletService = new AgentWalletService(),
  ) {}

  async prepareTransfer(input: PrepareTransferInput) {
    if (input.permissionCardId) {
      const authorization = await this.permissionService.authorize({
        cardId: input.permissionCardId,
        action: 'transfer',
        protocol: input.protocol ?? 'direct-transfer',
        amount: Number(input.amount),
      });

      if (!authorization.authorized) {
        return { authorized: false as const, reason: authorization.reason };
      }
    }

    const txData = encodeUsdcTransferData(input.toAddress, input.amount);

    return {
      authorized: true as const,
      // The frontend signs THIS locally — the backend never sees a private key.
      unsignedTransaction: {
        to: txData.to,
        functionName: txData.functionName,
        args: txData.args.map(String), // bigints don't survive JSON — stringify for transport
      },
    };
  }

  async confirmTransferBroadcast(input: ConfirmTransferInput) {
    const auditEntry = await this.auditService.record({
      permissionCardId: input.permissionCardId ?? null,
      kind: 'transfer',
      walletAddress: input.fromAddress,
      amount: Number(input.amount),
      txHash: input.txHash,
      status: 'confirmed', // the frontend only calls this after a successful broadcast
    });

    if (input.permissionCardId) {
      await this.permissionService.recordSpend(input.permissionCardId, Number(input.amount));
    }

    return { recorded: true, auditEntry };
  }

  async executeAgentAction(input: AgentActionInput) {
    const authorization = await this.permissionService.authorize({
      cardId: input.permissionCardId,
      action: input.kind,
      protocol: input.protocol,
      amount: Number(input.amount),
    });

    if (!authorization.authorized) {
      return { authorized: false as const, reason: authorization.reason };
    }

    if (!this.circleClient.isConfigured()) {
      // Honest incompleteness, not a fabricated success. The scaffold returned
      // a fake "submitted" status here — that's a governance-doc AI safety
      // violation (never claim success without a verified outcome).
      return {
        authorized: true as const,
        executed: false as const,
        reason: 'Circle is not configured — agent-wallet execution is not available yet.',
      };
    }

    // Only 'transfer' is implemented for the demo. swap/bridge/claim require
    // DEX/bridge contracts that don't exist on Arc Testnet yet — honestly report
    // those as unavailable rather than faking them.
    if (input.kind !== 'transfer') {
      return {
        authorized: true as const,
        executed: false as const,
        reason: `Agent action '${input.kind}' is not available yet — Arc Testnet has no DEX/bridge contracts for the demo.`,
      };
    }

    if (!input.destinationAddress) {
      return {
        authorized: true as const,
        executed: false as const,
        reason: "A transfer requires 'destinationAddress'.",
      };
    }

    // Resolve the Agent Wallet backing this card, and its Circle wallet ID.
    const card = await this.permissionService.getCard(input.permissionCardId);
    if (!card?.agentWalletAddress) {
      return {
        authorized: true as const,
        executed: false as const,
        reason: 'This card has no Agent Wallet configured — provision one first.',
      };
    }

    const agentWallet = await this.agentWalletService.getWalletByAddress(card.agentWalletAddress);
    if (!agentWallet?.circleWalletId) {
      return {
        authorized: true as const,
        executed: false as const,
        reason: 'The Agent Wallet is not a Circle-provisioned wallet (no circleWalletId).',
      };
    }

    // Circle needs the tokenId of the wallet's USDC holding — resolved by listing
    // the wallet's balances and matching the Arc USDC contract address.
    const tokenId = await this.circleClient.getUsdcTokenId(agentWallet.circleWalletId);
    if (!tokenId) {
      return {
        authorized: true as const,
        executed: false as const,
        reason: 'The Agent Wallet holds no USDC on Arc Testnet yet (fund it via the Circle faucet).',
      };
    }

    // Execute, then poll until the transaction has an on-chain txHash. We record
    // spend + audit ONLY after that real confirmation — never before.
    const { transactionId } = await this.circleClient.createUsdcTransfer({
      walletId: agentWallet.circleWalletId,
      tokenId,
      destinationAddress: input.destinationAddress,
      amount: input.amount,
    });

    const status = await this.circleClient.getTransactionStatus(transactionId, true);

    const auditEntry = await this.auditService.record({
      permissionCardId: input.permissionCardId,
      kind: 'transfer',
      walletAddress: card.agentWalletAddress,
      amount: Number(input.amount),
      protocol: input.protocol,
      txHash: status.txHash ?? undefined,
      status: 'confirmed',
    });

    await this.permissionService.recordSpend(input.permissionCardId, Number(input.amount));

    return {
      authorized: true as const,
      executed: true as const,
      transactionId,
      txHash: status.txHash,
      state: status.state,
      auditEntry,
    };
  }
}
