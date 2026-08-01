import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { permissionCards, spendRecords } from '../../db/schema.js';

export type PermissionAction = 'swap' | 'transfer' | 'bridge' | 'claim';

export interface PermissionCardInput {
  name: string;
  ownerWallet: string;
  agentWalletAddress?: string;
  actions: PermissionAction[];
  dailySpendLimit: number;
  protocolAllowlist: string[];
  expiresAt: string; // ISO 8601 — mandatory, per the governance doc's "no indefinite cards" rule
}

export interface AuthorizationRequest {
  cardId: string;
  action: PermissionAction;
  protocol: string;
  amount: number;
}

export type AuthorizationResult =
  | { authorized: true; cardId: string; remainingLimit: number }
  | { authorized: false; reason: string };

/**
 * Real persistence (Postgres via Drizzle) and real fail-closed enforcement,
 * replacing the in-memory array + no-enforcement placeholder.
 *
 * Fail-closed means exactly this: every branch in `authorize()` that can't
 * positively confirm the request is in scope returns `authorized: false`. There
 * is no default-allow path. If you add a new check here later, make sure it can
 * only narrow authorization, never widen it by falling through to an implicit yes.
 */
export class PermissionService {
  async listCards(ownerWallet?: string) {
    const rows = ownerWallet
      ? await db.select().from(permissionCards).where(eq(permissionCards.ownerWallet, ownerWallet))
      : await db.select().from(permissionCards);

    return { cards: rows };
  }

  async createCard(input: PermissionCardInput) {
    const [card] = await db
      .insert(permissionCards)
      .values({
        name: input.name,
        ownerWallet: input.ownerWallet,
        agentWalletAddress: input.agentWalletAddress,
        actions: input.actions,
        protocolAllowlist: input.protocolAllowlist,
        dailySpendLimit: input.dailySpendLimit.toFixed(6),
        expiresAt: new Date(input.expiresAt),
        status: 'active',
      })
      .returning();

    return { card };
  }

  async revokeCard(id: string) {
    const [card] = await db
      .update(permissionCards)
      .set({ status: 'revoked' })
      .where(eq(permissionCards.id, id))
      .returning();

    if (!card) {
      return { error: 'Permission card not found.' };
    }

    return { card };
  }

  /**
   * The enforcement check. Called by the Execution Engine before constructing
   * any transaction from a card-scoped request — never trust the frontend's
   * view of a card's status, always re-verify here against the database.
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const [card] = await db
      .select()
      .from(permissionCards)
      .where(eq(permissionCards.id, request.cardId));

    if (!card) {
      return { authorized: false, reason: 'Permission card not found.' };
    }

    if (card.status !== 'active') {
      return { authorized: false, reason: `Permission card is ${card.status}, not active.` };
    }

    if (new Date(card.expiresAt) <= new Date()) {
      await db.update(permissionCards).set({ status: 'expired' }).where(eq(permissionCards.id, card.id));
      return { authorized: false, reason: 'Permission card has expired.' };
    }

    const allowedActions = card.actions as PermissionAction[];
    if (!allowedActions.includes(request.action)) {
      return { authorized: false, reason: `Card does not permit '${request.action}'.` };
    }

    const allowlist = card.protocolAllowlist as string[];
    if (!allowlist.includes(request.protocol)) {
      return { authorized: false, reason: `Protocol '${request.protocol}' is not on this card's allowlist.` };
    }

    // Rolling 24h spend window — sum actual recorded spend, don't trust a mutable counter.
    const [{ total }] = await db
      .select({ total: sql<string>`coalesce(sum(${spendRecords.amount}), 0)` })
      .from(spendRecords)
      .where(
        and(
          eq(spendRecords.permissionCardId, card.id),
          gte(spendRecords.executedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
        ),
      );

    const spentSoFar = Number(total);
    const limit = Number(card.dailySpendLimit);
    const remaining = limit - spentSoFar;

    if (request.amount > remaining) {
      return {
        authorized: false,
        reason: `Amount ${request.amount} exceeds remaining rolling-24h limit of ${remaining.toFixed(6)}.`,
      };
    }

    return { authorized: true, cardId: card.id, remainingLimit: remaining - request.amount };
  }

  async recordSpend(cardId: string, amount: number) {
    await db.insert(spendRecords).values({ permissionCardId: cardId, amount: amount.toFixed(6) });
  }
}
