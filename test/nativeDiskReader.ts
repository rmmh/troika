import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { encodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { Machine, REG_P } from '../src/core/machine';
import { BlockDevice, BlockMedium, BLOCK_SIZE } from '../src/core/blockDevice';
import { headlessFatCheck } from '../src/world/headlessCheck';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
export function readNativeDisk(image: Int16Array, path: string) {
  // This reader has no display, so use the same larger native reference window
  // as production file servers. Every filesystem check still runs on the CPU.
  const linked = linkFirmware(['block','fat','fatCheck'].map(name=>({name,source:name==='fatCheck'?headlessFatCheck(source(name)):source(name)})).concat([{name:'app',source:`
entry: M S 5710 M B Z C S fs_mount N A Z J done C S fs_check N A Z J done
       M A 1337 M B ${path.length} C S fs_lookup N A Z J done C S fs_open J done
read: C S fs_read_next W 2201 B
done: W 2200 A H 0sAAA Z`} ]));
  const m = new Machine(); for (const c of linked.image.chunks) c.data.forEach((v,i)=>m.poke(c.addr+i,v));
  m.attach(new BlockDevice([new BlockMedium(image.length / BLOCK_SIZE,false,image)])); encodeText(path).forEach((v,i)=>m.poke(1337+i,v));
  function run(label:string) { m.sleep=null; m.poke(REG_P,linked.image.labels.get(label)!); expect(m.run(10_000_000)).toBe('sleep-forever'); expect(m.peek(2200)).toBe(0); }
  run('entry'); const cells:number[]=[];
  do { run('read'); cells.push(...Array.from({length:m.peek(2201)},(_,i)=>m.peek(6440+i))); } while(m.peek(2201));
  return cells;
}
