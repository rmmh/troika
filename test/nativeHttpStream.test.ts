import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P } from '../src/core/machine';
import { World } from '../src/core/world';
import { BlockMedium } from '../src/core/blockDevice';
import { encodeWide } from '../src/core/wide';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network',
  'stream', 'streamData', 'router', 'dns', 'url', 'http', 'httpRequest', 'httpSend', 'httpEmit'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
function machine(host: number, subnet: number, body: string) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
      W 2067 1 W 2068 ${subnet} W 2069 ${host} W 2545 ${host}
      W 2070 1 W 2071 ${subnet} W 2072 9
      ${body}
network_service:
      C S net_poll ifn A Z C S stream_input E A 2 C S net_discard_input end
      C S stream_service O S P
http_body:
      R E 2197 M F 2552 A F E W F A I E 1 W 2197 E M A Z O S P
receive_http:
      C S stream_peek ifl A Z J application_error end
      ifn B Z
        W 2190 B C S http_feed N A Z J application_error
        R A 2190 C S stream_consume O S P
      end
      ife C 1 M A 5711 M B 1 C S stream_read C S http_eof N A Z J application_error end
      O S P
application_error: W 2199 A H 0sAAA Z
origin: "http://bbs.world/"
request_url: "http://bbs.world/index"
route: "/index"
file: "/www/index"` }]);
  const m = new FirmwareProbe(['mmio', 'network.buffers', 'network.state', 'filesystem', 'native.stack',
    'page.text', 'scratch', 'url.state']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, linked.image.entry!); return m;
}

test.each([0, 300, 486])('native HTTP server streams a %i-cell FAT file across a router with an encoded length', length => {
  const client = machine(1, 2, `
      M A 1 C S http_init W 2180 1 W 2181 3 W 2182 2
      M A 2180 M B 80 M C 243 C S stream_connect
client_loop:
      C S network_service
      R E 2191
      ife E Z
        R E st_state N E 4 J client_loop
        M A @request_url M B 22 C S url_parse N A Z J application_error
        M A 1 M B Z C S http_request_header N A Z J application_error
        M A C C S stream_send N A Z J client_loop
        M A 1 C S http_init W 2191 1
      end
      C S receive_http
      R E h_phase N E 3 J client_loop
      R E 2191 N E 1 J client_loop
      C S stream_shutdown N A Z J client_loop W 2191 2 W 2198 1 J client_loop`);
  const server = machine(2, 3, `
      M A @origin M B 17 C S url_parse C S url_commit M A Z C S http_init
      M A 80 C S stream_listen
server_loop:
      C S network_service C S receive_http R E 2191
      E E Z J accept_request
      E E 1 J send_header
      E E 2 J send_file
      J server_loop
accept_request:
      R E h_phase N E 3 J server_loop
      R E h_method N E 1 J server_405 R E h_host_match N E 1 J server_404
      R E h_path_len N E 6 J server_404 M A h_path M B @route M C 6 C S dns_equal N A Z J server_404
      W block_service_vector @network_service
      M B Z C S fs_mount N A Z J server_500 C S fs_check N A Z J server_500
      M A @file M B 10 C S fs_lookup N A Z J server_404 C S fs_open N A Z J server_500
      R E fs_found_count
      ifn E Z
        ifg E 41 J server_500 end
        I E -1 P E 243 M F 9841 S F E R G fs_found_used ifg G F J server_500 end A E G
      end
      W 2193 E M A 200 M B E M C 1 J prepare_header
server_404: M A 404 J empty_error
server_405: M A 405 J empty_error
server_500: M A 500
empty_error: W 2193 Z M B Z M C Z
prepare_header:
      C S http_response_header N A Z J application_error W 2191 1
send_header:
      M A h_line R B h_line_len C S stream_send N A Z J server_loop W 2191 2 J server_loop
send_file:
      R E st_tx_waiting N E Z J server_loop R E 2193 E E Z J close_file
      R E 2195
      ife E Z
        C S fs_read_next N A Z J application_error E B Z J application_error
        W 2195 B W 2194 fs_buffer
      end
      R B 2195 ifg B 216 M B 216 end W 2196 B R A 2194 C S stream_send N A Z J server_loop
      R E 2194 R F 2196 A E F W 2194 E R E 2195 S E F W 2195 E R E 2193 S E F W 2193 E J server_loop
close_file:
      C S fs_close C S stream_shutdown N A Z J server_loop W 2191 3 W 2198 1 J server_loop`);
  const router = machine(9, 2, `
      W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 9
      W router_route_count 2 W 2200 1 W 2201 1 W 2202 2 W 2207 1 W 2208 1 W 2209 3 W 2210 1 C S router_init
router_loop: C S net_poll E A 1 C S router_input C S router_service J router_loop`);
  const contents = encodeText('Native disk content across routed HTTP.\n'.repeat(20)).slice(0, length);
  const world = new World();
  for (const [name, m, id, files] of [
    ['client', client, 1, {}], ['server', server, 2, { '/www/index': contents }], ['router', router, 9, {}],
  ] as const) {
    world.addMachine(name, m);
    world.addDisk(name, [new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0, 0, id], files: { '/net.seq': encodeWide(1), ...files } }))]);
  }
  world.addInterface('client', 4, [0, 0, 10], 'a'); world.addInterface('server', 4, [0, 0, 20], 'b');
  world.addInterface('router', 4, [0, 0, 30], 'a'); world.addInterface('router', 5, [0, 0, 31], 'b');
  while (world.cycles < 5_000_000 && (client.peek(2380) !== 6 || server.peek(2380) !== 6)) world.runCycles(6561);
  expect(client.peek(2199)).toBe(0); expect(server.peek(2199)).toBe(0);
  expect(client.peek(2198)).toBe(1); expect(server.peek(2198)).toBe(1);
  expect(client.peek(6225)).toBe(200); expect(client.peek(6216)).toBe(length); expect(client.peek(2197)).toBe(length);
  expect(Array.from({ length }, (_, i) => client.peek(2552 + i))).toEqual(contents);
  expect(client.peek(2380)).toBe(6); expect(server.peek(2380)).toBe(6);
  expect(server.peek(6960)).toBe(0); expect(server.stackHighWater).toBeLessThanOrEqual(54);
});
