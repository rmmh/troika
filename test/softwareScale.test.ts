import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {buildProgramCore} from '../src/firmware/programCore';
import {SOFTWARE,buildNativeSoftware} from '../src/world/software/native';
import {buildWebCatalog} from '../src/world/catalog/pages';
import {buildVirtualHostFirmware} from '../src/world/virtualHostImage';
import {World} from '../src/core/world';
import {BlockMedium} from '../src/core/blockDevice';
import {REG_P} from '../src/core/machine';

const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('a synthetic thousand-program workload fits and cold-boots without skipping disk validation',()=>{
 // Capacity fixture only: repeated algorithms are not distinct applications and
 // never enter SOFTWARE. Freeze the representative population so later additions
 // cannot silently change the workload behind this performance regression.
 const population=SOFTWARE.filter(app=>app.number<=256);
 expect(population).toHaveLength(254);
 const core=buildProgramCore(source,{name:'menu',source:source('programMenu')});
 const fixtures=Array.from({length:1000},(_,i)=>{
  const app={...population[i%population.length]!,number:i+1,id:`syn-${String(i+1).padStart(4,'0')}`};
  const program=buildNativeSoftware(core,source,app);
  expect(core.image.reserved+program.image.reserved).toBeLessThanOrEqual(9666);
  const suffix=String(i).padStart(4,'0');
  return{...app,publishedSource:app.algorithm,path:`/p${suffix}`,sourcePath:`/c${suffix}`,pagePath:`/s${suffix}`,program};
 });
 const catalog=buildWebCatalog(fixtures);
 expect(catalog.software).toHaveLength(1000);
 for(const page of catalog.pages){expect(page.retained).toBeLessThanOrEqual(1458);expect(page.records).toBeLessThanOrEqual(27);expect(page.body.length).toBeLessThanOrEqual(2187);}
 const images=catalog.clusters.map(cluster=>{
  expect(cluster.blocks).toBeLessThanOrEqual(9841);expect(cluster.free).toBeGreaterThan(0);
  const image=buildVirtualHostFirmware(source,cluster.hosts,cluster.server,cluster.plainPaths);
  expect(image.reserved).toBeLessThanOrEqual(12501);return image;
 });
 const worst=catalog.clusters.reduce((a,b)=>a.blocks-a.free>b.blocks-b.free?a:b);
 const image=images[catalog.clusters.indexOf(worst)]!,world=new World(),machine=world.addMachine('capacity');
 for(const chunk of image.image.chunks)chunk.data.forEach((value,i)=>machine.poke(chunk.addr+i,value));
 machine.poke(REG_P,image.image.entry!);
 world.addInterface('capacity',4,[0,3,worst.server],'capacity');
 const medium=new BlockMedium(worst.blocks,false,worst.disk);world.addDisk('capacity',[medium]);
 while(world.cycles<40_000_000&&machine.peek(2198)!==1&&machine.peek(2199)===0)world.runCycles(Math.min(6561,40_000_000-world.cycles));
 const state=`cycles=${world.cycles} PC=${machine.peek(REG_P)} referenceWindow=${machine.peek(6987)}`;
 expect(machine.peek(2199),state).toBe(0);expect(machine.peek(2198),state).toBe(1);
 expect(medium.image()).toEqual(worst.disk);
 console.info(`Synthetic1000 native applications: web${worst.server}, ${worst.blocks}blocks, ready at${world.cycles}cycles`);
},60_000);
