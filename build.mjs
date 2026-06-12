import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? '';

const webOptions = {
  entryPoints: ['src/web/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'copy', '.asm': 'text' },
  logLevel: 'info',
};

function copyStatic() {
  mkdirSync('dist', { recursive: true });
  cpSync('index.html', 'dist/index.html');
  cpSync('src/web/style.css', 'dist/style.css');
}

if (mode === '--serve') {
  copyStatic();
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
  copyStatic();
  await esbuild.build(webOptions);
}
