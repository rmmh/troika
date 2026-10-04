import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { linkFirmware } from '../src/firmware/link';
import { buildProgramImage } from '../src/firmware/programImage';
import { Machine, REG_P } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { createDiskImage } from '../src/firmware/diskImage';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
function fixture(corrupt?: (file: number[]) => void) {
  const coreEnd = -600;
  const core = linkFirmware([
    {name:'boot', source:'J entry\n$program_core_end: -600'},
    ...['block','fat','fatCheck','fatWrite','program'].map(name => ({name, source: source(name)})),
    {name:'controller', source:`
entry: M S 5710 M B Z C S fs_mount N A Z J program_recover C S fs_check N A Z J program_recover
M A @first M B 2 J program_exec
program_recover: W 2510 A H 0sAAA Z
first: "/a"`},
  ], {regions:[{start:-3631,size:coreEnd+3631}]});
  const external = {program_exec:core.image.labels.get('program_exec')!};
  const available = [{start:-9112,size:5427},{start:365,size:972},{start:7007,size:2835}];
  const a = linkFirmware([{name:'app',source:`entry: W 5225 123 M A @second M B 2 J program_exec\nsecond: "/b"`}], {allowMargin:true, regions:available, externals:external});
  const b = linkFirmware([{name:'app',source:'entry: R E 5225 W 2512 E W 2511 42 H 0sAAA Z\npadding//600'}, {name:'extra',source:'extra//1100'}], {allowMargin:true,regions:available});
  const first=buildProgramImage(a,a.image.labels.get('entry')!).file;
  const second=buildProgramImage(b,b.image.labels.get('entry')!).file;
  corrupt?.(second);
  const m=new Machine(); for(const c of core.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));
  m.poke(REG_P,core.image.entry!);
  m.attach(new BlockDevice([new BlockMedium(27,false,createDiskImage({blocks:27,volumeId:[0,0,1],files:{'/a':first,'/b':second}}))]));
  const immutable = core.image.chunks.map(c=>({addr:c.addr,data:[...c.data]}));
  const write=m.write.bind(m);
  m.write=(address,value)=>{if(address>=-3631&&address<coreEnd)throw new Error(`overwrote loader at ${address}`);write(address,value);};
  m.run(20_000_000);
  for(const c of immutable)expect(c.data.map((_,i)=>m.peek(c.addr+i))).toEqual(c.data);
  return m;
}
test('native loader replaces programs from disk and clears former application state',()=>{
  const m=fixture(); expect(m.peek(2510)).toBe(0); expect(m.peek(2511)).toBe(42); expect(m.peek(2512)).toBe(0);
});
test.each(['checksum','kernel','entry','truncated','wrapped'] as const)('program %s corruption returns to protected recovery', kind=>{
  const m=fixture(file=>{
    if(kind==='checksum')file[4]=file[4]!+1;
    if(kind==='kernel')file[5]=-3631;
    if(kind==='entry')file[2]=1337;
    if(kind==='truncated')file.pop();
    if(kind==='wrapped')file[6]=9841;
  });
  expect(m.peek(2510)).toBeLessThan(0); expect(m.peek(2511)).toBe(0);
});
