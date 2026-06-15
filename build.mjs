import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Handles `asm-dir:<relpath>` imports. Scans the directory for *.asm files,
// reads the optional `; title: ...` first-comment, and exports a typed array.
const asmDirPlugin = {
  name: 'asm-dir',
  setup(build) {
    build.onResolve({ filter: /^asm-dir:/ }, (args) => ({
      path: args.path.slice('asm-dir:'.length),
      namespace: 'asm-dir',
    }));
    build.onLoad({ filter: /.*/, namespace: 'asm-dir' }, (args) => {
      const dir = resolve(args.path);
      const files = readdirSync(dir).filter((f) => f.endsWith('.asm'));
      const entries = files.map((f) => {
        const src = readFileSync(join(dir, f), 'utf-8');
        const titleMatch = src.match(/^;\s*title:\s*(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : f.replace('.asm', '');
        const id = f.replace(/\.asm$/, '');
        return { f, id, title };
      });
      entries.sort((a, b) => a.title.localeCompare(b.title));
      entries.forEach((e, i) => Object.assign(e, { varName: `_asm${i}` }));
      const lines = [
        ...entries.map(({ f, varName }) => `import ${varName} from ${JSON.stringify('./' + join(args.path, f))};`),
        `export default [`,
        ...entries.map(({ id, title, varName }, i) =>
          `  { id: ${JSON.stringify(id)}, name: ${JSON.stringify(title)}, src: ${varName} }${i < entries.length - 1 ? ',' : ''}`
        ),
        `];`,
      ];
      return { contents: lines.join('\n'), loader: 'js', resolveDir: '.' };
    });
  },
};

function preprocessAsmFile(path, stack = []) {
  const abs = resolve(path);
  if (stack.includes(abs)) throw new Error(`recursive #include ${JSON.stringify(abs)}`);
  const src = readFileSync(abs, 'utf-8');
  return src
    .split('\n')
    .map((line) => {
      const m = /^\s*#include\s+"([^"\r\n]+)"\s*(?:;.*)?$/.exec(line);
      if (!m) return line;
      return preprocessAsmFile(join(dirname(abs), m[1]), [...stack, abs]);
    })
    .join('\n');
}

const asmTextPlugin = {
  name: 'asm-text',
  setup(build) {
    build.onLoad({ filter: /\.asm$/ }, (args) => ({
      contents: preprocessAsmFile(args.path),
      loader: 'text',
    }));
  },
};

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
