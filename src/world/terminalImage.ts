import { linkFirmware } from '../firmware/link';
import { WORLD_BASIC_MODULES } from './browserImages';

/** Independently linked program; no web, page, HTTP or Forth modules. */
export function buildTerminalFirmware(source: (name: string) => string) {
  return linkFirmware([
    { name: 'boot', source: 'J terminal_entry' },
    ...[...WORLD_BASIC_MODULES, 'dns', 'dnsClient', 'dhcpClient', 'stream', 'streamData',
      'url', 'browserConnect', 'text', 'telnetPhase', 'terminal'].map(name => ({name, source: source(name)})),
  ]);
}
