#!/usr/bin/env node
/**
 * Pre-deploy secret check.
 *
 *  1. Scans every file served to browsers (dist/client) for secret-looking
 *     values and for the actual values of local secrets (.dev.vars / .env).
 *  2. Deletes dist/server/.dev.vars, which the Cloudflare Vite plugin copies
 *     there for `astro preview`; it must never travel with a deployment.
 *
 * Exits non-zero if anything is found, so `npm run deploy` stops.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const clientDir = join(root, 'dist', 'client');
const copiedDevVars = join(root, 'dist', 'server', '.dev.vars');

if (!existsSync(clientDir)) {
  console.error('dist/client not found. Run `npm run build` first.');
  process.exit(1);
}

// Values of local secrets (if present) — these must never appear in client files.
const secretValues = [];
for (const file of ['.dev.vars', '.env', '.env.local', '.env.production']) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (match && match[2] && match[2].length >= 12 && !/^(https?:\/\/|true|false)/.test(match[2]) && !match[1].startsWith('PUBLIC_')) {
      secretValues.push({ name: match[1], value: match[2] });
    }
  }
}

const PATTERNS = [
  { name: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase service_role JWT', re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*/ },
  { name: 'Resend API key', re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/ },
  { name: 'Secret env var name', re: /\b(SUPABASE_SECRET_KEY|RESEND_API_KEY|TURNSTILE_SECRET_KEY|APP_SECRET|CRON_SECRET)\b/ },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const problems = [];
let scanned = 0;
for (const file of walk(clientDir)) {
  if (!/\.(js|mjs|css|html|json|txt|xml|map|webmanifest)$/.test(file)) continue;
  scanned += 1;
  const text = readFileSync(file, 'utf8');
  for (const { name, re } of PATTERNS) if (re.test(text)) problems.push(`${name} pattern in ${file}`);
  for (const { name, value } of secretValues) if (text.includes(value)) problems.push(`value of ${name} in ${file}`);
}

if (existsSync(copiedDevVars)) {
  rmSync(copiedDevVars);
  console.log('Removed dist/server/.dev.vars (local secrets copied by the dev tooling).');
}

if (problems.length > 0) {
  console.error('Secret check FAILED:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Secret check passed: ${scanned} client files scanned, ${secretValues.length} local secret values checked.`);
