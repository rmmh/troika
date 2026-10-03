import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { TextDevice } from '../src/core/textDevice';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkPhasedFirmware } from '../src/firmware/phases';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { starterScreen } from '../src/world/starter';
import { FirmwareProbe } from './firmwareProbe';
const module = (name: string) => ({ name, source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') });
const built = linkPhasedFirmware({ capacity: 1906, allowMargin: true,
  resident: ['block', 'fat', 'fatCheck', 'fatWrite', 'serial', 'netDevice', 'frame', 'network',
    'dns', 'dnsClient', 'dhcpClient', 'stream', 'streamData', 'url', 'forthVm', 'forthPage', 'forthLookup',
    'pageState', 'http', 'httpClient', 'image', 'browserConnect', 'browserResponse'].map(module).concat([{ name: 'app', source: `
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check N A Z J done
      M A @origin M B 23 C S url_parse C S url_commit J done
load_console: M A @console_path M B 8 C S image_load J done
console_poll_test: M B 1 M A Z C S image_call J done
load_download: M A @download_path M B 9 C S image_load J done
download_begin: M C 1337 R D 2201 R F 2204 R G 2205 M B Z M A Z C S image_call J done
download_append: M B 1 M A Z C S image_call J done
test_download_finish: M B 2 M A Z C S image_call J done
download_abort: M B 3 M A Z C S image_call J done
read_download: M A 1337 R B 2201 C S fs_lookup N A Z J done C S fs_open N A Z J done
      C S fs_read_next W 2202 B U S A C S fs_close O S A J done
load_compile: M A @compile_path M B 8 C S image_load J done
load_interact: M A @interact_path M B 9 C S image_load J done
init: M C 2 M B Z M A Z C S image_call J done
feed: M C 1337 R D 2201 M B 1 M A Z C S image_call J done
finish: M B 2 M A Z C S image_call J done
run: M B Z M A Z C S image_call J done
form: M B 1 M A Z C S image_call W 2202 B W 2203 C J done
draw: R C 4740 R D 4741 M F Z M G Z M B 2 M A Z C S image_call J done
request: M C 1 M D Z M B 3 M A Z C S image_call W 2202 B W 2203 C J done
submit: M B 4 M A Z C S image_call J done
action_header: M B 10 M A Z C S image_call W 2202 B J done
action_body: M B 11 M A Z C S image_call W 2202 B J done
action_clear: M B 12 M A Z C S image_call J done
poll: M B 9 M A Z C S image_call J done
ui_init: M C Z M B 8 M A Z C S image_call J done
ui_next: M C 1 M B 8 M A Z C S image_call J done
focus: M C -1 M D 1 M B 6 M A Z C S image_call W 2202 B J done
edit: M C 2 M D 5 M F Z M G 0s_NF M B 7 M A Z C S image_call W 2202 B J done
view: M C Z M D 2 M B 5 M A Z C S image_call J done
dhcp_lease_lost: O S P
done: W 2200 A H 0sAAA Z
origin: "http://home.world/index"
compile_path: "/compile"
interact_path: "/interact"
console_path: "/console"
download_path: "/download"` }]),
  phases: {
    console: ['consolePhase','fatMutate','fatGrow','fatAdmin','text','console'].map(module),
    download: ['downloadPhase', 'fatMutate', 'fatGrow', 'downloadBody'].map(module),
    compile: ['pageCompilePhase', 'forthLex', 'forthCompile', 'page'].map(module),
    interact: ['pageInteractPhase', 'httpSend', 'pageForm', 'text', 'pageView', 'pageInput', 'pageUi', 'pageKeys', 'pageRequest', 'pageTransmit'].map(module),
  },
});
function driver(corruptInteraction = false, consoleFiles = false) {
  class Probe extends FirmwareProbe {
    override write(address: number, value: number) {
      const region = CLIENT_LAYOUT.find(r => address >= r.start && address < r.start + r.size);
      if ((region?.name.startsWith('resident.') || region?.name === 'margin') && (address < built.base || address >= built.base + built.capacity)) throw new Error('phase wrote resident code');
      super.write(address, value);
    }
  }
  const m = new Probe(['mmio', 'filesystem', 'native.stack', 'url.state', 'scratch', 'network.state', 'network.buffers',
    'page.text', 'page.script', 'page.records', 'forth.state', 'screen', 'palette', 'resident.low', 'resident.middle', 'resident.high', 'margin']);
  for (const c of built.resident.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  const interaction = [...built.phases.interact!.file]; if (corruptInteraction) interaction[3] = (interaction[3]! + 1) % 9841;
  const blocks = consoleFiles ? 81 : 54;
  const medium = new BlockMedium(blocks, false, createDiskImage({ blocks, volumeId: [0, 0, 1], files: {
    '/compile': built.phases.compile!.file, '/interact': interaction, '/download': built.phases.download!.file,
    ...(consoleFiles ? { '/console': built.phases.console!.file, '/notes': encodeText('x'.repeat(702) + 'tail'), ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [`/many/f${i}`, []])) } : {}),
    '/out': [1, 2, 3], ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`/box/f${i}`, []])),
  } })); m.attach(new BlockDevice([medium]));
  function execute(label: string) {
    m.poke(REG_P, built.resident.image.labels.get(label)!); m.sleep = null;
    expect(m.run(consoleFiles ? 20_000_000 : 5_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(110); return m.peek(2200);
  }
  expect(execute('entry')).toBe(0);
  function feed(wire: string, chunk = 216) {
    const cells = encodeText(wire);
    for (let i = 0; i < cells.length; i += chunk) {
      const part = cells.slice(i, i + chunk); part.forEach((v, j) => m.poke(1337 + j, v)); m.poke(2201, part.length);
      expect(execute('feed')).toBe(0);
    }
  }
  const snapshot = () => Array.from({ length: 2916 }, (_, i) => m.peek(2552 + i));
  return { m, execute, feed, snapshot };
}
const counted = (s: string) => `${s.length}:${s}`;
const source = ': LOAD 0 FIELD@ 0 TEXT! ;';
const page = (value: string) => `PAGE 1\nT 6:before\nF 9:/app/save\nI 1:x ${counted(value)}\nC ${counted(source)}\n`;

test.each([1, 216])('native compiler-to-interaction replacement preserves a sealed page, chunk=%i', chunk => {
  const r = driver(); expect(r.execute('load_compile')).toBe(0);
  expect(r.execute('init')).toBe(0); r.feed(page('after'), chunk); expect(r.execute('finish')).toBe(0);
  expect(r.m.peek(5434)).toBe(1); expect(r.m.peek(5363)).toBe(1);
  const retained = r.snapshot(); expect(r.execute('load_interact')).toBe(0); expect(r.snapshot()).toEqual(retained);
  expect(Array.from({ length: built.phases.interact!.length }, (_, i) => r.m.peek(built.base + i))).toEqual(built.phases.interact!.file.slice(4));
  expect(r.execute('run')).toBe(0); expect(Array.from({ length: 5 }, (_, i) => r.m.peek(2552 + i))).toEqual(encodeText('after'));
  expect(r.execute('form')).toBe(0); expect(r.m.peek(2202)).toBe(9); expect(r.m.peek(2203)).toBe(5711);
  expect(Array.from({ length: 9 }, (_, i) => r.m.peek(5711 + i))).toEqual([1, 1, ...encodeText('x'), 5, ...encodeText('after')]);
  expect(r.execute('request')).toBe(0);
  expect(decodeText(Array.from({ length: r.m.peek(2202) }, (_, i) => r.m.peek(5711 + i)))).toBe('GET /index HTTP/T1\nHost: home.world\nContent-Length: 0\n\n');
  expect(r.execute('submit')).toBe(0); expect(r.m.peek(5368)).toBe(1);
  expect(r.execute('draw')).toBe(0); expect(Array.from({ length: 5 }, (_, i) => r.m.peek(-9841 + i))).toEqual([... 'after'].map(c => c.charCodeAt(0)));
  expect(r.execute('view')).toBe(0); expect(r.m.peek(-9841)).toBe('a'.charCodeAt(0));
  expect(r.m.peek(-9841 + 27)).toBe(729 + 'x'.charCodeAt(0));
  r.m.poke(5368, 0); // Network controller has resolved the preceding SEND.
  expect(r.execute('ui_init')).toBe(0); expect(r.m.peek(5444)).toBe(2);
  expect(r.execute('ui_next')).toBe(0); expect(r.m.peek(5444)).toBe(2);
  expect(r.execute('focus')).toBe(0); expect(r.m.peek(2202)).toBe(2);
  expect(r.execute('edit')).toBe(0); expect(r.m.peek(2202)).toBe(6);
  expect(r.execute('form')).toBe(0); expect(r.m.peek(2202)).toBe(10);
  expect(decodeText(Array.from({ length: 6 }, (_, i) => r.m.peek(5715 + i)))).toBe('after?');
  expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('again'));
  expect(r.execute('finish')).toBe(0); expect(r.execute('load_interact')).toBe(0); expect(r.execute('run')).toBe(0);
  expect(Array.from({ length: 5 }, (_, i) => r.m.peek(2552 + i))).toEqual(encodeText('again'));
});
test('a corrupt interaction image cannot invoke LOAD even with a sealed retained dictionary', () => {
  const r = driver(true); expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('after'));
  expect(r.execute('finish')).toBe(0); expect(r.execute('load_interact')).toBe(-116); expect(r.execute('run')).toBe(-118);
  expect(Array.from({ length: 6 }, (_, i) => r.m.peek(2552 + i))).toEqual(encodeText('before'));
});
test('phase code consumes one explicit RAM reservation, not simultaneous executable backing', () => {
  expect(built.phases.compile!.length).toBeLessThanOrEqual(built.capacity);
  expect(built.phases.interact!.length).toBeLessThan(built.phases.compile!.length);
  expect(built.resident.modules.find(m => m.name === 'phaseSlot')!.reserved).toBe(built.capacity);
  expect(built.resident.modules.find(m => m.name === 'phaseSlot')!.emitted).toBe(0);
  for (const phase of Object.values(built.phases)) expect(phase.assembly.labels.get('phase_entry')).toBe(built.base);
});
test.each([
  [': SUBMIT ;', 0, 0], [': SUBMIT SEND ;', 0, 1], [': SUBMIT 1 ;', -86, 0],
])('interaction dispatch honors a defined SUBMIT without adding a default action: %s', (handler, status, action) => {
  const r = driver(); expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0);
  r.feed(`PAGE 1\nF 9:/app/save\nC ${counted(handler as string)}\n`); expect(r.execute('finish')).toBe(0);
  expect(r.execute('load_interact')).toBe(0); expect(r.execute('run')).toBe(0); // absent LOAD is a successful no-op
  expect(r.execute('submit')).toBe(status); expect(r.m.peek(5368)).toBe(action);
});
test('interaction hooks require an accepted page even when a dictionary is sealed', () => {
  const r = driver(); expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('after'));
  expect(r.execute('finish')).toBe(0); expect(r.execute('load_interact')).toBe(0);
  r.m.poke(5434, 0); expect(r.execute('run')).toBe(-110); expect(r.m.peek(5363)).toBe(0);
  expect(Array.from({ length: 6 }, (_, i) => r.m.peek(2552 + i))).toEqual(encodeText('before'));
});

