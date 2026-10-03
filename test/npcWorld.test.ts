import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { createDiskImage } from '../src/firmware/diskImage';
import { encodeText } from '../src/core/textEncoding';
import { encodeWide } from '../src/core/wide';
import { worldTestStage } from './worldDiagnostics';

test('an autonomous native browser revisits the board and observes a later visitor post',()=>{
  const code='VARIABLE mark : LOAD 42 mark ! ;';
  const serverDisk=createDiskImage({blocks:81,volumeId:[0,0,2],files:{
    '/net.seq':encodeWide(1),
    '/public/index':encodeText('PAGE 1\nH 23:Welcome to Troika World\nL 3:Lab 4:/lab\nL 5:Files 6:/files\nL 4:News 5:/news\nL 11:Noticeboard 6:/board\n'),
    '/public/board':encodeText(`PAGE 1\nH 11:Noticeboard\nF 9:/app/post\nI 3:msg 0:\nS 4:Post\nC ${code.length}:${code}\n`),
  }});
  const r=createStarterWorld(name=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8'),{npc:true,serverDisk});
  const npc=r.npc!;
  function until(done:()=>boolean) {
    const end=r.world.cycles+150_000_000;
    while(!done()&&r.world.cycles<end) {
      r.world.runCycles(6561);expect(r.machines.client.peek(2504)).not.toBe(-2);expect(npc.machine.peek(2504)).not.toBe(-2);
    }
    expect(done(),JSON.stringify({player:starterScreen(r.machines.client),npc:starterScreen(npc.machine),attempts:npc.machine.peek(2328),errors:npc.machine.peek(2326),status:npc.machine.peek(2327)})).toBe(true);
  }
  const idle=()=>canCheckpoint(r);
  until(()=>r.machines.server.peek(2381)===80&&r.machines.archive.peek(2381)===80&&r.machines.door.peek(2381)===80);
  r.keyboard.queueText(' ');until(idle);
  r.keyboard.queueTrytes([TEXT_KEYS.next,TEXT_KEYS.next,TEXT_KEYS.next,TEXT_KEYS.activate]);until(idle);
  expect(starterScreen(r.machines.client)).toContain('Noticeboard');
  expect(npc.machine.peek(2328)).toBe(0);
  worldTestStage('NPC first native GET');npc.keyboard.queueText(' ');until(()=>npc.machine.peek(2325)===1);
  expect(starterScreen(npc.machine)).toContain('Noticeboard');expect(npc.machine.peek(6218)).toBe(2);
  expect(npc.machine.peek(5361)).not.toBe(0);expect(npc.machine.peek(5333)).toBe(42);
  worldTestStage('visitor posts during NPC idle interval');r.keyboard.queueText('A visitor was here.');until(idle);r.keyboard.queueTrytes([TEXT_KEYS.activate]);until(idle);
  expect(starterScreen(r.machines.client)).toContain('A visitor was here.');
  worldTestStage('NPC native refresh');until(()=>npc.machine.peek(2325)>=2);
  expect(starterScreen(npc.machine)).toContain('A visitor was here.');
  expect(npc.machine.peek(2328)).toBeGreaterThanOrEqual(2);expect(npc.machine.peek(2327)).toBe(1);
  worldTestStage('NPC native link-loss retry');const errors=npc.machine.peek(2326);npc.nic.setLink(false);
  until(()=>npc.machine.peek(2326)>errors);expect(npc.machine.peek(2327)).toBeLessThan(0);
  const attempts=npc.machine.peek(2328);r.world.runCycles(6561);expect(npc.machine.peek(2328)).toBe(attempts);
  npc.nic.setLink(true);until(()=>npc.machine.peek(2325)>=3);expect(starterScreen(npc.machine)).toContain('A visitor was here.');
  expect(npc.machine.peek(6960)).toBe(0);expect(npc.image.reserved).toBeLessThanOrEqual(12501);
},180_000);
