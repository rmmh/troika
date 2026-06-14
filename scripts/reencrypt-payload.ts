import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { assemble } from '../src/asm/assemble.ts';
import { encodeText } from '../src/core/textEncoding.ts';
import { fromTritsRaw, toTribbles, tritMap } from '../src/core/tryte.ts';

function includeResolver(path: string, from?: string): string | undefined {
  const base = from ? dirname(resolve(from)) : process.cwd();
  try {
    return readFileSync(resolve(base, path), 'utf8');
  } catch {
    return undefined;
  }
}

function main(): void {
  const [srcPath, label = 'payload', keyText = 'ThisIsSecureRight?', groupText = '12'] = process.argv.slice(2);
  if (!srcPath) {
    console.error('usage: node --experimental-strip-types scripts/reencrypt-payload.ts <source> [label] [key] [group]');
    process.exit(1);
  }
  const group = Number.parseInt(groupText, 10);
  if (!Number.isFinite(group) || group <= 0) {
    console.error(`invalid group size: ${groupText}`);
    process.exit(1);
  }

  const src = readFileSync(srcPath, 'utf8');
  const r = assemble(src, { includeResolver, filename: srcPath });
  const errs = r.diagnostics.filter((d) => d.severity === 'error');
  if (errs.length) throw new Error(JSON.stringify(errs, null, 2));

  const addr = r.labels.get(label);
  if (addr === undefined) throw new Error(`unknown label ${label}`);
  const chunk = r.chunks.find((c) => c.addr <= addr && addr < c.addr + c.data.length);
  if (!chunk) throw new Error(`no chunk contains label ${label} at ${addr}`);

  const plain = chunk.data.slice(addr - chunk.addr);
  const table = [2, 1, 0, 1, 0, 2, 0, 2, 1];
  const key = encodeText(keyText);
  const tableTryte = fromTritsRaw(table);
  console.log(`; table ${toTribbles(tableTryte)}`);
  console.log(`; payload ${label} @ ${addr}`);
  console.log(`; length ${plain.length}`);
  const enc = plain.map((v, i) => tritMap(v, key[i % key.length]!, table));
  const lines: string[] = [];
  for (let i = 0; i < enc.length; i += group) lines.push(enc.slice(i, i + group).map((v) => toTribbles(v)).join(' '));
  console.log(lines.join('\n'));
}

main();
