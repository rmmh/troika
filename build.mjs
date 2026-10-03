import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { asmDirPlugin, asmTextPlugin } from './scripts/build-plugins.mjs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? '';

const copyStaticPlugin = {
  name: 'copy-static',
  setup(build) {
    build.onStart(() => {
      mkdirSync('dist', { recursive: true });
      cpSync('index.html', 'dist/index.html');
      cpSync('src/web/style.css', 'dist/style.css');
    });
  },
};

const webOptions = {
  entryPoints: ['src/web/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'empty', '.txt': 'text' },
  plugins: [asmDirPlugin, asmTextPlugin, copyStaticPlugin],
  logLevel: 'info',
};

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
