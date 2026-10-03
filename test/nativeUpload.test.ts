import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { World } from '../src/core/world';
import { encodeWide } from '../src/core/wide';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const built = linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','netDevice','frame','network','serial','stream','streamData','dns','url','http','httpRequest','httpForm','httpEmit','httpFiles','upload'].map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'app', source: `
entry: M B Z C S fs_mount N A Z J done C S fs_check N A Z J done
       M A @origin M B 19 C S url_parse C S url_commit W hs_upload @share_upload J reset
serve: M A @origin M B 19 C S url_parse C S url_commit W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 4 W 2545 5
       C S http_files_init N A Z J done W hs_upload @share_upload
serve_loop: C S http_files_step J serve_loop
reset: C S hs_reset J done
feed: M A 1337 R B 2201 C S http_feed J done
finish: C S http_eof N A Z J done M B 2 C S share_upload J done
cancel: M B 3 C S share_upload J done
open: M A @path M B 19 C S fs_lookup N A Z J done C S fs_open J done
read: C S fs_read_next W 2202 B J done
close: C S fs_close J done
http_file_type: M A 1 O S P
http_file_post: M A 405 O S P
done: W 2200 A H 0sAAA Z
origin: "http://files.world/"
path: "/public/shared/demo"` }]), { allowMargin: true });
function driver(full = false, boot = true, saved?: Int16Array) {
  const m = new FirmwareProbe(['mmio','native.stack','filesystem','network.state','network.buffers','scratch','url.state','page.text','page.script','page.records']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  let media: Int16Array | undefined;
  for (let blocks = full ? 81 : 0; blocks >= 0; blocks--) {
    try { media = createDiskImage({ blocks: 81, volumeId: [0,0,5], files: { '/net.seq': encodeWide(1), '/public/shared/demo': [7,8,9], ...(full ? { '/fill': Array(blocks * 243).fill(1) } : {}) } }); break; } catch { /* Find a full medium. */ }
  }
  const disk = new BlockMedium(81, false, saved ?? media!); if (boot) m.attach(new BlockDevice([disk]));
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(20_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(60); return m.peek(2200);
  }
  if (boot) expect(run('entry')).toBe(0);
  function feed(cells: number[]) {
    for (let i = 0; i < cells.length; i += 137) {
      const part = cells.slice(i, i + 137); part.forEach((v, j) => m.poke(1337 + j, v)); m.poke(2201, part.length);
      const status = run('feed'); if (status) return status;
    }
    return 0;
  }
  function header(length: number, path = '/shared/demo', host = 'files.world', type = 'text/plain') {
    return feed(encodeText(`PUT ${path} HTTP/T1\nHost: ${host}\nContent-Length: ${length}\nContent-Type: ${type}\n\n`));
  }
  function read() {
    expect(run('open')).toBe(0); const out: number[] = [];
    do { expect(run('read')).toBe(0); out.push(...Array.from({ length: m.peek(2202) }, (_, i) => m.peek(6440 + i))); } while (m.peek(2202));
    expect(run('close')).toBe(0); return out;
  }
  return { m, disk, run, header, feed, read };
}
test.each([0,1,242,243,244,486,9841])('native PUT publishes %i raw trytes only after EOF', length => {
  const r = driver(); const body = Array.from({ length }, (_, i) => [-9841,0,9841,-54,54][i % 5]!);
  expect(r.header(length)).toBe(0); expect(r.feed(body)).toBe(0);
  expect(r.m.peek(6976)).toBe(0);
  expect(r.run('finish')).toBe(200); expect(r.m.peek(6960)).toBe(0); expect(r.read()).toEqual(body);
});
test('truncation, excess input and cancellation preserve the old file and release its replacement', () => {
  const r = driver();
  for (const mode of ['truncated','extra','cancel','reset']) {
    expect(r.run('reset')).toBe(0); expect(r.header(487)).toBe(0);
    expect(r.feed(Array(mode === 'truncated' ? 300 : 487).fill(99))).toBe(0);
    if (mode === 'truncated') expect(r.run('finish')).toBe(-106);
    if (mode === 'extra') expect(r.feed([1])).toBe(-101);
    expect(r.run(mode === 'reset' ? 'reset' : 'cancel')).toBe(0); expect(r.m.peek(6960)).toBe(0); expect(r.read()).toEqual([7,8,9]);
  }
  expect(r.run('reset')).toBe(0); expect(r.header(9841)).toBe(0); expect(r.feed(Array(9841).fill(5))).toBe(0);
  expect(r.run('finish')).toBe(200); expect(r.read()).toEqual(Array(9841).fill(5));
});
test('upload confinement, content type and capacity failures leave existing media intact', () => {
  for (const [path, host, status] of [['/shared/a-b','files.world',400],['/index','files.world',404],['/shared/demo','other.world',404]] as const) {
    const r = driver(); expect(r.header(1,path,host)).toBe(0); expect(r.feed([4])).toBe(0); expect(r.run('finish')).toBe(status); expect(r.read()).toEqual([7,8,9]);
  }
  const long = driver(); expect(long.header(1,'/shared/elevenchars')).toBe(-101); expect(long.read()).toEqual([7,8,9]);
  const bad = driver(); expect(bad.header(1,'/shared/demo','files.world','application/x-troika-form')).toBe(-103); expect(bad.read()).toEqual([7,8,9]);
  const full = driver(true); expect(full.header(244)).toBe(0); expect(full.feed(Array(244).fill(6))).toBe(0); expect(full.run('finish')).toBe(507); expect(full.read()).toEqual([7,8,9]);
});

test('live native stream PUT survives disk-service callbacks and returns an empty success response', () => {
  const r = driver(false, false);
  const header = 'PUT /shared/demo HTTP/T1\nHost: files.world\nContent-Length: 487\nContent-Type: text/plain\n\n';
  const clientImage = linkFirmware(['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network','stream','streamData','dns','url','http','httpClient'].map(name => ({name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8')})).concat([{ name: 'app', source: `
