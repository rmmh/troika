import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built=linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','netDevice','frame','network','serial','dns','url','http','httpRequest','httpForm','noticeboard','topics','topicCatalog','xssPreview'].map(name=>({name,source:readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8')})).concat([{name:'app',source:`
entry: M B Z C S fs_mount N A Z J done C S fs_check W nb_topic @post_dispatch J done
post_dispatch: C S xss_preview_post N A -138 O S P J topic_post
post: M A 4010 R B 2201 C S http_form_parse N A Z J done C S http_file_post J done
open: M A 1337 R B 2203 C S fs_lookup N A Z J done C S fs_open J done
read: C S fs_read_next W 2202 B J done
close: C S fs_close J done
http_body: M A Z O S P
done: W 2200 A H 0sAAA Z`} ]));
function driver(files:Record<string,number[]>={}, saved?:Int16Array) {
  const m=new FirmwareProbe(['mmio','native.stack','filesystem','network.state','network.buffers','scratch','url.state','page.text','page.script','page.records']);
  for(const c of built.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_S,5710);
  const disk=new BlockMedium(81,false,saved??createDiskImage({blocks:81,volumeId:[0,0,2],files:{'/public/board':encodeText('PAGE 1\nT 5:Board\n'),...files}}));m.attach(new BlockDevice([disk]));
  function run(label:string) {m.sleep=null;m.poke(REG_P,built.image.labels.get(label)!);expect(m.run(20_000_000)).toBe('sleep-forever');expect(m.peek(REG_S)).toBe(5710);return m.peek(2200);}
  expect(run('entry')).toBe(0);
  function route(path:string){encodeText(path).forEach((v,i)=>m.poke(6196+i,v));m.poke(6226,path.length);}
  function preview(value:string, unsafe=true, field='src') {
    const body=[1,field.length,...encodeText(field),value.length,...encodeText(value)];
    body.forEach((v,i)=>m.poke(4010+i,v));m.poke(2201,body.length);route(unsafe?'/app/xunsafe':'/app/xsafe');return run('post');
  }
  function read(path:string){encodeText(path).forEach((v,i)=>m.poke(1337+i,v));m.poke(2203,path.length);expect(run('open')).toBe(0);const out:number[]=[];do{expect(run('read')).toBe(0);out.push(...Array.from({length:m.peek(2202)},(_,i)=>m.peek(6440+i)));}while(m.peek(2202));expect(run('close')).toBe(0);return decodeText(out);}
  return {m,disk,preview,read};
}

const payload=': LOAD 0 FIELD@ 1 TEXT! ;';
test('native unsafe and literal template fixtures store the same input with different record types',()=>{
  const r=driver();
  for(const unsafe of [true,false]) {
    expect(r.preview(payload,unsafe)).toBe(0);
    const page=r.read(unsafe?'/public/xunsafe':'/public/xsafe');
    expect(page).toContain(`I 3:src 54:${payload.padEnd(54)}\n`);
    expect(page.endsWith(`${unsafe?'C':'T'} 54:${payload.padEnd(54)}\n`)).toBe(true);
    expect(r.m.peek(6960)).toBe(0);
  }
  const retained=driver({},r.disk.image());
  expect(retained.read('/public/xunsafe')).toContain('C 54:');
  expect(retained.read('/public/xsafe')).not.toContain('C 54:');
});
test('literal template retains record-like newlines and invalid fields do not change its disk',()=>{
  const r=driver();const text='\nC 24:'+payload+'\n';
  expect(r.preview(text,false)).toBe(0);
  expect(r.read('/public/xsafe')).toContain(`T 54:${text.padEnd(54)}\n`);
  const before=r.disk.image();expect(r.preview('other',true,'wrong')).toBe(400);expect(r.disk.image()).toEqual(before);
  expect(r.preview('',false)).toBe(0);expect(r.read('/public/xsafe')).toContain('T 54:'+' '.repeat(54));
});
test('template creation returns 507 when its atomic replacement cannot fit',()=>{
  const r=driver({'/fill':Array(68*243).fill(1)});
  const before=r.disk.image();expect(r.preview(payload)).toBe(507);
  expect(r.m.peek(6960)).toBe(0);expect(r.disk.image()).toEqual(before);
});
