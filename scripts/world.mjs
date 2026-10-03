import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'troika-world-'));
try {
  const outfile = join(dir, 'world.mjs');
  await build({
    absWorkingDir: root, entryPoints: ['src/cli/world.ts'], outfile,
    bundle: true, platform: 'node', format: 'esm', logLevel: 'warning',
    define: { FIRMWARE_ROOT: JSON.stringify(root) },
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}