wait: R E 2205 E E Z J wait
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 7 W 2545 1
       W 2180 1 W 2181 3 W 2182 4 M A 1 C S http_init
       M A 2180 M B 80 M C 243 C S stream_connect N A Z J failed
loop: C S net_poll ifg A Z C S stream_input E A 2 C S net_discard_input end C S stream_service
      R E 2191
      ife E Z
        R F st_state N F 4 J loop
        M A @header M B ${header.length} C S stream_send N A Z J loop
        W 2191 1 W 2192 4010 W 2193 487 J loop
      end
      ife E 1
        R B 2193 ifg B 216 M B 216 end W 2194 B R A 2192 C S stream_send N A Z J loop
        R E 2192 R F 2194 A E F W 2192 E R E 2193 S E F W 2193 E N E Z J loop W 2191 2
      end
      R E 2191 ife E 2 C S stream_shutdown N A Z J loop W 2191 3 end
      C S stream_peek ifl A Z J failed end
      ifn B Z W 2194 B C S http_feed N A Z J failed R A 2194 C S stream_consume J loop end
      N C 1 J loop M A 5711 M B 1 C S stream_read C S http_eof N A Z J failed
      W 2198 1 J loop
failed: W 2199 A H 0sAAA Z
http_body: M A Z O S P
header: "${header.replaceAll('\n', '\\n')}"` }]), { allowMargin: true });
  const client = new FirmwareProbe(['mmio','native.stack','filesystem','network.state','network.buffers','scratch','url.state','page.script']);
  for (const c of clientImage.image.chunks) c.data.forEach((v,i) => client.poke(c.addr+i,v));
  const body = Array.from({length:487}, (_,i) => [-9841,0,9841,54,-54][i%5]!); body.forEach((v,i)=>client.poke(4010+i,v));
  client.poke(REG_P, clientImage.image.labels.get('wait')!);
  r.m.sleep = null; r.m.poke(REG_P, built.image.labels.get('serve')!);
  const world = new World(); world.addMachine('client', client); world.addMachine('server', r.m); world.addDisk('server', [r.disk]);
  world.addDisk('client', [new BlockMedium(81,false,createDiskImage({blocks:81,volumeId:[0,0,1],files:{'/net.seq':encodeWide(1)}}))]);
  world.addInterface('client',4,[0,0,7],'lan'); world.addInterface('server',4,[0,0,4],'lan');
  while (world.cycles < 2_000_000 && r.m.peek(2381) !== 80) world.runCycles(6561);
  expect(r.m.peek(2381)).toBe(80); client.poke(2205, 1);
  while (world.cycles < 10_000_000 && client.peek(2198) !== 1 && !client.sleep) world.runCycles(6561);
  expect(client.peek(2199)).toBe(0); expect(client.peek(2198), JSON.stringify({client:[2191,2380,2418,6215,6225].map(a=>client.peek(a)),server:[2200,2380,2493,2494,6215,2519,2521].map(a=>r.m.peek(a))})).toBe(1); expect(client.peek(6225)).toBe(200);
  expect(client.peek(6216)).toBe(0); expect(r.m.peek(6960)).toBe(0);
  const rebooted = driver(false, true, r.disk.image());
  expect(rebooted.read()).toEqual(body);
});
