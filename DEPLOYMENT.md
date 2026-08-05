# Quidarc Deployment Guide & Checklist

This repository contains a full monorepo with three workspaces:
- `backend/`: Fastify + PostgreSQL (Drizzle ORM) + Circle Wallets API + Arc Testnet integration
- `app/`: Quidarc Web Application (React + TypeScript + Viem + Web Crypto API)
- `frontend/`: Quidarc Marketing & Landing Page (React + Tailwind + Shadcn)

---

## 📋 Production Deployment Checklist

### Step 1: Deploy PostgreSQL Database on Railway
1. Log in to [Railway.app](https://railway.app) and create a new project.
2. Click **+ New** → **Database** → **PostgreSQL**.
3. Once provisioned, click on the PostgreSQL service and copy the **DATABASE_URL** connection string from the **Variables** tab.

### Step 2: Deploy Backend Service on Railway
1. In the same Railway project, click **+ New** → **GitHub Repo** (or deploy via Railway CLI).
2. Select your repository and specify the **Root Directory** as `/backend`.
3. In the service **Variables** tab, set the required environment variables:
   - `DATABASE_URL`: *(Your Railway PostgreSQL connection string — use the internal `*.railway.internal` URL when backend and DB share a project)*
   - `NODE_ENV`: `production` *(required — enables SSL, CORS lockdown, and fail-fast validation)*
   - `ARC_RPC_URL`: `https://rpc.testnet.arc.network`
   - `CIRCLE_API_KEY`: *(Your Circle Developer-Controlled Wallets API key — optional until Phase 6)*
   - `ANTHROPIC_API_KEY`: *(Your Anthropic API key — optional until Phase 7)*
   - `CORS_ORIGINS`: *(Comma-separated allowed frontend origins, e.g. `https://your-app.vercel.app,https://your-landing.vercel.app`. Required in production.)*
   - Do **not** set `PORT` — Railway injects it automatically and the server binds it.

### Step 3: Migrations run automatically on boot
Database migrations run **in-process at server startup** (idempotent `CREATE ... IF NOT EXISTS`),
so no pre-deploy command is required. The server applies the schema before it begins
serving traffic and aborts the boot if the database is unreachable.

> To run migrations manually (e.g. from the Railway shell) use the compiled entrypoint:
> `npm run db:migrate:prod`. The `npm run db:migrate` script uses `tsx` and is for local dev only.

### Step 4: Verify Backend Health Probe
1. Copy your deployed backend public URL (e.g. `https://quidarc-backend-production.up.railway.app`).
2. Test the health endpoint in your browser or curl:
   ```bash
   curl https://quidarc-backend-production.up.railway.app/health
   ```
3. Confirm the response returns:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "version": "1.0.0",
     "timestamp": "..."
   }
   ```

### Step 5: Verify the Database Schema
After the backend has booted (migrations run automatically), confirm the live
database is fully provisioned — every table, column, and index — and check TLS:
```bash
npm run db:verify:prod        # on Railway (compiled)
# or, against a remote DB from your machine:
DATABASE_URL="postgres://..." npm run db:verify
```
The command exits non-zero and lists any missing objects if the schema is incomplete.

### Step 6: Verify Arc Testnet Connectivity
Confirm the backend can reach Arc Testnet at the configured RPC and that the
USDC contract matches the app's assumptions (chain ID `5042002`, USDC `6` decimals):
```bash
npm run arc:verify:prod       # on Railway (compiled)
# or, locally:
npm run arc:verify
```
This is a live network check — it catches a wrong `ARC_RPC_URL` or mis-set
`ARC_USDC_CONTRACT_ADDRESS` before it surfaces as a confusing balance/transfer
bug. Exits non-zero on any mismatch or if the RPC is unreachable.

### Step 7: Populate Demo Seed Data (Optional)
Seed initial demo cards and waitlist records (idempotent — safe to re-run):
```bash
npm run db:seed
```

### Step 8: Deploy Frontend Web App on Vercel / Cloudflare
1. Create a new project on Vercel or Cloudflare Pages targeting `app/` (or `frontend/`).
2. Set Environment Variable on Vercel:
   - `VITE_API_BASE_URL`: `https://quidarc-backend-production.up.railway.app/api` *(must include the `/api` path)*
3. Deploy frontend.

---

## 🔍 Smoke Testing Checklist
- [ ] Wallet creation & seed phrase encryption in browser (`walletCrypto.ts`).
- [ ] Direct USDC transfer pre-sign approval & local `viem` transaction broadcast (`arcChain.ts`).
- [ ] Permission card creation & instant revocation button check.
- [ ] Persistent audit log retrieval (`/api/audit`).
