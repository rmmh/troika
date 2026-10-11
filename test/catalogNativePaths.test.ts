import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {linkFirmware} from '../src/firmware/link';
import {buildWorldPrograms} from '../src/world/programImages';
import {buildSoftwareDistribution} from '../src/world/software/native';
import {buildWebCatalog} from '../src/world/catalog/pages';
import {encodeText,decodeText} from '../src/core/textEncoding';
import {REG_P} from '../src/core/machine';
import {FirmwareProbe} from './firmwareProbe';

const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
// Execute the production guest resolver. The storage boundary answers existence
// from the actual published files, without reproducing path/bucket arithmetic.
const linked=linkFirmware([
  {name:'config',source:`$h_host_match: 2200
$h_path_len: 2201
$h_path: 2210
$url_kind: 2300
$url_port: 2301
$url_host_len: 2302
$url_host: 2310
$virtual_host_count: 1`},
  {name:'virtual',source:source('httpVirtual')},
  {name:'probe',source:`entry: M S 5710 W h_host_match 2240 C S http_virtual_lookup W 2199 A W 2193 2 H 0sAAA Z
fs_lookup: W 2191 A W 2192 B W 2193 1 H 0sAAA Z O S P
net_copy: E C Z O S P D A B I C -1 J net_copy
dns_equal: M A Z O S P
http_ok: M A Z O S P
hs_index: "/index"
virtual_hosts: 1 "axxx"`},
]);

test('every published URL resolves through native virtual paths to its actual file',()=>{
  const catalog=buildWebCatalog(buildSoftwareDistribution(buildWorldPrograms(source).core,source));
  const m=new FirmwareProbe(['mmio','network.state','native.stack','scratch']);
  for(const chunk of linked.image.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  let checked=0;
  for(const cluster of catalog.clusters)for(const host of cluster.hosts){
    const pages=catalog.pages.filter(page=>page.host===host.name).map(page=>({path:page.path,cells:page.cells}));
    const apps=catalog.software.filter(app=>`${app.site}.world`===host.name).flatMap(app=>[
      {path:app.path,cells:app.program.file},{path:app.sourcePath,cells:encodeText(app.publishedSource)},
    ]);
    for(const {path,cells}of [...pages,...apps]){
      const context=host.name+path;
      encodeText(host.directory).forEach((v,i)=>m.poke(2240+i,v));
      encodeText(path).forEach((v,i)=>m.poke(2210+i,v));
      m.poke(2201,path.length);m.poke(REG_P,linked.image.labels.get('entry')!);m.sleep=null;
      let resolved='',attempts=0;
      for(;;){
        expect(m.run(100_000),context).toBe('sleep-forever');
        if(m.peek(2193)===2)break;
        expect(++attempts,context).toBeLessThanOrEqual(2);
        const candidate=decodeText(Array.from({length:m.peek(2192)},(_,i)=>m.peek(m.peek(2191)+i)));
        const exists=Object.hasOwn(cluster.files,candidate);
        if(exists)resolved=candidate;
        m.poke(-13,exists?0:-12);m.sleep=null;
      }
      expect(m.peek(2199),context).toBe(0);
      expect(resolved,context).toBe(cluster.diskPaths[context]);
      expect(cluster.files[resolved],context).toEqual(cells);
      expect(m.peek(6),context).toBe(5710);
      checked++;
    }
  }
  expect(checked).toBe(catalog.pages.length+catalog.software.length*2);
},60_000);
