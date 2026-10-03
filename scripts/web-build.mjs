import { asmDirPlugin, asmTextPlugin } from './build-plugins.mjs';

export const webOptions = {
  entryPoints: { main: 'src/web/main.tsx', style: 'src/web/style.css', index: 'index.html' },
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.html': 'copy', '.txt': 'text' },
  plugins: [asmDirPlugin, asmTextPlugin],
  logLevel: 'info',
};
