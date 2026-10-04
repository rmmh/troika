import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeWide } from '../src/core/wide';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { linkPhasedFirmware } from '../src/firmware/phases';
import { createDiskImage } from '../src/firmware/diskImage';
import { FirmwareProbe } from './firmwareProbe';
const module = (name: string) => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') });
const built = linkPhasedFirmware({ capacity: 1906, allowMargin: true,
  resident: ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network',
    'dns', 'dnsClient', 'dhcpClient', 'stream', 'streamData', 'url', 'forthVm', 'forthPage', 'forthLookup',
    'pageState', 'http', 'httpClient', 'image', 'browserConnect', 'browserResponse'].map(module).concat([{ name: 'app', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check N A Z J done
      M A @path M B 8 C S image_load N A Z J done
      M A @url M B 23 C S url_parse N A Z J done C S browser_response_begin J done
step: C S browser_response_step J done
begin: C S browser_response_begin J done
download: M A @download_path M B 9 C S image_load N A Z J done
      M A @out_path M B 4 C S browser_download_response_begin J done
read_file: M A @out_path M B 4 C S fs_lookup N A Z J done C S fs_open N A Z J done
      C S fs_read_next W 2202 B U S A C S fs_close O S A J done
read_second: M A @out_path M B 4 C S fs_lookup N A Z J done C S fs_open N A Z J done
      C S fs_read_next N A Z J done C S fs_read_next W 2202 B U S A C S fs_close O S A J done
serial_refill_test: C S serial_refill J done
dhcp_lease_lost: O S P
done: W 2200 A H 0sAAA Z
download_path: "/download"
out_path: "/out"
path: "/compile"
url: "http://next.world/index"` }]),
  phases: { download: ['downloadPhase', 'fatMutate', 'fatGrow', 'downloadBody'].map(module), compile: ['pageCompilePhase', 'forthLex', 'forthCompile', 'page'].map(module) },
});
function driver(serialStart = 1) {
  class Probe extends FirmwareProbe {
    override write(address: number, value: number) {
      if (built.resident.modules.some(m => m.name !== 'phaseSlot' && address >= m.address && address < m.address + m.reserved)) throw new Error('response wrote resident code');
      super.write(address, value);
    }
  }
  const m = new Probe(['mmio','filesystem','native.stack','url.state','scratch','network.state','network.buffers',
    'page.text','page.script','page.records','forth.state','resident.low','resident.middle','resident.high','margin']);
  for (const c of built.resident.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  const medium = new BlockMedium(54, false, createDiskImage({ blocks: 54, volumeId: [0,0,1], files: { '/compile': built.phases.compile!.file, '/download': built.phases.download!.file, '/out': [1,2,3], '/net.seq': [...encodeWide(serialStart)] } }));
  m.attach(new BlockDevice([medium]));
  encodeText('old.world').forEach((v, i) => m.poke(6062 + i, v)); m.poke(6117, 9); m.poke(6118, 80); m.poke(6122, 1);
  function execute(label: string) {
    m.poke(REG_P, built.resident.image.labels.get(label)!); m.sleep = null;
    expect(m.run(5_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(120);
    return m.peek(2200);
  }
  expect(execute('entry')).toBe(0);
  function feed(message: string | number[], chunk = 216) {
    const cells = typeof message === 'string' ? encodeText(message) : message; let status = 0;
    for (let i = 0; i < cells.length; i += chunk) {
      const part = cells.slice(i, i + chunk); part.forEach((v, j) => m.poke(1364 + j, v));
      // Hardware/stream fixture presents an already-owned DATA payload. Native
      // response code must consume it, release ownership and queue its ACK.
      m.poke(2414, part.length); m.poke(2415, 1364); m.poke(2416, 1 + Math.floor(i / chunk));
      status = execute('step'); if (status !== 0) break;
      expect(m.peek(2414)).toBe(0); if (m.peek(2506) === 0) { expect(m.peek(5434)).toBe(0); expect(m.peek(5363)).toBe(0); }
    }
    return status;
  }
  const finish = () => { m.poke(2417, 1); return execute('step'); };
  const origin = () => decodeText(Array.from({ length: m.peek(6117) }, (_, i) => m.peek(6062 + i)));
  return { m, execute, feed, finish, origin };
}
const counted = (s: string) => `${s.length}:${s}`;
const script = 'VARIABLE n : LOAD 77 n ! ;';
const body = `PAGE 1\nT 5:hello\nC ${counted(script)}\n`;
const response = (text: string, type = 'text/troika-page', length = text.length, status = 200) => `HTTP/T1 ${status}\nContent-Length: ${length}\nContent-Type: ${type}\n\n${text}`;
test.each([1, 7, 216])('resident response loader feeds the disk compiler and commits only at EOF, chunk=%s', chunk => {
  const r = driver(); expect(r.feed(response(body), chunk)).toBe(0); expect(r.origin()).toBe('old.world'); expect(r.m.peek(5333)).toBe(0);
  expect(r.finish()).toBe(1); expect(r.origin()).toBe('next.world'); expect(r.m.peek(5434)).toBe(1); expect(r.m.peek(5363)).toBe(1);
  expect(r.m.peek(5333)).toBe(0); expect(r.execute('step')).toBe(1); // LOAD belongs to the interaction phase.
});
test.each([response(body, 'text/troika-page', body.length + 1), response(body + 'x', 'text/troika-page', body.length), response(body.replace('PAGE 1','PAGE 2'))])('response failure invalidates compiled content and preserves origin: %s', message => {
  const r = driver(); const status = r.feed(message); expect(status || r.finish()).toBeLessThan(0);
  expect(r.m.peek(5434)).toBe(0); expect(r.m.peek(5363)).toBe(0); expect(r.m.peek(5333)).toBe(0); expect(r.origin()).toBe('old.world');
  expect(r.execute('step')).toBeLessThan(0);
});
test('plain error responses remain inert and an empty untyped response becomes an empty plain page', () => {
  const r = driver(); expect(r.feed(response(body, 'text/plain', body.length, 404))).toBe(0); expect(r.finish()).toBe(1);
  expect(r.m.peek(5363)).toBe(0); expect(r.m.peek(5414)).toBe(0); expect(r.origin()).toBe('next.world');
  const empty = driver(); expect(empty.feed('HTTP/T1 200\nContent-Length: 0\n\n')).toBe(0); expect(empty.finish()).toBe(1); expect(empty.m.peek(5427)).toBe(1);
});
test.each([response(body, 'text/troika-page', body.length, 404), response('x', 'application/x-troika-form')])('response loader refuses executable error pages and unsupported page types', message => {
  const r = driver(); expect(r.feed(message)).toBe(-130); expect(r.origin()).toBe('old.world'); expect(r.m.peek(5434)).toBe(0);
});
test('transport failure is sticky and response initialization rejects active handlers', () => {
  const r = driver(); r.m.poke(2418, -61); expect(r.execute('step')).toBe(-61); expect(r.m.peek(5434)).toBe(0);
  r.m.poke(5372, 1); expect(r.execute('begin')).toBe(-112); expect(r.origin()).toBe('old.world');
});
test('disk compiler validates an absolute link through the resident HTTP callback within the native stack', () => {
  const r = driver(); const linked = `PAGE 1\nL 5:other ${counted('http://other.world/index')}\n`;
  expect(r.feed(response(linked), 1)).toBe(0); expect(r.finish()).toBe(1); expect(r.origin()).toBe('next.world');
});
test('maximum plain body is streamed into its fixed arena without retaining an extra response buffer', () => {
  const r = driver(); const text = 'x'.repeat(1458); expect(r.feed(response(text, 'text/plain'))).toBe(0);
  expect(r.finish()).toBe(1); expect(r.m.peek(5420)).toBe(4010);
  expect(Array.from({ length: 1458 }, (_, i) => r.m.peek(2552 + i))).toEqual(encodeText(text));
});
test.each([0, 1, 243, 244, 486])('download response assembles %s raw cells and publishes only after EOF', length => {
  const r = driver(); expect(r.feed(response(body))).toBe(0); expect(r.finish()).toBe(1);
  const page = Array.from({ length: 2916 }, (_, i) => r.m.peek(2552 + i)); const origin = r.origin();
  expect(r.execute('download')).toBe(0);
  const bytes = Array.from({ length }, (_, i) => [-9841, 0, 9841, -54, 54][i % 5]!);
  expect(r.feed([...encodeText(`HTTP/T1 200\nContent-Length: ${length}\nContent-Type: application/octet-stream\n\n`), ...bytes], 81)).toBe(0);
  if (length) expect(r.m.peek(6976)).toBe(0);
  expect(r.finish()).toBe(1); expect(r.m.peek(6976)).toBe(1); expect(r.origin()).toBe(origin);
  expect(Array.from({ length: 2916 }, (_, i) => r.m.peek(2552 + i))).toEqual(page);
  expect(r.execute('read_file')).toBe(0); expect(r.m.peek(2202)).toBe(Math.min(length, 243));
  expect(Array.from({ length: Math.min(length, 243) }, (_, i) => r.m.peek(6440 + i))).toEqual(bytes.slice(0, 243));
  if (length > 243) {
    expect(r.execute('read_second')).toBe(0); expect(r.m.peek(2202)).toBe(length - 243);
    expect(Array.from({ length: length - 243 }, (_, i) => r.m.peek(6440 + i))).toEqual(bytes.slice(243));
  }
});
test('truncated download aborts unpublished data and serial refill cannot overwrite a partial disk block', () => {
  const r = driver(); expect(r.execute('download')).toBe(0);
  expect(r.feed([...encodeText('HTTP/T1 200\nContent-Length: 300\nContent-Type: application/octet-stream\n\n'), ...Array(250).fill(7)])).toBe(0);
  const partial = Array.from({ length: 7 }, (_, i) => r.m.peek(6440 + i));
  expect(r.execute('serial_refill_test')).toBe(-1); expect(Array.from({ length: 7 }, (_, i) => r.m.peek(6440 + i))).toEqual(partial);
  expect(r.finish()).toBe(-106); expect(r.m.peek(6960)).toBe(0);
  expect(r.execute('read_file')).toBe(0); expect(r.m.peek(2202)).toBe(3); expect([r.m.peek(6440),r.m.peek(6441),r.m.peek(6442)]).toEqual([1,2,3]);
});
test('an HTTP error cannot replace the destination file', () => {
  const r = driver(); expect(r.execute('download')).toBe(0); expect(r.feed(response('missing','text/plain',7,404))).toBe(-132);
  expect(r.execute('read_file')).toBe(0); expect(r.m.peek(2202)).toBe(3);
});

test.each([1, 9830])('download services repeated durable serial refills without losing partial data or page RAM; start=%s', start => {
  const r=driver(start);
  r.m.poke(2545,1);expect(r.execute('serial_refill_test')).toBe(0);
  expect(r.execute('download')).toBe(0);
  const page=Array.from({length:2916},(_,i)=>r.m.peek(2552+i));
  const bytes=Array.from({length:300},(_,i)=>i-150);
  expect(r.feed([...encodeText('HTTP/T1 200\nContent-Length: 300\nContent-Type: application/octet-stream\n\n'),...bytes.slice(0,250)])).toBe(0);
  const partial=Array.from({length:7},(_,i)=>r.m.peek(6440+i));
  // Exhaust ranges between body frames, then service with no incoming payload.
  // This also exercises a bound crossing the low-tryte wrap at 9841.
  for(let n=0;n<3;n++){
    for(let i=0;i<3;i++)r.m.poke(2534+i,r.m.peek(2537+i));
    const oldEnd=r.m.peek(2539);
    expect(r.execute('step')).toBe(0);
    expect(r.m.peek(2539)).not.toBe(oldEnd);
    expect(r.m.peek(6960)).toBe(3);
    expect(Array.from({length:7},(_,i)=>r.m.peek(6440+i))).toEqual(partial);
    expect(Array.from({length:2916},(_,i)=>r.m.peek(2552+i))).toEqual(page);
  }
  expect(r.feed(bytes.slice(250))).toBe(0);expect(r.finish()).toBe(1);
  expect(r.execute('read_file')).toBe(0);
  expect(Array.from({length:243},(_,i)=>r.m.peek(6440+i))).toEqual(bytes.slice(0,243));
  expect(r.execute('read_second')).toBe(0);
  expect(Array.from({length:57},(_,i)=>r.m.peek(6440+i))).toEqual(bytes.slice(243));
});
