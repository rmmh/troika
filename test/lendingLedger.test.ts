import {expect,test} from 'vitest';
import {assemble} from '../src/asm/assemble';
import {Machine,REG_P,REG_S} from '../src/core/machine';
import {LENDING_LEDGER_ALGORITHM} from '../src/world/software/lendingLedger';

const assembled=assemble(`@ -9000
$doc_report_len:2616
$doc_selected:2613
$doc_dirty:2614
$doc_message:2615
validate: C S doc_app_validate J done
command: C S doc_app_command J done
report: C S doc_app_report J done
initialize: C S doc_app_init J done
help: C S doc_app_key J done
done: J done
${LENDING_LEDGER_ALGORITHM}`);
const guards=[2999,3660,3809,3816,3819,3829,3899,3912,4699,4755];
function fixture(){
 expect(assembled.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
 const m=new Machine();for(const chunk of assembled.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));m.poke(REG_S,5710);
 for(const address of guards)m.poke(address,719);
 const invoke=(name:string,a=0,b=0,c=0)=>{m.poke(-13,a);m.poke(-12,b);m.poke(-11,c);m.poke(REG_P,assembled.labels.get(name)!);expect(m.run(800_000,new Set([assembled.labels.get('done')!]))).toBe('breakpoint');expect(m.peek(REG_S)).toBe(5710);for(const address of guards)expect(m.peek(address),`guard ${address}`).toBe(719);return m.peek(-13);};
 const input=(s:string)=>{for(let i=0;i<54;i++)m.poke(2552+i,s.charCodeAt(i)||0);};
 const record=(index:number,s:string)=>{m.poke(3000+55*index,s.length);for(let i=0;i<54;i++)m.poke(3001+55*index+i,s.charCodeAt(i)||0);};
 const read=(index:number)=>String.fromCharCode(...Array.from({length:m.peek(3000+55*index)},(_,i)=>m.peek(3001+55*index+i)));
 const runCommand=(s:string,index=0)=>{input(s);const result=invoke('command',2552,s.length,index);expect(String.fromCharCode(...Array.from({length:s.length},(_,i)=>m.peek(2552+i)))).toBe(s);return result;};
 const report=()=>{invoke('report');return String.fromCharCode(...Array.from({length:m.peek(2616)},(_,i)=>m.peek(3700+i)));};
 invoke('initialize');return{m,invoke,input,record,read,runCommand,report};
}

test('native lending syntax validates bounded records without mutating inputs or books',()=>{
 const f=fixture(),valid=['A||0','Moon Atlas|Iris|1','A'.repeat(24)+'|'+'B'.repeat(20)+'|99','A||00','A|B|09','Spaces in title|Two Words|20'];
 const invalid=[':Reserved||0','','A','A|B','|B|20','A|||0','A|B|0','A||1','A|B|-1','A|B|100','A|B|2x','A|B| 2','A|B|2|3','A'.repeat(25)+'||0','A|'+'B'.repeat(21)+'|20',' |B|10','Book|   |10','A||','A|B|','A|B|001'];
 for(let day=0;day<=99;day++){valid.push(`Book ${day}|Reader|${day||1}`);if(day)invalid.push(`Book||${day}`);}
 f.record(0,'Existing|Owner|20');for(const s of[...valid,...invalid]){f.input(s);const live=Array.from({length:660},(_,i)=>f.m.peek(3000+i));const result=f.invoke('validate',2552,s.length,0);expect(result,s).toBe(valid.includes(s)?0:-1);expect(Array.from({length:660},(_,i)=>f.m.peek(3000+i))).toEqual(live);expect(String.fromCharCode(...Array.from({length:s.length},(_,i)=>f.m.peek(2552+i))),s).toBe(s);}
});

