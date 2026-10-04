import { buildProgramCore } from '../firmware/programCore';
import { buildWebOverlay } from './webImage';
import { buildTerminalOverlay } from './terminalImage';
import { buildIrcOverlay } from './ircImage';

export function buildWorldPrograms(source: (name: string) => string) {
  // Cold boot enters the web program after the physical power-on key. Later
  // switches go through the native selector; no host code loads a program.
  const menu = source('programMenu').replace('program_boot:\n',
    'program_boot: R E 68 N E 4 J program_boot R E 69\n').replace('      J program_menu\nprogram_recover:', '      J pm_web\nprogram_recover:');
  const core = buildProgramCore(source, {name:'menu',source:menu});
  const web = buildWebOverlay(core, source), terminal = buildTerminalOverlay(core, source), irc = buildIrcOverlay(core, source);
  const files = {'/web':web.file, '/terminal':terminal.file, '/irc':irc.file,
    ...Object.fromEntries(Object.entries(web.phases).map(([name, image]) => [`/${name}`,image.file]))};
  return {core,web,terminal,irc,files};
}
