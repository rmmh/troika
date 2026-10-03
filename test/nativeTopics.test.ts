import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { encodeText, decodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
const built=linkFirmware(['block','fat','fatCheck','fatWrite','fatMutate','fatGrow','fatAppend','netDevice','frame','network','serial','dns','url','http','httpRequest','httpForm','noticeboard','topics','topicCatalog'].map(name=>({name,source:readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8')})).concat([{name:'app',source:`
entry: M B Z C S fs_mount N A Z J done C S fs_check W nb_topic @topic_post J done
post: M A 4010 R B 2201 C S http_form_parse N A Z J done C S http_file_post J done
catalog: C S topic_catalog W 2202 C J done
open: M A 1337 R B 2203 C S fs_lookup N A Z J done C S fs_open J done
read: C S fs_read_next W 2202 B J done
close: C S fs_close J done
http_body: M A Z O S P
done: W 2200 A H 0sAAA Z`} ]));
function driver(files:Record<string,number[]>={}, saved?:Int16Array) {
  const m=new FirmwareProbe(['mmio','native.stack','forth.state','filesystem','network.state','network.buffers','scratch','url.state','page.text','page.script','page.records']);
  for(const c of built.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_S,5710);
  const disk=new BlockMedium(81,false,saved??createDiskImage({blocks:81,volumeId:[0,0,2],files:{'/public/board':encodeText('PAGE 1\nT 5:Board\n'),...files}}));m.attach(new BlockDevice([disk]));
  function run(label:string) {m.sleep=null;m.poke(REG_P,built.image.labels.get(label)!);expect(m.run(20_000_000)).toBe('sleep-forever');expect(m.peek(REG_S)).toBe(5710);return m.peek(2200);}
  expect(run('entry')).toBe(0);
  function route(path:string){encodeText(path).forEach((v,i)=>m.poke(6196+i,v));m.poke(6226,path.length);}
  function post(name:string,msg:string,create=true) {
    const body=[2,5,...encodeText('topic'),name.length,...encodeText(name),3,...encodeText('msg'),msg.length,...encodeText(msg)];
    body.forEach((v,i)=>m.poke(4010+i,v));m.poke(2201,body.length);route(create?'/app/newtopic':'/app/replytopic');return run('post');
  }
  function read(path:string){encodeText(path).forEach((v,i)=>m.poke(1337+i,v));m.poke(2203,path.length);expect(run('open')).toBe(0);const out:number[]=[];do{expect(run('read')).toBe(0);out.push(...Array.from({length:m.peek(2202)},(_,i)=>m.peek(6440+i)));}while(m.peek(2202));expect(run('close')).toBe(0);return decodeText(out);}
  function catalog(path='/topics'){route(path);expect(run('catalog')).toBe(1);return decodeText(Array.from({length:m.peek(2202)},(_,i)=>m.peek(2552+i)));}
  return {m,disk,post,read,catalog};
}
test('native topic creation, literal replies and duplicate protection survive a cold mount',()=>{
  const r=driver();expect(r.post('demo','First')).toBe(0);
  const original=r.read('/public/t_demo');expect(original).toContain('H 4:demo\n');expect(original).toContain('I 5:topic 4:demo\n');expect(original).toContain('F 15:/app/replytopic\n');
  expect(r.post('demo','replacement')).toBe(409);expect(r.read('/public/t_demo')).toBe(original);
  const literal='L 4:Home 6:/index\n';expect(r.post('demo',literal,false)).toBe(0);
  expect(r.read('/public/t_demo')).toBe(original+`T 54:${literal.padEnd(54)}\n`);
  expect(r.catalog()).toContain('L 4:demo 7:/t_demo\n');
  expect(r.post('abcdefghij','Ten')).toBe(0);expect(r.read('/public/t_abcdefghij')).toContain('I 5:topic 10:abcdefghij\n');
  const rebooted=driver({},r.disk.image());expect(rebooted.catalog()).toContain('/t_demo');expect(rebooted.read('/public/t_demo')).toContain(literal);
});
test.each(['','UPPER','../x','a-b','a/b','elevenchars','two words'])('rejects invalid topic names without changing disk: %s',name=>{
  const r=driver();const before=r.disk.image();expect(r.post(name,'hello')).toBe(400);expect(r.disk.image()).toEqual(before);
});
test('missing topics, empty messages and full pages preserve existing content',()=>{
  const r=driver();expect(r.post('missing','hello',false)).toBe(404);expect(r.post('demo','')).toBe(400);
  expect(r.post('demo','start')).toBe(0);let prior=r.read('/public/t_demo');
  while(prior.length<=1200){expect(r.post('demo','reply',false)).toBe(0);prior=r.read('/public/t_demo');}
  expect(r.post('demo','overflow',false)).toBe(409);expect(r.read('/public/t_demo')).toBe(prior);expect(r.m.peek(6960)).toBe(0);
});
test('topic catalog filters names and paginates without mutating disk',()=>{
  const files=Object.fromEntries(Array.from({length:20},(_,i)=>[`/public/t_n${String(i).padStart(2,'0')}`,encodeText('PAGE 1\n')]));
  const r=driver({...files,'/public/t_bad-name':[], '/public/t_abcdefghijk':[], '/public/t_':[]});const before=r.disk.image();
  const first=r.catalog();expect(first).toContain('L 3:n00 6:/t_n00\n');expect(first).toContain('/t_n17');expect(first).not.toContain('/t_n18');expect(first).toContain('L 4:Next 8:/topics2\n');
  const second=r.catalog('/topics2');expect(second).toContain('/t_n18');expect(second).toContain('/t_n19');expect(second).not.toContain('Next');expect(second).not.toContain('bad-name');expect(r.disk.image()).toEqual(before);
});


test('exhausted disk rejects topic creation and replies with 507 without changing media',()=>{
  const original='PAGE 1\nT 4:Demo\n';
  const r=driver({'/fill':Array(67*243).fill(1), '/public/t_demo':encodeText(original)});
  const before=r.disk.image();
  expect(r.post('new','first')).toBe(507);
  expect(r.post('demo','reply',false)).toBe(507);
  expect(r.m.peek(6960)).toBe(0);
  expect(r.read('/public/t_demo')).toBe(original);
  expect(r.disk.image()).toEqual(before);
});
