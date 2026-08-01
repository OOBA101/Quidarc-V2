import { db } from '../../db/client.js';
import { waitlistEntries } from '../../db/schema.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Migrated from flat-file JSON to Postgres, for the same reason everything
 * else lives here now: no more `process.cwd()` path fragility, no more
 * missing-file crash on a fresh clone, and — the one flat-file JSON genuinely
 * couldn't fix cheaply — no more race condition between concurrent signups.
 * A unique constraint on `email` (see the migration) does what manual
 * duplicate-checking in application code can't guarantee under concurrency.
 */
export class WaitlistService {
  async join(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      await db.insert(waitlistEntries).values({ email });
    } catch (error) {
      // Postgres error code 23505 = unique_violation. This is what actually
      // closes the race condition — two concurrent signups for the same email
      // can both pass a pre-check select, but only one INSERT can win against
      // the unique constraint. The other lands here, not as a crash.
      //
      // Drizzle wraps the underlying pg error rather than exposing .code
      // directly — the real Postgres error code lives at error.cause.code.
      // Verified against a live duplicate-insert; error.code itself is
      // undefined on Drizzle's wrapper, which is what let a raw SQL error
      // leak to the client before this fix.
      const pgCode = (error as { cause?: { code?: string } }).cause?.code;
      if (pgCode === '23505') {
        throw new Error('Email already joined the waitlist.');
      }
      throw error;
    }

    console.log('New waitlist signup:', email);

    return {
      success: true,
      message: 'Successfully joined the waitlist.',
    };
  }

  async count() {
    const rows = await db.select().from(waitlistEntries);
    return rows.length;
  }
}
