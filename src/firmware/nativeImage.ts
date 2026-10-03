import { assemble, type AssembleResult } from '../asm/assemble';
import { lex, normalizeSource } from '../asm/lexer';
import { fromTribbles, norm } from '../core/tryte';
import { CLIENT_LAYOUT } from './layout';

export const NATIVE_IMAGE_MAGIC = fromTribbles('IMG');
export const NATIVE_IMAGE_VERSION = 1;

/** Build-time disk artifact, never a host runtime loader or extra executable RAM. */
export function buildNativeImage(options: {
  source: string;
  base: number;
  capacity: number;
  externals?: Readonly<Record<string, number>>;
}): { file: number[]; assembly: AssembleResult; length: number } {
  const { source, base, capacity, externals = {} } = options;
  if (!Number.isInteger(base) || !Number.isInteger(capacity) || capacity < 1 ||
      !CLIENT_LAYOUT.some(r => (r.name.startsWith('resident.') || r.name === 'margin') && base >= r.start && base + capacity <= r.start + r.size)) {
    throw new Error('native image slot must lie wholly inside one ordinary code extent');
  }
  if (/^\s*#include\b/m.test(source)) throw new Error('resolve native image includes before building');
  const tokens = lex(normalizeSource(source)).tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.kind === 'symbol' && tokens[i]!.text === '@' && tokens[i + 1]?.kind !== 'ident') {
      throw new Error('native image source cannot set a fixed origin');
    }
  }
  const bindings = Object.entries(externals).map(([name, address]) => {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name) || !Number.isInteger(address) || address < -9841 || address > 9841 ||
        (address >= base && address < base + capacity)) throw new Error('invalid resident symbol binding');
    return `@${address}\n${name}:`;
  });
  const assembly = assemble([...bindings, `@${base}`, source].join('\n'));
  if (assembly.diagnostics.length) throw new Error(`native image assembly: ${assembly.diagnostics.map(d => d.message).join('; ')}`);
  const end = assembly.end === -9841 && base > 0 ? 9842 : assembly.end;
  const length = end - base;
  if (length < 1 || length > capacity) throw new Error('native image exceeds its slot or is empty');
  const payload = new Array<number>(length).fill(0), occupied = new Uint8Array(length);
  for (const chunk of assembly.chunks) {
    if (chunk.addr < base || chunk.addr + chunk.data.length > base + length) throw new Error('native image emitted outside its slot');
    chunk.data.forEach((cell, i) => {
      const offset = chunk.addr + i - base;
      if (occupied[offset]) throw new Error('overlapping native image emission');
      occupied[offset] = 1; payload[offset] = cell;
    });
  }
  return { file: [NATIVE_IMAGE_MAGIC, NATIVE_IMAGE_VERSION, length, payload.reduce((sum, cell) => norm(sum + cell), 0), ...payload], assembly, length };
}
