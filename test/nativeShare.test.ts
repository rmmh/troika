import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built = linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','netDevice','frame','network','serial','dns','url','http','httpRequest','httpForm','share'].map(name => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') })).concat([{ name: 'app', source: `
entry: M B Z C S fs_mount N A Z J done C S fs_check J done
post: M A 4010 R B 2201 C S http_form_parse N A Z J done C S http_file_post J done
open: M A 1337 R B 2203 C S fs_lookup N A Z J done C S fs_open J done
read: C S fs_read_next W 2202 B J done
close: C S fs_close J done
http_body: M A Z O S P
done: W 2200 A H 0sAAA Z
path: "/public/board"` }]));
const initial = 'old content';
function driver(full = false) {
  const m = new FirmwareProbe(['mmio','native.stack','filesystem','network.state','network.buffers','scratch','url.state','page.text','page.script','page.records']);
  for (const c of built.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_S, 5710);
  let media: Int16Array | undefined;
  for (let blocks = full ? 27 : 0; blocks >= 0; blocks--) {
    try {
      media = createDiskImage({ blocks: 27, volumeId: [0,0,5], files: { '/public/shared/demo': encodeText(initial), ...(full ? { '/fill': Array(blocks * 243).fill(1) } : {}) } });
      break;
    } catch { /* Find the largest filler that fits this initial physical medium. */ }
  }
  if (!media) throw new Error('test disk could not be formatted');
  const disk = new BlockMedium(27, false, media);
  m.attach(new BlockDevice([disk]));
  function run(label: string) {
    m.sleep = null; m.poke(REG_P, built.image.labels.get(label)!);
    expect(m.run(10_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(48);
    return m.peek(2200);
  }
  expect(run('entry')).toBe(0);
  function post(name: string, text: string, route = '/app/share', textField = 'text') {
    const body = [2,4,...encodeText('name'),name.length,...encodeText(name),textField.length,...encodeText(textField),text.length,...encodeText(text)];
    body.forEach((v, i) => m.poke(4010 + i, v)); m.poke(2201, body.length);
    encodeText(route).forEach((v, i) => m.poke(6196 + i, v)); m.poke(6226, route.length);
    return run('post');
  }
  function read(path = '/public/shared/demo') {
    encodeText(path).forEach((v, i) => m.poke(1337 + i, v)); m.poke(2203, path.length);
    const result: number[] = []; expect(run('open')).toBe(0);
    do { expect(run('read')).toBe(0); result.push(...Array.from({ length: m.peek(2202) }, (_, i) => m.peek(6440 + i))); } while (m.peek(2202));
    expect(run('close')).toBe(0); return result;
  }
  return { m, post, read };
}

test('native sharing creates, replaces and empties files as literal text', () => {
  const r = driver();
  for (const text of ['Published text', 'PAGE 1\nT 5:hello\n', 'x'.repeat(54), '']) {
    expect(r.post('demo', text)).toBe(0);
    expect(r.read()).toEqual(encodeText(text)); expect(r.m.peek(6960)).toBe(0);
    expect(r.m.peek(6226)).toBe(12);
    expect(Array.from({ length: 12 }, (_, i) => r.m.peek(6196 + i))).toEqual(encodeText('/shared/demo'));
  }
  expect(r.post('new_name09', 'new')).toBe(0);
  expect(r.read('/public/shared/new_name09')).toEqual(encodeText('new'));
});

test.each(['', '../demo', 'a/b', 'UPPER', 'elevenchars', 'two words', '.'])('native sharing rejects invalid names without changing an existing file: %s', name => {
  const r = driver(); expect(r.post(name, 'new')).toBe(400); expect(r.read()).toEqual(encodeText(initial));
});

test('unknown routes or fields and a full disk preserve the previous shared file', () => {
  const r = driver();
  expect(r.post('demo', 'new', '/app/other')).toBe(404);
  expect(r.post('demo', 'new', '/app/share', 'other')).toBe(400);
  expect(r.read()).toEqual(encodeText(initial));
  const full = driver(true); expect(full.post('demo', 'replacement')).toBe(507);
  expect(full.read()).toEqual(encodeText(initial)); expect(full.m.peek(6960)).toBe(0);
});