test('native checkout and return update only selected book after full validation',()=>{
 const f=fixture();f.record(0,'Moon Atlas||0');f.record(1,'Garden Notes|Jun|7');
 expect(f.runCommand(':out Iris|20')).toBe(1);expect(f.read(0)).toBe('Moon Atlas|Iris|20');expect(f.m.peek(2614)).toBe(1);expect(f.read(1)).toBe('Garden Notes|Jun|7');
 for(const bad of[':out Sol|30',':day 0',':day -1',':day 100',':unknown',':in x']){const before=f.read(0);f.m.poke(2614,0);expect(f.runCommand(bad)).toBe(-1);expect(f.read(0)).toBe(before);expect(f.m.peek(2614)).toBe(0);}
 expect(f.runCommand(':in')).toBe(1);expect(f.read(0)).toBe('Moon Atlas||0');f.m.poke(2614,0);expect(f.runCommand(':in')).toBe(1);expect(f.m.peek(2614)).toBe(0);
 for(const bad of[':out |0',':out |10',':out Iris|0',':out Iris|100',':out '+'A'.repeat(21)+'|1',':out '+'A'.repeat(40)]){const before=f.read(0);expect(f.runCommand(bad)).toBe(-1);expect(f.read(0)).toBe(before);}
 expect(f.runCommand(':out New Reader|99')).toBe(1);expect(f.read(0)).toBe('Moon Atlas|New Reader|99');expect(f.runCommand(':out Iris|20',11)).toBe(-1);expect(f.read(11)).toBe('');
});

test('native overdue report handles due-today, returns and all twelve late slots',()=>{
 const f=fixture();f.record(0,'On shelf||0');f.record(1,'Yesterday|Iris|19');f.record(2,'Today|Jun|20');f.record(3,'Tomorrow|Sol|21');expect(f.runCommand(':day 20')).toBe(1);
 expect(f.report().slice(0,27).trim()).toBe('Day 20 Books 04 Out 03');expect(f.report().slice(27,54).trim()).toBe('Late 01: 02');
 f.m.poke(2613,2);expect(f.report().slice(81)).toBe('Due 20 current; ?: commands');
 f.m.poke(2613,1);expect(f.report().slice(81)).toBe('Due 19 LATE; ?: commands');
 expect(f.runCommand(':in',1)).toBe(1);expect(f.report().slice(27,54).trim()).toBe('Late 00: none');
 for(let i=0;i<12;i++)f.record(i,`Book${i}|Reader|1`);expect(f.runCommand(':day 99')).toBe(1);
 const report=f.report();expect(report.slice(0,27).trim()).toBe('Day 99 Books 12 Out 12');expect(report.slice(27,54)).toBe('Late 12: 01 02 03 04 05 06 ');expect(report.slice(54,81)).toBe('         07 08 09 10 11 12 ');expect(report.length).toBeLessThanOrEqual(108);
});

// Full integration uses the same physical keyboard and serial medium as the
// downloadable guest; restarting means a fresh CPU with only disk bytes kept.
import {documentAppFixture} from './documentAppFixture';
import {LENDING_LEDGER} from '../src/world/software/lendingLedger';
import {TEXT_KEYS} from '../src/core/textKeyboard';

