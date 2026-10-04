import { linkProgramOverlay, type buildProgramCore } from '../firmware/programCore';
import { WORLD_BASIC_MODULES } from './browserImages';

/** Human-facing chat program. Bots remain independent native machines. */
export function buildIrcOverlay(core: ReturnType<typeof buildProgramCore>, source: (name: string) => string) {
  const shared = new Set(['block','fat','fatCheck','fatWrite']);
  return linkProgramOverlay(core, [
    ...[...WORLD_BASIC_MODULES.filter(name => !shared.has(name)), 'dns', 'dhcpClient', 'netWait', 'netEcho',
      'chatClient', 'text', 'ircProgram'].map(name => ({name,source:source(name)})),
  ], 'irc_entry');
}
