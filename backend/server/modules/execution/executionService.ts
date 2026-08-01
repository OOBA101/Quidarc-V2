import { AuditService } from '../audit/auditService.js';
import { PermissionService } from '../permission/permissionService.js';
import { encodeUsdcTransferData } from '../../integrations/arc/arcClient.js';
import { CircleClient } from '../../integrations/circle/circleClient.js';

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
  kind: 'swap' | 'bridge' | 'claim';
  permissionCardId: string; // mandatory — agent actions only ever run under a card
  protocol: string;
  amount: string;
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
        reason: 'CIRCLE_API_KEY is not configured — agent-wallet execution is not available yet.',
      };
    }

    // TODO: real Circle App Kit / DEX routing call, once CircleClient's real
    // implementation exists. Record the audit entry and spend only after a
    // real on-chain result comes back — never before that.
    return {
      authorized: true as const,
      executed: false as const,
      reason: 'Circle is configured but the real execution call is not implemented yet.',
    };
  }
}
