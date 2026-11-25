#!/usr/bin/env node
// `next build` with output: 'standalone' does not copy public/ and .next/static into .next/standalone.
// This makes `npm run start:standalone` serve a complete app (CSS, JS chunks, icons).
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = path.join(root, '.next/standalone');
if (!existsSync(standalone)) {
  console.error('No .next/standalone found — run `npm run build` first.');
  process.exit(1);
}
cpSync(path.join(root, '.next/static'), path.join(standalone, '.next/static'), { recursive: true });
if (existsSync(path.join(root, 'public'))) cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
console.log('standalone ready: .next/standalone (static assets copied)');
