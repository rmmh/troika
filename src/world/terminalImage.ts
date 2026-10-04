import { linkProgramOverlay, type buildProgramCore } from '../firmware/programCore';
import { linkFirmware } from '../firmware/link';
import { WORLD_BASIC_MODULES } from './browserImages';

/** Independently linked program; no web, page, HTTP or Forth modules. */
export function buildTerminalFirmware(source: (name: string) => string) {
  return linkFirmware([
    { name: 'boot', source: 'J terminal_entry\nterminal_program_menu: J terminal_prompt' },
    ...[...WORLD_BASIC_MODULES, 'dns', 'dnsClient', 'dhcpClient', 'stream', 'streamData',
      'url', 'browserConnect', 'text', 'telnetPhase', 'terminal'].map(name => ({name, source: source(name)})),
  ]);
}


/** Same native terminal, sharing only the protected disk/loader core. */
export function buildTerminalOverlay(core: ReturnType<typeof buildProgramCore>, source: (name: string) => string) {
  const shared = new Set(['block', 'fat', 'fatCheck', 'fatWrite']);
  return linkProgramOverlay(core, [
    ...[...WORLD_BASIC_MODULES.filter(name => !shared.has(name)), 'dns', 'dnsClient', 'dhcpClient',
      'stream', 'streamData', 'url', 'browserConnect', 'text', 'telnetPhase', 'terminal']
      .map(name => ({name,source:source(name)})),
    {name:'terminalExit',source:`
terminal_program_menu:
      C S terminal_network C S dns_client_cancel
      R E st_state ifn E Z ifn E 6 M A 1 C S stream_abort end end
      R E net_pending N E Z J terminal_program_menu
      R E st_control N E Z J terminal_program_menu
      R E 100 N E Z J terminal_program_menu
      W block_service_vector Z W 2506 Z J program_menu`},
  ], 'terminal_entry');
}
