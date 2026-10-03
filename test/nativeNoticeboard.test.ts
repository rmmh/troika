import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built = linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','netDevice','frame','network','serial','dns','url','http','httpRequest','httpForm','noticeboard'].map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'app', source: `
entry: M B Z C S fs_mount N A Z J done C S fs_check J done
post: M A 4010 R B 2201 C S http_form_parse N A Z J done C S http_file_post J done
open: M A @path M B 13 C S fs_lookup N A Z J done C S fs_open J done
read: C S fs_read_next W 2202 B J done
close: C S fs_close J done
http_body: M A Z O S P
done: W 2200 A H 0sAAA Z
path: "/public/board"` }]));
const initial = 'PAGE 1\nT 5:Board\n';
function driver(content = initial, full = false) {
  const m = new FirmwareProbe(['mmio','native.stack','filesystem','network.state','network.buffers','scratch','url.state','page.text','page.script','page.records']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  const disk = new BlockMedium(27, false, createDiskImage({ blocks: 27, volumeId: [0,0,2], files: { '/public/board': encodeText(content), ...(full ? { '/fill': Array(14 * 243).fill(1) } : {}) } }));
  m.attach(new BlockDevice([disk]));
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(10_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(48);
    return m.peek(2200);
  }
  expect(run('entry')).toBe(0);
  function post(value: string, name = 'msg', route = '/app/post') {
    const body = [1,name.length,...encodeText(name),value.length,...encodeText(value)];
    body.forEach((v, i) => m.poke(4010 + i, v)); m.poke(2201, body.length);
    encodeText(route).forEach((v, i) => m.poke(6196 + i, v)); m.poke(6226, route.length);
    return run('post');
  }
  function read() {
    const result: number[] = []; expect(run('open')).toBe(0);
    do { expect(run('read')).toBe(0); result.push(...Array.from({ length: m.peek(2202) }, (_, i) => m.peek(6440 + i))); } while (m.peek(2202));
    expect(run('close')).toBe(0); return result;
  }
  return { m, post, read };
}
test('native noticeboard pads and appends literal text across block boundaries', () => {
  const r = driver(); const messages = ['First', 'Text: <b>hello</b>', 'x'.repeat(54), 'Last\nline'];
  for (const value of messages) expect(r.post(value)).toBe(0);
  expect(r.read()).toEqual(encodeText(initial + messages.map(s => `T 54:${s.padEnd(54)}\n`).join('')));
  expect(r.m.peek(6960)).toBe(0);
});
test.each([{ value: '', name: 'msg', route: '/app/post', status: 400 },
  { value: 'hello', name: 'other', route: '/app/post', status: 400 },
  { value: 'hello', name: 'msg', route: '/app/nope', status: 404 }])('noticeboard rejects invalid application input: $name $route $value', ({ value, name, route, status }) => {
  const r = driver(); expect(r.post(value,name,route)).toBe(status); expect(r.read()).toEqual(encodeText(initial));
});
test('full noticeboard and full disk preserve the existing file', () => {
  const content = `PAGE 1\nT 1190:${'x'.repeat(1190)}\n`;
  const board = driver(content); expect(board.post('hello')).toBe(409); expect(board.read()).toEqual(encodeText(content));
  const disk = driver(initial, true); expect(disk.post('hello')).toBe(-18); expect(disk.m.peek(6960)).toBe(0); expect(disk.read()).toEqual(encodeText(initial));
});
