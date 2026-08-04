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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
