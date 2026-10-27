import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'server', 'src');
const dest = join(here, '..', 'backend');

if (!existsSync(src)) {
  console.warn('[linkvault] server/src not found, skipping backend copy');
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[linkvault] Copied server/src → client/backend');
