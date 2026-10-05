import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { buildProgramCore, linkProgramOverlay } from '../src/firmware/programCore';
import { WORLD_BASIC_MODULES } from '../src/world/browserImages';
import { buildTerminalFirmware } from '../src/world/terminalImage';
import { BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeWide } from '../src/core/wide';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { decodeText } from '../src/core/textEncoding';
import { REG_P } from '../src/core/machine';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

test.each([false, true])('terminal boots with DHCP and exchanges routed text without web/Forth, native program overlay=%s', overlay => {
  const s = createStarterWorld(source);
  const core = overlay ? buildProgramCore(source, {name:'controller',source:`
program_boot: M S 5710 M B Z C S fs_mount N A Z J program_recover C S fs_check N A Z J program_recover
M A @path M B 9 J program_exec
program_menu: J program_boot
program_recover: W 2506 A W 2504 -2 H 0sAAA Z
path: "/terminal"`}) : undefined;
  const program = core ? linkProgramOverlay(core, [
    ...[...WORLD_BASIC_MODULES.filter(name=>!['block','fat','fatCheck','fatWrite'].includes(name)),
      'dns','dnsClient','dhcpClient','stream','streamData','url','browserConnect','text','telnetPhase','terminal']
      .map(name=>({name,source:source(name)})),
    {name:'terminalExit',source:'terminal_program_menu: J terminal_prompt'},
  ], 'terminal_entry') : undefined;
  const image = program?.image ?? buildTerminalFirmware(source);
  const boot = core?.image ?? image;
  expect(image.modules.some(module => /^(forth|page|http|console)/i.test(module.name))).toBe(false);
  expect(image.reserved).toBeLessThanOrEqual(9666);
  const m = s.world.addMachine('terminal');
  for (const c of boot.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, boot.image.entry!);
  s.world.addInterface('terminal', 4, [0, 2, 1], 'a');
  s.world.addDisk('terminal', [new BlockMedium(81, false, createDiskImage({blocks: 81, volumeId: [0, 0, 1], files: {'/net.seq': encodeWide(1), ...(program ? {'/terminal':program.file} : {})}}))]);
  const keys = new TextDevice(); m.attach(keys); m.attach(new DisplayDevice(a => m.peek(a), (a, v) => m.poke(a, v)));
  let deepest = 0;
  const write = m.write.bind(m);
  m.write = (a, v) => {
    if ((a >= -9112 && a <= -3686) || (a >= -3631 && a <= -365) || (a >= 365 && a <= 1336) || a >= 7007) {
      const inCore = core && m.peek(REG_P) >= -3631 && m.peek(REG_P) < core.end;
      if (!inCore || (a >= -3631 && a < core!.end)) throw new Error(`terminal modified code: ${a}`);
    }
    const sp = m.peek(6); if (sp < 5468 || sp > 5710) throw new Error(`terminal stack escaped: ${sp}`);
    deepest = Math.max(deepest, 5710 - sp); write(a, v);
  };
  const until = (done: () => boolean) => {
    const end = s.world.cycles + 30_000_000;
    while (!done() && s.world.cycles < end) { s.world.runCycles(6561); expect(m.peek(2504)).not.toBe(-2); }
    expect(done(), starterScreen(m)).toBe(true);
  };
  until(() => m.peek(2514) === 1 && starterScreen(m).includes('Host (Enter):'));
  expect(m.peek(2344)).toBe(3);
  for (let i = 0; i < 2; i++) {
    keys.queueText('echo.world'); keys.queueTrytes([TEXT_KEYS.activate]);
    until(() => starterScreen(m).includes('Native echo.'));
    until(() => m.peek(2514) === 1);
    if(i===0){
      const edit=(cells:number[])=>{keys.queueTrytes(cells);until(()=>m.peek(2514)===1&&m.read(68)!==4);};
      const type=(text:string)=>{keys.queueText(text);until(()=>m.peek(2514)===1&&m.read(68)!==4);};
      const line=()=>decodeText(Array.from({length:m.peek(5250)},(_,n)=>m.peek(2552+n)));
      m.poke(3799,733);m.poke(3962,919);
      type('AC');edit([TEXT_KEYS.left]);type('B');expect(line()).toBe('ABC');edit([TEXT_KEYS.activate]);until(()=>starterScreen(m).includes('\nABC'));
      type('draft');edit([TEXT_KEYS.up]);expect(line()).toBe('ABC');edit([TEXT_KEYS.down]);expect(line()).toBe('draft');edit(Array<number>(5).fill(TEXT_KEYS.backspace));
      type('AxBC');edit([TEXT_KEYS.left,TEXT_KEYS.left,TEXT_KEYS.left,TEXT_KEYS.delete]);expect(line()).toBe('ABC');edit([TEXT_KEYS.right,TEXT_KEYS.right,TEXT_KEYS.backspace,TEXT_KEYS.backspace,TEXT_KEYS.backspace]);expect(line()).toBe('');
      type('x'.repeat(80));edit([TEXT_KEYS.left]);type('Y');expect(line()).toBe('x'.repeat(80));edit([TEXT_KEYS.delete]);type('Y');expect(line()).toBe('x'.repeat(79)+'Y');edit([...Array<number>(80).fill(TEXT_KEYS.right),...Array<number>(80).fill(TEXT_KEYS.backspace)]);expect(line()).toBe('');
      edit([TEXT_KEYS.backspace,TEXT_KEYS.delete,TEXT_KEYS.left]);expect(m.peek(5257)).toBe(0);expect(m.peek(3799)).toBe(733);expect(m.peek(3962)).toBe(919);
    }
    keys.queueText(`Standalone ${i}`); keys.queueTrytes([TEXT_KEYS.activate]);
    until(() => starterScreen(m).includes(`\nStandalone ${i}`));
    keys.queueTrytes([TEXT_KEYS.home]);
    until(() => m.peek(2505) === 1 && m.peek(2514) === 1);
    expect(m.peek(2506)).toBe(0); expect(starterScreen(m)).toContain('Host (Enter):');
  }
  expect(deepest).toBeGreaterThan(0); expect(deepest).toBeLessThanOrEqual(120);
  console.log(`Terminal overlay=${overlay}: ${image.reserved + (core?.image.reserved ?? 0)}/12501 code cells; native stack ${deepest}/243; no Forth or HTTP.`);
}, 120_000);
