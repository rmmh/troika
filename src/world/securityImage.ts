import { linkFirmware } from '../firmware/link';
import { encodeText } from '../core/textEncoding';
import { WORLD_BASIC_MODULES } from './browserImages';

const text = (s: string) => `T ${s.length}:${s}`;
const template = ['PAGE 1', 'H 16:Security station', ...Array(3).fill(text('.........')),
  text('Armed: 0 Alarm: 0 Moves: 0'), 'F 11:/app/device', 'I 4:code 0:', 'I 6:action 1:0', 'S 5:Apply',
  text('0 move 1 arm 2 disarm 3 ack'), 'L 6:Manual 7:/manual', 'L 7:Refresh 6:/index',
  'L 3:BBS 22:http://bbs.world/index', ''].join('\n');
const manual = `Security station maintenance\n\nThe 3 by 9 text camera shows a simulated moving subject (@). Action 0 moves it one cell and wraps at the edge. This is a public physical-event simulator, not a camera control credential.\n\nDemo code: 271\nAction 1 arms the alarm. Motion then latches Alarm: 1. Action 3 acknowledges the alarm while keeping it armed; action 2 disarms and clears it. Invalid codes cannot change alarm state. The published code is an intentional maintenance-code hacking exercise, not real authentication.\n\nRefresh reads the current camera and alarm state. Three native browser clients can use the station concurrently. Move count saturates at nine. A cold boot resets the camera position, motion count, armed state and alarm. Disk-only checkpoints do not retain device state.\n`;

export function buildSecurityFirmware(source: (name: string) => string) {
  const bodyCells = template.length, bankCells = 383 + bodyCells;
  const bankA = 2552 + bodyCells, ingress = bankA + bankCells;
  if (ingress + 243 > 4010) throw new Error('security HTTP buffers exceed page-text RAM');
  const field = (label: string) => 2552 + template.indexOf(label) + label.length;
  const image = linkFirmware([
    {name: 'securityConfig', source: `$mx_slots/0: @security_transport_park end
$mx_frame: ${ingress}
$hm_bank_a: ${bankA}
$hm_bank_b/0: @security_http_park end
$hm_body_cells: ${bodyCells}
$security_length: ${bodyCells}
$security_armed_cell: ${field('Armed: ')}
$security_alarm_cell: ${field('Alarm: ')}
$security_moves_cell: ${field('Moves: ')}
$security_view_cell: ${2552 + template.indexOf('.........')}
$security_pixel: ${encodeText('@')[0]}`},
    ...[...WORLD_BASIC_MODULES, 'netWait', 'netEcho', 'dns', 'stream', 'streamData', 'streamMux',
      'url', 'http', 'httpRequest', 'httpEmit', 'httpForm', 'httpFiles', 'security', 'httpMux']
      .map(name => ({name, source: source(name)})),
    {name: 'securityStorage', source: `security_transport_park//1266\nsecurity_http_park//${bankCells}`},
    {name: 'startup', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 13 W 2545 13
W 2070 1 W 2071 3 W 2072 9 M A @origin M B 22 C S url_parse N A Z J failed C S url_commit
C S http_files_init N A Z J failed C S net_wait_init
W security_armed Z W security_alarm Z W security_position Z W security_moves Z
W hs_prepare @security_prepare C S http_mux_init N A Z J failed
loop: C S http_mux_step C S http_mux_wait J loop
http_file_type: M A 1 O S P
failed: W 2199 A H 0sAAA Z
origin: "http://security.world/"
security_template: "${template.replaceAll('\n', '\\n')}"`},
  ], {allowMargin: true});
  return {image, bodyCells, bankCells, bankA, ingress, files: {'/public/manual': encodeText(manual)}};
}
