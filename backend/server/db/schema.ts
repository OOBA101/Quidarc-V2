import { pgTable, uuid, text, integer, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * A wallet record the backend is aware of. This table NEVER stores key material.
 * - For the User Wallet, this row exists only so other tables (permission_cards,
 *   audit_log) have something to reference by address. The key itself lives only
 *   in the browser.
 * - For the Agent Wallet, `isAgentWallet` is true and `circleWalletId` references
 *   the Circle Developer-Controlled Wallet that actually holds signing authority.
 */
export const wallets = pgTable('wallets', {
  address: text('address').primaryKey(),
  chainId: integer('chain_id').notNull(),
  isAgentWallet: text('is_agent_wallet').notNull().default('false'),
  circleWalletId: text('circle_wallet_id'),
  ownerWallet: text('owner_wallet'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissionCards = pgTable('permission_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerWallet: text('owner_wallet').notNull(),
  agentWalletAddress: text('agent_wallet_address'),
  actions: jsonb('actions').notNull().$type<Array<'swap' | 'transfer' | 'bridge' | 'claim'>>(),
  protocolAllowlist: jsonb('protocol_allowlist').notNull().$type<string[]>(),
  dailySpendLimit: numeric('daily_spend_limit', { precision: 18, scale: 6 }).notNull(),
  spendWindowType: text('spend_window_type').notNull().default('rolling_24h'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().$type<'active' | 'revoked' | 'expired'>().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per executed action authorized under a card. This is what makes the
 * rolling-24h spend limit real — sum this table's amounts for a card over the
 * last 24 hours to get current usage, rather than trusting a mutable counter.
 */
export const spendRecords = pgTable('spend_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  permissionCardId: uuid('permission_card_id').notNull(),
  amount: numeric('amount', { precision: 18, scale: 6 }).notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  permissionCardId: uuid('permission_card_id'),
  kind: text('kind').notNull().$type<'swap' | 'transfer' | 'bridge' | 'claim'>(),
  walletAddress: text('wallet_address').notNull(),
  amount: numeric('amount', { precision: 18, scale: 6 }),
  protocol: text('protocol'),
  txHash: text('tx_hash'),
  status: text('status').notNull().$type<'pending' | 'confirmed' | 'failed'>().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const waitlistEntries = pgTable('waitlist_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});
