import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { auditLog } from '../../db/schema.js';

export interface AuditEntryInput {
  permissionCardId?: string | null;
  kind: 'swap' | 'transfer' | 'bridge' | 'claim';
  walletAddress: string;
  amount?: number;
  protocol?: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Real persistence, replacing the in-memory array. Every agent-executed action
 * should produce exactly one row here — which card authorized it (or null), the
 * on-chain-verified outcome, and the tx hash once confirmed. This is the data
 * the user-facing activity feed reads from directly.
 */
export class AuditService {
  async record(entry: AuditEntryInput) {
    const [row] = await db
      .insert(auditLog)
      .values({
        permissionCardId: entry.permissionCardId ?? null,
        kind: entry.kind,
        walletAddress: entry.walletAddress,
        amount: entry.amount?.toFixed(6),
        protocol: entry.protocol,
        txHash: entry.txHash,
        status: entry.status,
      })
      .returning();

    return row;
  }

  async updateStatus(id: string, status: 'confirmed' | 'failed', txHash?: string) {
    const [row] = await db
      .update(auditLog)
      .set({ status, ...(txHash ? { txHash } : {}) })
      .where(eq(auditLog.id, id))
      .returning();

    return row;
  }

  async list(walletAddress?: string) {
    const rows = walletAddress
      ? await db
          .select()
          .from(auditLog)
          .where(eq(auditLog.walletAddress, walletAddress))
          .orderBy(desc(auditLog.createdAt))
      : await db.select().from(auditLog).orderBy(desc(auditLog.createdAt));

    return { entries: rows };
  }
}
