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
   - `DATABASE_URL`: *(Your Railway PostgreSQL connection string)*
   - `PORT`: `3001` (or leave default for Railway auto-assignment)
   - `NODE_ENV`: `production`
   - `ARC_RPC_URL`: `https://rpc.testnet.arc.network`
   - `CIRCLE_API_KEY`: *(Your Circle Developer-Controlled Wallets API key)*
   - `ANTHROPIC_API_KEY`: *(Your Anthropic API key)*
   - `JWT_SECRET`: *(A secure random secret)*
   - `SESSION_SECRET`: *(A secure random secret)*

### Step 3: Configure Railway Pre-Deploy Migrations
1. In Railway under **Settings** → **Deploy** → **Pre-Deploy Command**, enter:
   ```bash
   npm run db:migrate
   ```
2. Deploy the backend service.

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

### Step 5: Populate Demo Seed Data (Optional)
Run the seed script manually or via Railway CLI if you want initial test cards and waitlist records:
```bash
npm run db:seed
```

### Step 6: Deploy Frontend Web App on Vercel / Cloudflare
1. Create a new project on Vercel or Cloudflare Pages targeting `app/` (or `frontend/`).
2. Set Environment Variable on Vercel:
   - `VITE_API_BASE_URL`: `https://quidarc-backend-production.up.railway.app`
3. Deploy frontend.

---

## 🔍 Smoke Testing Checklist
- [ ] Wallet creation & seed phrase encryption in browser (`walletCrypto.ts`).
- [ ] Direct USDC transfer pre-sign approval & local `viem` transaction broadcast (`arcChain.ts`).
- [ ] Permission card creation & instant revocation button check.
- [ ] Persistent audit log retrieval (`/api/audit`).
