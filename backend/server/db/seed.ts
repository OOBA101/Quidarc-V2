import { pool } from './client.js';

export async function runSeed() {
  console.log('🌱 Seeding PostgreSQL database with demo data...');

  const client = await pool.connect();
  try {
    // Seed waitlist entry test
    await client.query(`
      INSERT INTO waitlist_entries (email)
      VALUES ('demo@quidarc.app')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Seed sample permission card for testing. permission_cards.id is a random
    // uuid, so ON CONFLICT never fires — guard on (name, owner_wallet) with
    // WHERE NOT EXISTS to keep re-running the seed idempotent.
    await client.query(`
      INSERT INTO permission_cards (name, owner_wallet, actions, protocol_allowlist, daily_spend_limit, expires_at, status)
      SELECT
        'Demo DEX Card',
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        '["swap"]'::jsonb,
        '["uniswap", "curve"]'::jsonb,
        50.000000,
        NOW() + INTERVAL '30 days',
        'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM permission_cards
        WHERE name = 'Demo DEX Card'
          AND owner_wallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      );
    `);

    console.log('✅ PostgreSQL database seeded successfully!');
  } catch (error) {
    console.error('❌ Database seed error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  runSeed();
}
