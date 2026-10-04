import { lex, normalizeSource } from '../asm/lexer';
import { CLIENT_LAYOUT } from './layout';
import { linkFirmware, type NativeModule } from './link';
import { buildProgramImage } from './programImage';

/** Core stays in middle code RAM; programs may replace the other code extents. */
export function buildProgramCore(source: (name: string) => string, controller: NativeModule) {
  const shared = ['block', 'fat', 'fatCheck', 'fatWrite', 'program'].map(name => ({name, source: source(name)}));
  let end = -364;
  for (let pass = 0; pass < 27; pass++) {
    const image = linkFirmware([
      {name:'programConfig', source:`J program_boot\n$program_core_end: ${end}`}, ...shared, controller,
    ], {regions:[{start:-3631,size:3267}]});
    const next = -3631 + image.reserved;
    if (next !== end) { end = next; continue; }
    const declared = new Set<string>(), constants: string[] = [];
    for (const module of shared) {
      const tokens = lex(normalizeSource(module.source)).tokens;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]!, next = tokens[i + 1];
        if (token.kind === 'ident' && next?.text === ':') declared.add(token.text);
        if (token.text === '$' && next?.kind === 'ident' && tokens[i + 2]?.text === ':' && tokens[i + 3]?.kind === 'numeric') {
          constants.push(`$${next.text}: ${tokens[i + 3]!.value}`);
        }
      }
    }
    if (image.image.labels.has('program_menu')) declared.add('program_menu');
    const externals = Object.fromEntries([...image.image.labels].filter(([name]) => declared.has(name)));
    const regions = CLIENT_LAYOUT.filter(r => r.name.startsWith('resident.') || r.name === 'margin').flatMap(r => {
      const start = r.name === 'resident.middle' ? end : r.start;
      return start < r.start + r.size ? [{start,size:r.start+r.size-start}] : [];
    });
    return {image, end, externals, definitions: constants.join('\n'), regions};
  }
  throw new Error('program core relocation did not converge');
}

export function linkProgramOverlay(core: ReturnType<typeof buildProgramCore>, modules: readonly NativeModule[], entry: string, options: {allowMargin?: boolean} = {}) {
  const image = linkFirmware([{name:'coreDefinitions',source:core.definitions}, ...modules], {
    allowMargin:options.allowMargin, regions:core.regions.filter(r => options.allowMargin || r.start < 7007), externals:core.externals,
  });
  const address = image.image.labels.get(entry);
  if (address === undefined) throw new Error(`missing program entry ${entry}`);
  return {image, ...buildProgramImage(image, address)};
}