test('disk-loaded interaction code polls the physical text device and edits retained page data', () => {
  const r = driver(); const keyboard = new TextDevice(); r.m.attach(keyboard);
  expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('after'));
  expect(r.execute('finish')).toBe(0); expect(r.execute('load_interact')).toBe(0); expect(r.execute('ui_init')).toBe(0);
  keyboard.queueText('Z'); expect(r.execute('poll')).toBe(0); expect(r.execute('poll')).toBe(1);
  expect(r.m.peek(-9841 + 27 + 10)).toBe(1458 + 32); // Caret follows the inserted character.
  expect(r.execute('form')).toBe(0); expect(decodeText(Array.from({ length: 6 }, (_, i) => r.m.peek(5715 + i)))).toBe('afterZ');
});

test('disk-loaded interaction code prepares and releases a frozen POST action', () => {
  const r = driver(); expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('after'));
  expect(r.execute('finish')).toBe(0); expect(r.execute('load_interact')).toBe(0); expect(r.execute('submit')).toBe(0);
  expect(r.execute('action_header')).toBe(0);
  expect(decodeText(Array.from({ length: r.m.peek(2202) }, (_, i) => r.m.peek(5711 + i)))).toBe('POST /app/save HTTP/T1\nHost: home.world\nContent-Length: 9\nContent-Type: application/x-troika-form\n\n');
  expect(r.execute('edit')).toBe(-123); expect(r.execute('action_body')).toBe(0);
  expect(Array.from({ length: r.m.peek(2202) }, (_, i) => r.m.peek(5711 + i))).toEqual([1, 1, ...encodeText('x'), 5, ...encodeText('after')]);
  expect(r.execute('action_clear')).toBe(0); expect(r.execute('edit')).toBe(0);
});
function downloadPath(r: ReturnType<typeof driver>, path: string) {
  encodeText(path).forEach((v, i) => r.m.poke(1337 + i, v)); r.m.poke(2201, path.length);
}
test.each(['/out', '/box/new'])('download phase atomically publishes binary content and returns to the retained page: %s', path => {
  const r = driver(); expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('retained'));
  expect(r.execute('finish')).toBe(0); const retained = r.snapshot(); expect(r.execute('load_download')).toBe(0);
  downloadPath(r, path); r.m.poke(2204, 1); r.m.poke(2205, 5); expect(r.execute('download_begin')).toBe(0);
  const bytes = [-9841, 0, 9841, -54, 54]; for (let i = 0; i < 243; i++) r.m.poke(6440 + i, bytes[i] ?? 0);
  expect(r.execute('download_append')).toBe(0); expect(r.execute('test_download_finish')).toBe(0); expect(r.m.peek(6976)).toBe(1);
  expect(r.snapshot()).toEqual(retained); expect(r.execute('read_download')).toBe(0); expect(r.m.peek(2202)).toBe(5);
  expect(Array.from({ length: 5 }, (_, i) => r.m.peek(6440 + i))).toEqual(bytes);
  expect(r.execute('load_interact')).toBe(0); expect(r.snapshot()).toEqual(retained); expect(r.execute('ui_init')).toBe(0);
});
test('download phase cancellation preserves the old file after writing an unpublished block', () => {
  const r = driver(); expect(r.execute('load_download')).toBe(0); downloadPath(r, '/out');
  r.m.poke(2204, 2); r.m.poke(2205, 1); expect(r.execute('download_begin')).toBe(0);
  for (let i = 0; i < 243; i++) r.m.poke(6440 + i, 7);
  expect(r.execute('download_append')).toBe(0); expect(r.execute('download_abort')).toBe(0);
  expect(r.execute('read_download')).toBe(0); expect(r.m.peek(2202)).toBe(3);
  expect(Array.from({ length: 3 }, (_, i) => r.m.peek(6440 + i))).toEqual([1, 2, 3]);
});


