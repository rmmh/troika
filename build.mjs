import * as esbuild from 'esbuild';
import { webOptions } from './scripts/web-build.mjs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? '';

if (mode === '--serve') {
  const ctx = await esbuild.context(webOptions);
  await ctx.watch();
  const servePort = Number(process.env.PORT ?? 8000);
  const { hosts, port } = await ctx.serve({ servedir: 'dist', port: servePort });
  console.log(`serving http://${hosts[0]}:${port}/`);
} else if (mode === '--repl') {
  await esbuild.build({
    entryPoints: ['src/cli/repl.ts'],
    bundle: true,
    outfile: 'dist/repl.cjs',
    platform: 'node',
    format: 'cjs',
    logLevel: 'warning',
  });
  spawnSync('node', ['dist/repl.cjs'], { stdio: 'inherit' });
} else {
  await esbuild.build(webOptions);
}
