-- Initial schema for Quidarc: wallets, permission cards, spend tracking, audit
-- log, waitlist. Written by hand to match server/db/schema.ts exactly —
-- drizzle-kit's CLI hit a workspace-hoisting resolution issue in this monorepo
-- (see quidarc-repo-review.md). If you get `drizzle-kit generate` working
-- locally, diff its output against this file before trusting either as canonical.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "wallets" (
  "address" text PRIMARY KEY,
  "chain_id" integer NOT NULL,
  "is_agent_wallet" text NOT NULL DEFAULT 'false',
  "circle_wallet_id" text,
  "owner_wallet" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "permission_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "owner_wallet" text NOT NULL,
  "agent_wallet_address" text,
  "actions" jsonb NOT NULL,
  "protocol_allowlist" jsonb NOT NULL,
  "daily_spend_limit" numeric(18, 6) NOT NULL,
  "spend_window_type" text NOT NULL DEFAULT 'rolling_24h',
  "expires_at" timestamptz NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "spend_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "permission_card_id" uuid NOT NULL REFERENCES "permission_cards"("id"),
  "amount" numeric(18, 6) NOT NULL,
  "executed_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "permission_card_id" uuid REFERENCES "permission_cards"("id"),
  "kind" text NOT NULL,
  "wallet_address" text NOT NULL,
  "amount" numeric(18, 6),
  "protocol" text,
  "tx_hash" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "joined_at" timestamptz NOT NULL DEFAULT now()
);

-- Revocation must be instant, no lag (architecture doc's one hard consistency
-- requirement). This index is what keeps that check cheap at scale — it's not
-- what makes it correct; correctness comes from every write going through this
-- same table with no caching layer in front of it.
CREATE INDEX IF NOT EXISTS idx_permission_cards_owner_status ON "permission_cards" ("owner_wallet", "status");
CREATE INDEX IF NOT EXISTS idx_spend_records_card_time ON "spend_records" ("permission_card_id", "executed_at");