test('site-home key queues a same-origin GET and remains unread while a POST is pending', () => {
  const r = driver(); const keyboard = new TextDevice(); r.m.attach(keyboard);
  expect(r.execute('load_compile')).toBe(0); expect(r.execute('init')).toBe(0); r.feed(page('retained'));
  expect(r.execute('finish')).toBe(0); expect(r.execute('load_interact')).toBe(0); expect(r.execute('ui_init')).toBe(0);
  expect(r.execute('submit')).toBe(0); keyboard.queueTrytes([91]);
  expect(r.execute('poll')).toBe(-123); expect(r.m.read(68)).toBe(4); expect(r.m.peek(5368)).toBe(1);
  expect(r.execute('action_clear')).toBe(0); expect(r.execute('poll')).toBe(0);
  expect(r.m.peek(5368)).toBe(2);
  expect(decodeText(Array.from({ length: r.m.peek(5370) }, (_, i) => r.m.peek(5954 + i)))).toBe('http://home.world/index');
  expect(r.execute('action_header')).toBe(0);
  expect(decodeText(Array.from({ length: r.m.peek(2202) }, (_, i) => r.m.peek(5711 + i)))).toBe('GET /index HTTP/T1\nHost: home.world\nContent-Length: 0\n\n');
});


test('console paginates file and directory reads, closes interrupted handles and deletes files within guest RAM', () => {
  const r = driver(false, true);
  const keyboard = new TextDevice(); r.m.attach(keyboard);
  expect(r.execute('load_console')).toBe(0); expect(r.execute('run')).toBe(0);
  function key(value: number) { keyboard.queueTrytes([value]); return r.execute('console_poll_test'); }
  function command(text: string) { for (const value of encodeText(text)) expect(key(value)).toBe(0); expect(key(88)).toBe(0); return starterScreen(r.m); }
  expect(command('type /notes')).toContain('Enter: more');
  expect(r.m.peek(6960)).toBe(1);
  expect(key(88)).toBe(0); expect(starterScreen(r.m)).toContain('tail'); expect(r.m.peek(6960)).toBe(0);
  expect(command('dir /many')).toContain('Enter: more'); expect(r.m.peek(6960)).toBe(2);
  expect(key(88)).toBe(0); expect(starterScreen(r.m)).toContain('f9'); expect(r.m.peek(6960)).toBe(0);
  expect(command('rmdir /many')).toContain('error -21');
  expect(command('del /notes')).toContain('ok'); expect(command('type /notes')).toContain('error -12');
  expect(command('dir /many')).toContain('Enter: more');
  expect(key(91)).toBe(1); expect(r.m.peek(6960)).toBe(0);
  expect(r.execute('load_interact')).toBe(0);
});
