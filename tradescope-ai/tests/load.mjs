// Loads one TypeScript test file with the project's `@/` alias.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url, { alias: { '@': path.join(root, 'src') }, jsx: true });
await jiti.import(process.argv[2]);
