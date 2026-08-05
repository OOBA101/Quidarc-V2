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
  ARC_USDC_CONTRACT_ADDRESS: z
    .string()
    .default('0x3600000000000000000000000000000000000000'),

  // Circle API — Developer-Controlled Wallets (Agent Wallet provisioning +
  // execution). All three are empty by default so the backend runs in a
  // labeled-mock mode with no credentials. If CIRCLE_API_KEY is set, the entity
  // secret and wallet set ID become required (see superRefine) — there is no
  // half-configured state that would throw at request time.
  CIRCLE_API_KEY: z.string().optional().default(''),
  CIRCLE_ENTITY_SECRET: z.string().optional().default(''),
  CIRCLE_WALLET_SET_ID: z.string().optional().default(''),

  // AI Brain — Anthropic Claude. ANTHROPIC_API_KEY is optional (blank runs the
  // orchestrator in labeled-mock mode). ANTHROPIC_MODEL is configurable so the
  // deployment is never pinned to a model ID that later gets deprecated.
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().optional().default('claude-sonnet-5'),

  // CORS — comma-separated list of allowed browser origins (e.g.
  // "https://app.quidarc.com,https://quidarc.com"). Empty by default; in
  // development the server falls back to a permissive localhost policy.
  CORS_ORIGINS: z.string().optional().default(''),
})
  // Fail fast in production if we would otherwise fall back to insecure dev
  // defaults. Without this, a missing DATABASE_URL silently points the server
  // at localhost and it boots "healthy" against a database that isn't there.
  .superRefine((val, ctx) => {
    // Circle is optional, but partial configuration is not: if the API key is
    // present, the entity secret and wallet set ID must be too — otherwise the
    // first agent-wallet call would throw mid-request instead of at boot.
    if (val.CIRCLE_API_KEY.trim()) {
      if (!val.CIRCLE_ENTITY_SECRET.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CIRCLE_ENTITY_SECRET'],
          message: 'CIRCLE_ENTITY_SECRET is required when CIRCLE_API_KEY is set.',
        });
      }
      if (!val.CIRCLE_WALLET_SET_ID.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CIRCLE_WALLET_SET_ID'],
          message: 'CIRCLE_WALLET_SET_ID is required when CIRCLE_API_KEY is set.',
        });
      }
    }

    if (val.NODE_ENV !== 'production') return;

    if (val.DATABASE_URL.includes('localhost') || val.DATABASE_URL.includes('quidarc_dev')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must be set to the production database in production (dev/localhost default is not allowed).',
      });
    }
    if (!val.CORS_ORIGINS.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS must list the allowed frontend origin(s) in production (wildcard is not used).',
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
