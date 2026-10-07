// Copies MapLibre's web worker into public/ so the maps can load it from our own origin
// (the bundler can't resolve the worker's default path, and the CSP only allows same-origin workers).
// Runs before `next dev` and `next build` (predev / prebuild), so it always matches the installed version.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'public'), { recursive: true });
copyFileSync(
  join(root, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs'),
  join(root, 'public', 'maplibre-gl-worker.mjs')
);
