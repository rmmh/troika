import { assemble, type AssembleResult } from '../asm/assemble';
import { lex, normalizeSource } from '../asm/lexer';
import { CLIENT_LAYOUT, auditClientImage, type RegionName } from './layout';

export interface NativeModule { name: string; source: string; }
export interface LinkedModule {
  name: string;
  address: number;
  /** Code/data plus any explicit assembler buffer reservations. */
  span: number;
  /** Monotone reservation allows jump relaxation without overlapping modules. */
  reserved: number;
  emitted: number;
  region: RegionName;
}
export interface LinkedFirmware {
  image: AssembleResult;
  source: string;
  modules: LinkedModule[];
  emitted: number;
  reserved: number;
  marginReserved: number;
}

/** Build-time relocation into ordinary guest RAM. No bank switching or ROM. */
export function linkFirmware(modules: readonly NativeModule[], options: { allowMargin?: boolean } = {}): LinkedFirmware {
  if (!modules.length) throw new Error('firmware needs at least one module');
  const names = new Set<string>();
  for (const module of modules) {
    if (!module.name || names.has(module.name)) throw new Error('native module names must be unique and nonempty');
    names.add(module.name);
    if (/^\s*#include\b/m.test(module.source)) throw new Error(`${module.name}: resolve includes before linking`);
    const tokens = lex(normalizeSource(module.source)).tokens;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.kind === 'ident' && t.text.startsWith('firmware_link_')) throw new Error('reserved linker label prefix');
      if (t.kind === 'symbol' && t.text === '@' && tokens[i + 1]?.kind !== 'ident') {
        throw new Error(`${module.name}: fixed origins are not allowed inside relocatable modules`);
      }
    }
  }

  const regions = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || (options.allowMargin && r.name === 'margin'));
  const allowed = regions.map(r => r.name);
  const totalAvailable = regions.reduce((n, r) => n + r.size, 0);
  let capacities = new Array<number>(modules.length).fill(0);

  function compile(addresses?: readonly number[]) {
    const lines: string[] = [];
    const sourceRanges: { start: number; end: number }[] = [];
    modules.forEach((module, i) => {
      if (addresses) lines.push(`@${addresses[i]}`);
      else if (i === 0) lines.push('@-9112');
      lines.push(`firmware_link_begin_${i}:`);
      const start = lines.length + 1;
      for (const line of normalizeSource(module.source).split('\n')) lines.push(line);
      sourceRanges.push({ start, end: lines.length });
      lines.push(`firmware_link_end_${i}:`);
    });
    const source = lines.join('\n');
    const image = assemble(source);
    const errors = image.diagnostics.filter(d => d.severity === 'error');
    if (errors.length) throw new Error(`native assembly failed: ${errors.map(d => `${d.line}: ${d.message}`).join('; ')}`);
    const spans = modules.map((_, i) => {
      const begin = image.labels.get(`firmware_link_begin_${i}`)!;
      const end = image.labels.get(`firmware_link_end_${i}`)!;
      const span = end - begin;
      if (span < 0) throw new Error('native module wrapped the RAM address space');
      return span;
    });
    return { source, image, spans, sourceRanges };
  }

  // A measuring assembly is never installed into a Machine. Its temporary
  // linear layout may overlap reserved display/MMIO addresses.
  capacities = compile().spans;
  for (let pass = 0; pass < 729; pass++) {
    if (capacities.reduce((n, v) => n + v, 0) > totalAvailable) throw new Error('native firmware exceeds the declared resident RAM budget');
    const positions = regions.map(r => r.start);
    const remaining = regions.map(r => r.size);
    const addresses = new Array<number>(modules.length);
    const assignments = new Array<RegionName>(modules.length);
    const order = capacities.map((size, index) => ({ size, index })).sort((a, b) => b.size - a.size || a.index - b.index);
    for (const { size, index } of order) {
      let chosen = -1;
      for (let r = 0; r < regions.length; r++) {
        if (remaining[r]! >= size && (chosen < 0 || remaining[r]! < remaining[chosen]!)) chosen = r;
      }
      if (chosen < 0) throw new Error(`${modules[index]!.name}: cannot fit a contiguous ${size}-tryte module; split it or explicitly allocate margin`);
      addresses[index] = positions[chosen]!;
      assignments[index] = regions[chosen]!.name;
      positions[chosen]! += size;
      remaining[chosen]! -= size;
    }
    const built = compile(addresses);
    let grew = false;
    built.spans.forEach((size, i) => { if (size > capacities[i]!) { capacities[i] = size; grew = true; } });
    if (grew) continue;
    const emittedByModule = new Array<number>(modules.length).fill(0);
    for (const [addr, line] of built.image.lineMap) {
      const index = built.sourceRanges.findIndex(r => line >= r.start && line <= r.end);
      if (index < 0 || addr < addresses[index]! || addr >= addresses[index]! + capacities[index]!) {
        throw new Error('native module emitted outside its assigned reservation');
      }
      emittedByModule[index]!++;
    }
    const audit = auditClientImage(built.image.chunks, allowed);
    if (built.image.diagnostics.length) throw new Error(`native assembly warnings: ${built.image.diagnostics.map(d => d.message).join('; ')}`);
    return {
      source: built.source, image: built.image, emitted: audit.used,
      reserved: capacities.reduce((n, v) => n + v, 0),
      marginReserved: capacities.reduce((n, v, i) => n + (assignments[i] === 'margin' ? v : 0), 0),
      modules: modules.map((module, i) => ({ name: module.name, address: addresses[i]!, span: built.spans[i]!,
        reserved: capacities[i]!, emitted: emittedByModule[i]!, region: assignments[i]! })),
    };
  }
  throw new Error('native relocation did not converge');
}
