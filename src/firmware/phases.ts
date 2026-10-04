import { linkFirmware, type NativeModule } from './link';
import { buildNativeImage } from './nativeImage';
import { lex } from '../asm/lexer';

/** Build mutually exclusive disk images for one explicitly reserved RAM slot.
 * Resident code cannot directly reference phase-private symbols: call the
 * phase dispatcher through image_call instead. No host runtime loading occurs.
 */
export function linkPhasedFirmware(options: {
  resident: readonly NativeModule[];
  phases: Readonly<Record<string, readonly NativeModule[]>>;
  capacity: number;
  allowMargin?: boolean;
  regions?: readonly {start: number; size: number}[];
  externals?: Readonly<Record<string, number>>;
}) {
  if (!Number.isInteger(options.capacity) || options.capacity < 1) throw new Error('invalid phase capacity');
  const resident = linkFirmware([
    { name: 'phaseConfig', source: `$image_capacity: ${options.capacity}` },
    ...options.resident,
    { name: 'phaseSlot', source: `image_slot//${options.capacity}` },
  ], { allowMargin: options.allowMargin, regions: options.regions, externals: options.externals });
  const base = resident.image.labels.get('image_slot')!;
  const tokens = lex(resident.source).tokens;
  const declared = new Set<string>(), constants = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!, next = tokens[i + 1];
    if (token.kind === 'ident' && next?.kind === 'symbol' &&
        (next.text === ':' || (next.text === '/' && tokens[i + 2]?.text === '/'))) declared.add(token.text);
    if (token.text === '$' && next?.kind === 'ident' && tokens[i + 2]?.text === ':' &&
        tokens[i + 3]?.kind === 'numeric' && (!tokens[i + 4] || tokens[i + 4]!.line > tokens[i + 3]!.line)) {
      constants.set(next.text, tokens[i + 3]!.value);
    }
  }
  const externals = Object.fromEntries([...resident.image.labels].filter(([name, address]) =>
    declared.has(name) && !name.startsWith('firmware_link_') && (address < base || address >= base + options.capacity)));
  // Native shared-state definitions are numeric macros, not emitted storage.
  // Export only that explicit form, never resident instruction bodies.
  const definitions = [...constants].map(([name, value]) => `$${name}: ${value}`).join('\n');
  const phases = Object.fromEntries(Object.entries(options.phases).map(([name, modules]) => {
    const source = [definitions, ...modules.map(module => module.source)].join('\n');
    return [name, buildNativeImage({ source, base, capacity: options.capacity, externals })];
  }));
  return { resident, phases, base, capacity: options.capacity };
}
