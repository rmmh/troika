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

// Best-fit decreasing is fast, but can strand a module even when a complete
// packing exists. On failure, search the same RAM extents without changing
// module sizes or admitting any reserved memory. Equivalent free-space states
// are memoized; equal-size bins are symmetric for this placement pass.
function packModules(sizes: readonly number[], bins: readonly number[]): number[] | null {
  const order = sizes.map((size, index) => ({ size, index })).sort((a, b) => b.size - a.size || a.index - b.index);
  const remaining = [...bins], result = new Array<number>(sizes.length);
  const choices = (size: number) => remaining.map((free, index) => ({ free, index }))
    .filter(bin => bin.free >= size).sort((a, b) => a.free - b.free || a.index - b.index);
  let greedy = true;
  for (const item of order) {
    const bin = choices(item.size)[0];
    if (!bin) { greedy = false; break; }
    result[item.index] = bin.index; remaining[bin.index]! -= item.size;
  }
  if (greedy) return result;
  bins.forEach((size, i) => { remaining[i] = size; });
  const failed = new Set<string>();
  let visits = 0;
  function search(next: number): boolean {
    if (next === order.length) return true;
    // Bound build time for pathological inputs. Exhaustion is an inability to
    // find a layout, not a proof that the required RAM exceeds total capacity.
    if (++visits > 100_000) return false;
    const key = `${next}:${[...remaining].sort((a, b) => a - b).join(',')}`;
    if (failed.has(key)) return false;
    const item = order[next]!;
    let previous = -1;
    for (const bin of choices(item.size)) {
      if (bin.free === previous) continue;
      previous = bin.free;
      result[item.index] = bin.index; remaining[bin.index]! -= item.size;
      if (search(next + 1)) return true;
      remaining[bin.index]! += item.size;
    }
    failed.add(key); return false;
  }
  return search(0) ? result : null;
}

/** Build-time relocation into ordinary guest RAM. No bank switching or ROM. */
export function linkFirmware(modules: readonly NativeModule[], options: {
  allowMargin?: boolean;
  /** Reserved-core linking: ordinary code extents available to this image. */
  regions?: readonly { start: number; size: number }[];
  externals?: Readonly<Record<string, number>>;
} = {}): LinkedFirmware {
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

  const available = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || (options.allowMargin && r.name === 'margin'));
  const regions = options.regions ? options.regions.map(({start, size}) => {
    const parent = available.find(r => start >= r.start && start + size <= r.start + r.size);
    if (!Number.isInteger(start) || !Number.isInteger(size) || size < 1 || !parent) throw new Error('invalid native code extent');
    return {name: parent.name, start, size};
  }) : available;
  if (regions.some((r, i) => regions.slice(i + 1).some(s => r.start < s.start + s.size && s.start < r.start + r.size))) throw new Error('overlapping native code extents');
  const allowed = available.map(r => r.name);
  const bindings = Object.entries(options.externals ?? {}).map(([name, address]) => {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name) || !Number.isInteger(address) || address < -9841 || address > 9841 ||
        regions.some(r => address >= r.start && address < r.start + r.size)) throw new Error('invalid native external binding');
    return `@${address}\n${name}:`;
  });
  const totalAvailable = regions.reduce((n, r) => n + r.size, 0);
  let capacities = new Array<number>(modules.length).fill(0);

  function compile(addresses?: readonly number[]) {
    const lines: string[] = bindings.flatMap(binding => binding.split('\n'));
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
      // A relocated measuring pass may grow past 9841 while jumps relax.
      // Unfold its normalized end so the next pass can reserve/repack it.
      // Only converged, audited images may be installed into a Machine.
      const span = addresses && end < begin ? end + 19683 - begin : end - begin;
      if (span < 0) throw new Error(`native module ${modules[i]!.name} wrapped the RAM address space (${begin}..${end})`);
      return span;
    });
    return { source, image, spans, sourceRanges };
  }

  // A measuring assembly is never installed into a Machine. Its temporary
  // linear layout may overlap reserved display/MMIO addresses.
  capacities = compile().spans;
  for (let pass = 0; pass < 729; pass++) {
    const required = capacities.reduce((n, v) => n + v, 0);
    if (required > totalAvailable) throw new Error(`native firmware requires ${required} cells, exceeding the declared resident RAM budget of ${totalAvailable}`);
    const positions = regions.map(r => r.start);
    const addresses = new Array<number>(modules.length);
    const assignments = new Array<RegionName>(modules.length);
    const order = capacities.map((size, index) => ({ size, index })).sort((a, b) => b.size - a.size || a.index - b.index);
    const packing = packModules(capacities, regions.map(r => r.size));
    if (!packing) throw new Error('cannot find a contiguous module layout in the declared RAM budget; split modules or explicitly allocate margin');
    for (const { size, index } of order) {
      const chosen = packing[index]!;
      addresses[index] = positions[chosen]!;
      assignments[index] = regions[chosen]!.name;
      positions[chosen]! += size;
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
