import { asmDirPlugin, asmTextPlugin } from './build-plugins.mjs';

export const webOptions = {
  entryPoints: { main: 'src/web/main.tsx', style: 'src/web/style.css', index: 'index.html', world: 'world.html', 'world-main': 'src/web/worldMain.tsx', 'world-worker': 'src/web/worldWorker.ts', 'world-style': 'src/web/world.css' },
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.html': 'copy', '.txt': 'text', '.bin': 'file' },
  plugins: [asmDirPlugin, asmTextPlugin],
  logLevel: 'info',
};
