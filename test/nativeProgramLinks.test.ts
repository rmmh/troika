import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildWorldPrograms} from '../src/world/programImages';
import {linkProgramOverlay} from '../src/firmware/programCore';
import {createDiskImage} from '../src/firmware/diskImage';
import {createStarterWorld,starterScreen} from '../src/world/starter';
import {canCheckpoint} from '../src/world/checkpoint';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {encodeText,decodeText} from '../src/core/textEncoding';
import {encodeWide} from '../src/core/wide';
import {readNativeDisk} from './nativeDiskReader';
const source=(n:string)=>readFileSync(new URL(`../firmware/include/${n}.asm`,import.meta.url),'utf8');
const counted=(s:string)=>`${s.length}:${s}`;

test('native browser Run links publish checked downloads, launch twice and reject failed or corrupt programs',()=>{
 const p=buildWorldPrograms(source);
 const build=(id:number)=>linkProgramOverlay(p.core,[{name:'sample',source:`app_entry: W 2532 4 W 2533 ${id} W 2504 14 W 2514 1\napp_key: R E 68 N E 4 J app_key R E 69 N E 91 J app_key J program_menu`}],'app_entry');
 const one=build(901),two=build(902),bad=[...one.file];bad[4]=bad[4]!+1;
 const links=[['Plain text','/readme'],['Run first','/p0000'],['Run second','/p0001'],['Missing program','/p9999'],['Corrupt program','/p0002'],['Short program','/p0003']];
 const page='PAGE 1\nT 14:Launch fixture\n'+links.map(([name,path])=>`L ${counted(name!)} ${counted(path!)}\n`).join('');
 const disk=createDiskImage({blocks:81,volumeId:[0,0,2],files:{'/net.seq':encodeWide(1),'/public/index':encodeText(page),'/public/readme':encodeText('A plain linked document.'),'/public/p0000':one.file,'/public/p0001':two.file,'/public/p0002':bad,'/public/p0003':one.file.slice(0,-1)}});
 const s=createStarterWorld(source,{programs:true,web:false,chat:false,serverDisk:disk}),m=s.machines.client,k=s.keyboard;
 const until=(done:()=>boolean)=>{const end=s.world.cycles+40_000_000;while(!done()&&s.world.cycles<end)s.world.runCycles(6561);expect(done(),starterScreen(m)).toBe(true)};
 const idle=()=>canCheckpoint(s);const press=(key:number)=>{k.queueTrytes([key]);until(idle)};
 const home=()=>{k.queueText('1');until(idle);expect(starterScreen(m)).toContain('Launch fixture')};
 const runLink=(index:number)=>{for(let i=0;i<index;i++)press(TEXT_KEYS.next);k.queueTrytes([TEXT_KEYS.activate])};
 const events:number[]=[];const write=m.write.bind(m);m.write=(a,v)=>{if(a===2533&&(v===901||v===902))events.push(v);write(a,v)};
 k.queueText(' ');until(idle);press(TEXT_KEYS.activate);expect(starterScreen(m)).toContain('A plain linked document.');press(TEXT_KEYS.home);expect(starterScreen(m)).toContain('Launch fixture');
 // F3 on a Run link still opens the ordinary editable Save Link command.
 press(TEXT_KEYS.next);press(TEXT_KEYS.download);expect(decodeText(Array.from({length:m.peek(5225)},(_,i)=>m.peek(2552+i)))).toBe('get http://bbs.world/p0000 ');expect(events).toEqual([]);press(TEXT_KEYS.home);expect(starterScreen(m)).toContain('Launch fixture');
 runLink(1);until(()=>m.peek(2533)===901&&m.peek(2514)===1);expect(readNativeDisk(s.disks.client.image(),'/launch')).toEqual(one.file);k.queueTrytes([TEXT_KEYS.home]);until(()=>m.peek(2504)===11&&m.peek(2514)===1);home();
 // Failed HTTP publication retains the old launch file but must never execute it.
 runLink(3);until(()=>m.peek(2504)===5&&m.peek(2505)===1&&m.read(68)!==4);expect(events).toEqual([901]);expect(readNativeDisk(s.disks.client.image(),'/launch')).toEqual(one.file);press(TEXT_KEYS.home);
 runLink(2);until(()=>m.peek(2533)===902&&m.peek(2514)===1);expect(readNativeDisk(s.disks.client.image(),'/launch')).toEqual(two.file);k.queueTrytes([TEXT_KEYS.home]);until(()=>m.peek(2504)===11&&m.peek(2514)===1);home();
 for(const index of[4,5]){runLink(index);until(()=>m.peek(2504)===11&&m.peek(2514)===1);expect(m.peek(2506)).toBeLessThan(0);expect(events).toEqual([901,902]);home()}
 expect(p.core.image.reserved+p.web.resident.reserved).toBeLessThanOrEqual(12501);expect(p.web.phases.interact!.length).toBeLessThanOrEqual(1906);
},120_000);

import {linkFirmware} from '../src/firmware/link';
import {Machine,REG_P} from '../src/core/machine';
test('Run classification accepts only exact canonical /p plus four decimal digits',()=>{
 const code=linkFirmware([{name:'config',source:'$url_path_len: 6184\n$url_path: 6183\n$f_action: 5368\nentry: M S 5710 C S pu_program_link\ndone: H 0sAAA Z\npp_ok: M A Z O S P'}, {name:'link',source:source('pageProgramLink')},{name:'suffix',source:source('webProgram').slice(source('webProgram').indexOf('wp_program_digits:'))}]);
 for(const path of['/p0000','/p9840','/p9999','/p123','/p12345','/p12x4','/P1234','/a/p1234','/p-123','/index','/p12.4']){const m=new Machine();for(const c of code.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));encodeText(path).forEach((v,i)=>m.poke(5954+i,v));m.poke(6183,5954);m.poke(6184,path.length);m.poke(5368,2);m.poke(REG_P,code.image.labels.get('entry')!);expect(m.run(20_000,new Set([code.image.labels.get('done')!]))).toBe('breakpoint');expect(m.peek(5368),path).toBe(/^\/p[0-9]{4}$/.test(path)?6:2)}
});
