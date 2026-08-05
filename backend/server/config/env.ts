import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().optional().transform((val) => Number(val) || 3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  // Database
  DATABASE_URL: z
    .string()
    .default('postgresql://quidarc:quidarc_dev@localhost:5432/quidarc_dev'),

  // Arc Blockchain
  ARC_RPC_URL: z.string().default('https://rpc.testnet.arc.network'),
  ARC_CHAIN_ID: z.string().optional().transform((val) => Number(val) || 5042002),

  // Circle API
  CIRCLE_API_KEY: z.string().optional().default(''),

  // AI Brain
  ANTHROPIC_API_KEY: z.string().optional().default(''),

  // Security
  JWT_SECRET: z.string().default('quidarc-dev-jwt-secret-key-change-in-prod'),
  SESSION_SECRET: z.string().default('quidarc-dev-session-secret-key-change-in-prod'),
})
  // Fail fast in production if we would otherwise fall back to insecure dev
  // defaults. Without this, a missing DATABASE_URL silently points the server
  // at localhost and it boots "healthy" against a database that isn't there.
  .superRefine((val, ctx) => {
    if (val.NODE_ENV !== 'production') return;

    if (val.DATABASE_URL.includes('localhost') || val.DATABASE_URL.includes('quidarc_dev')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must be set to the production database in production (dev/localhost default is not allowed).',
      });
    }
    if (val.JWT_SECRET.includes('dev-jwt-secret')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be set to a secure value in production.',
      });
    }
    if (val.SESSION_SECRET.includes('dev-session-secret')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_SECRET'],
        message: 'SESSION_SECRET must be set to a secure value in production.',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
