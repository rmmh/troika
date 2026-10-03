import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Handles `asm-dir:<relpath>` imports. Scans the directory for *.asm files,
// reads the optional `; title: ...` first-comment, and exports a typed array.
export const asmDirPlugin = {
  name: 'asm-dir',
  setup(build) {
    build.onResolve({ filter: /^asm-dir:/ }, (args) => ({
      path: resolve(build.initialOptions.absWorkingDir ?? process.cwd(), args.path.slice('asm-dir:'.length)),
      namespace: 'asm-dir',
    }));
    build.onLoad({ filter: /.*/, namespace: 'asm-dir' }, (args) => {
      const dir = resolve(args.path);
      const files = readdirSync(dir).filter((f) => f.endsWith('.asm'));
      const entries = files.map((f) => {
        const src = readFileSync(join(dir, f), 'utf-8').replace(/^\uFEFF/, '');
        const titleMatch = src.match(/^;\s*title:\s*(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : f.replace('.asm', '');
        const id = f.replace(/\.asm$/, '');
        return { f, id, title };
      });
      entries.sort((a, b) => a.title.localeCompare(b.title));
      entries.forEach((e, i) => Object.assign(e, { varName: `_asm${i}` }));
      const lines = [
        ...entries.map(({ f, varName }) => `import ${varName} from ${JSON.stringify('./' + f)};`),
        `export default [`,
        ...entries.map(({ id, title, varName }, i) =>
          `  { id: ${JSON.stringify(id)}, name: ${JSON.stringify(title)}, src: ${varName} }${i < entries.length - 1 ? ',' : ''}`
        ),
        `];`,
      ];
      return {
        contents: lines.join('\n'), loader: 'js', resolveDir: dir,
        watchDirs: [dir],
        watchFiles: files.map((f) => join(dir, f)),
      };
    });
  },
};

function preprocessAsmFile(path, files, stack = []) {
  const abs = resolve(path);
  files.add(abs);
  if (stack.includes(abs)) throw new Error(`recursive #include ${JSON.stringify(abs)}`);
  const src = readFileSync(abs, 'utf-8');
  return src
    .replace(/^\uFEFF/, '')
    .split(/\r\n?|\n/)
    .map((line) => {
      const m = /^\s*#include\s+"([^"\r\n]+)"\s*(?:;.*)?$/.exec(line);
      if (!m) return line;
      return preprocessAsmFile(join(dirname(abs), m[1]), files, [...stack, abs]);
    })
    .join('\n');
}

export const asmTextPlugin = {
  name: 'asm-text',
  setup(build) {
    build.onLoad({ filter: /\.asm$/ }, (args) => {
      const files = new Set();
      let result;
      try {
        result = { contents: preprocessAsmFile(args.path, files), loader: 'text' };
      } catch (error) {
        result = { errors: [{ text: error instanceof Error ? error.message : String(error) }] };
      }
      // Report dependencies even after a failed read, so creating or repairing
      // an include lets watch mode recover without restarting the server.
      return { ...result, watchFiles: [...files], watchDirs: [...new Set([...files].map(dirname))] };
    });
  },
};