test('Lending Ledger supports keyboard CRUD, circulation commands, help and invalid-edit recovery',()=>{
 const f=documentAppFixture(LENDING_LEDGER);for(const address of guards)f.m.poke(address,719);
 expect(f.screen()).toContain('Lending Ledger');expect(f.report()).toContain('Day 01 Books 00 Out 00');
 f.edit(0,'Moon Atlas||0');f.edit(1,'Garden Notes|Jun|7');expect(f.record(0)).toBe('Moon Atlas||0');expect(f.record(1)).toBe('Garden Notes|Jun|7');
 f.edit(0,':out Iris|20');expect(f.record(0)).toBe('Moon Atlas|Iris|20');f.edit(0,':day 21');expect(f.report()).toContain('Day 21 Books 02 Out 02');expect(f.report().slice(27,54).trim()).toBe('Late 02: 01 02');
 f.type('?');expect(f.screen()).toContain(':out NAME|DAY :in :day DAY');f.type('h');expect(f.screen()).toContain('TITLE|BORROWER|DUE (0=in)');
 for(const bad of['Bad loan|Iris|0',':out Other|30',':day 100']){
  f.edit(0,bad);expect(f.m.peek(2612)).toBe(1);expect(f.record(0)).toBe('Moon Atlas|Iris|20');f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);
 }
 f.edit(0,':in');expect(f.record(0)).toBe('Moon Atlas||0');f.edit(0,'Moon Atlas revised||0');expect(f.record(0)).toBe('Moon Atlas revised||0');
 f.edit(1,'');expect(f.record(1)).toBe('');expect(f.report()).toContain('Books 01 Out 00');
 for(const address of guards)expect(f.m.peek(address),`guard ${address}`).toBe(719);expect(f.m.stackHighWater).toBeLessThan(243);
 f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);expect(f.record(0)).toBe('Moon Atlas revised||0');
},60_000);

test('Lending Ledger loans survive native save, a fresh CPU, reload and return/save cycles',()=>{
 const first=documentAppFixture(LENDING_LEDGER);first.edit(0,'Moon Atlas||0');first.edit(1,'Garden Notes|Jun|7');first.edit(0,':out Iris|20');first.edit(0,':day 21');first.type('s');expect(first.m.peek(2614)).toBe(0);
 const second=documentAppFixture(LENDING_LEDGER,first.medium.image());expect(second.record(0)).toBe('Moon Atlas|Iris|20');expect(second.record(1)).toBe('Garden Notes|Jun|7');expect(second.report()).toContain('Day 01 Books 02 Out 02');expect(second.m.peek(2614)).toBe(0);
 second.edit(0,':in');second.edit(1,'');second.type('l');expect(second.m.peek(2612)).toBe(3);expect(second.record(0)).toBe('Moon Atlas||0');expect(second.record(1)).toBe('');second.type('d');expect(second.record(0)).toBe('Moon Atlas|Iris|20');expect(second.record(1)).toBe('Garden Notes|Jun|7');
 second.edit(0,':in');second.type('s');const third=documentAppFixture(LENDING_LEDGER,second.medium.image());expect(third.record(0)).toBe('Moon Atlas||0');expect(third.record(1)).toBe('Garden Notes|Jun|7');
 third.keyboard.queueTrytes([TEXT_KEYS.home]);third.m.run(100_000);expect(third.m.peek(2504)).toBe(11);expect(third.screen()).toContain('Troika programs');
},60_000);

import {readNativeDisk} from './nativeDiskReader';
import {createDiskImage} from '../src/firmware/diskImage';
import {norm} from '../src/core/tryte';

test('a checksum-valid but invalid saved loan is rejected without replacing live books',()=>{
 const good=documentAppFixture(LENDING_LEDGER);good.edit(0,'Moon Atlas|Iris|20');good.type('s');
 const cells=readNativeDisk(good.medium.image(),'/lending');expect(cells).toHaveLength(666);
 // Deliberately retain valid framing, padding and checksum while making the
 // loan semantically invalid: an existing borrower with due day zero.
 const length=cells[6]!;cells[7+length-2]=48;cells[7+length-1]=48;cells[5]=norm(cells.slice(6).reduce((a,b)=>a+b,0));
 const invalid=createDiskImage({blocks:27,volumeId:[0,0,1],files:{'/lending':cells}});
 const f=documentAppFixture(LENDING_LEDGER,invalid);expect(f.record(0)).toBe('');f.edit(0,'Keep this book||0');const before=f.medium.image();
 f.type('l');expect(f.m.peek(2612)).toBe(3);f.type('d');expect(f.record(0)).toBe('Keep this book||0');expect(f.m.peek(2614)).toBe(1);expect(f.medium.image()).toEqual(before);expect(f.report()).toContain('Books 01 Out 00');
},60_000);
