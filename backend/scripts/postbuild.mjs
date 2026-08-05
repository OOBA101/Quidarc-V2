#!/usr/bin/env node
/**
 * Postbuild: copy SQL migration files into dist so the compiled migrate.js can
 * find them at runtime. TypeScript compiles .ts only — without this, the
 * compiled code would fail with "Migration file not found".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcMigrationsDir = path.join(__dirname, '../server/db/migrations');
const destMigrationsDir = path.join(__dirname, '../dist/server/db/migrations');

if (!fs.existsSync(srcMigrationsDir)) {
  console.error('❌ Source migrations directory not found:', srcMigrationsDir);
  process.exit(1);
}

fs.mkdirSync(destMigrationsDir, { recursive: true });

const files = fs.readdirSync(srcMigrationsDir).filter(f => f.endsWith('.sql'));
for (const file of files) {
  const src = path.join(srcMigrationsDir, file);
  const dest = path.join(destMigrationsDir, file);
  fs.copyFileSync(src, dest);
  console.log(`✅ Copied ${file} → dist/server/db/migrations/`);
}

console.log(`✅ Postbuild complete: ${files.length} migration(s) copied.`);
