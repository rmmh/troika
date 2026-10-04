import {expect,test} from 'vitest';
import {assemble} from '../src/asm/assemble';
import {BAKERS_WORKSHEET_ALGORITHM} from '../src/world/software/bakersWorksheet';
import {REG_P} from '../src/core/machine';
import {FirmwareProbe} from './firmwareProbe';
import {worksheetReference,worksheetReport,worksheetVectors} from './bakersWorksheetReference';
const built=assemble(`@ -9000\n$doc_message:2615\n$doc_report_len:2616\n${BAKERS_WORKSHEET_ALGORITHM}\nws_test_entry: M S 5710 C S doc_app_report\nws_test_stop: J ws_test_stop`);
expect(built.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
const cases=worksheetVectors();
for(let offset=0;offset<cases.length;offset+=64)test(`worksheet bounded native formulas ${offset+1}..${Math.min(offset+64,cases.length)}`,()=>{
 for(const records of cases.slice(offset,offset+64)){
  const m=new FirmwareProbe(['mmio','native.stack','page.text','page.script','page.records']);for(const chunk of built.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  records.forEach((s,i)=>{expect(s.length).toBeLessThanOrEqual(54);m.poke(3000+i*55,s.length);[...s].forEach((c,j)=>m.poke(3001+i*55+j,c.charCodeAt(0)));});
  const original=Array.from({length:660},(_,i)=>m.peek(3000+i));
  const guards=[2999,3660,3699,3820,3831,3844,3849,3857,4009,4699,4844];for(const a of guards)m.poke(a,919);
  const expected=worksheetReference(records);
  for(let repeat=0;repeat<2;repeat++){
   m.poke(REG_P,built.labels.get('ws_test_entry')!);expect(m.run(500_000,new Set([built.labels.get('ws_test_stop')!]))).toBe('breakpoint');
   expect(Array.from({length:12},(_,i)=>m.peek(3832+i)),JSON.stringify(records)).toEqual(expected.map(r=>r.status));
   expect(Array.from({length:12},(_,i)=>m.peek(3808+i)),JSON.stringify(records)).toEqual(expected.map(r=>r.value));
   expect(m.peek(2616)).toBe(108);expect(String.fromCharCode(...Array.from({length:108},(_,i)=>m.peek(3700+i)))).toBe(worksheetReport(expected));
   expect(Array.from({length:660},(_,i)=>m.peek(3000+i))).toEqual(original);for(const a of guards)expect(m.peek(a)).toBe(919);expect(m.stackHighWater).toBeLessThan(243);
  }
 }
});

import {BAKERS_WORKSHEET} from '../src/world/software/bakersWorksheet';
import {documentAppFixture} from './documentAppFixture';
import {TEXT_KEYS} from '../src/core/textKeyboard';

test('worksheet edits dependencies and diagnostics through the physical keyboard, then saves/reloads formulas',()=>{
 const f=documentAppFixture(BAKERS_WORKSHEET);
 expect(f.core.image.reserved+f.built.image.reserved).toBeLessThanOrEqual(9666);
 expect(f.report()).toContain('C1=360');expect(f.report()).toContain('B2=15');
 f.edit(0,'240');expect(f.report()).toContain('C1=720');expect(f.report()).toContain('B2=30');expect(f.report()).toContain('C2=32');
 f.edit(1,'=C1');for(const name of ['B1','C1','B2','C2'])expect(f.report()).toContain(name+'=CYCLE');
 f.edit(1,'4');expect(f.report()).toContain('C1=960');expect(f.report()).toContain('C2=42');
 f.edit(3,'0');expect(f.report()).toContain('B2=DIV/0');expect(f.report()).toContain('C2=DIV/0');
 f.edit(3,'24');f.edit(0,'9841');expect(f.report()).toContain('C1=RANGE');
 f.edit(0,'120');f.edit(11,'=B1+');expect(f.report()).toContain('C4=SYNTAX');
 f.edit(11,'=C1/ -7');expect(f.report()).toContain('C4=-68');
 f.type('?');expect(f.screen()).toContain('A1..C4; =A1+2; / truncates');
 const saved=Array.from({length:12},(_,i)=>f.record(i)),expected=f.report();
 f.type('s');expect(f.m.peek(2614)).toBe(0);
 const reloaded=documentAppFixture(BAKERS_WORKSHEET,f.medium.image());
 expect(Array.from({length:12},(_,i)=>reloaded.record(i))).toEqual(saved);expect(reloaded.report()).toBe(expected);
 reloaded.edit(0,'600');expect(reloaded.report()).not.toBe(expected);reloaded.type('l');expect(reloaded.m.peek(2612)).toBe(3);reloaded.type('d');expect(reloaded.report()).toBe(expected);
 reloaded.keyboard.queueTrytes([TEXT_KEYS.home]);reloaded.m.run(100_000);expect(reloaded.m.peek(2504)).toBe(11);
 expect(f.m.stackHighWater).toBeLessThan(243);
});
