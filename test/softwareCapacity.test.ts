import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildWorldPrograms } from '../src/world/programImages';
import { buildNativeSoftware, buildSoftwareDistribution } from '../src/world/software/native';
import { buildWebCatalog } from '../src/world/catalog/pages';
import { buildVirtualHostFirmware } from '../src/world/virtualHostImage';
import { World } from '../src/core/world';
import { REG_P } from '../src/core/machine';
import { BlockMedium } from '../src/core/blockDevice';
import { readNativeDisk } from './nativeDiskReader';
import { createStarterWorld } from '../src/world/starter';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
test('crowded 243-block fixture grows by real blocks and passes the native startup checker', () => {
  const core = buildWorldPrograms(source).core, software = buildSoftwareDistribution(core,source).filter(app => app.number <= 26);
  // Freeze this capacity boundary; production growth must not silently turn
  // the forced-growth test into a disk that was already large enough.
  expect(buildWebCatalog(software).clusters.find(cluster=>cluster.server===103)!.blocks).toBe(243);
  // A valid native image with a large reserved segment forces another FAT page.
  // This is a capacity fixture, not an extra catalog application.
  const original = software[0]!;
  const padded = {...original,algorithm:original.algorithm+'\napp_capacity_reservation//5000'};
  software[0] = {...padded,program:buildNativeSoftware(core,source,padded)};
  const cluster = buildWebCatalog(software).clusters.find(cluster=>cluster.server===103)!;
  expect(cluster.blocks).toBe(486);
  expect(cluster.free).toBeGreaterThan(0);
  const root = cluster.hosts.find(host=>host.name==='ternary.world')!.directory;
  expect(readNativeDisk(cluster.disk,`/public/${root}${padded.path}`)).toEqual(software[0]!.program.file);
  const image = buildVirtualHostFirmware(source,cluster.hosts,cluster.server,cluster.plainPaths);
  const world = new World(), m = world.addMachine('server');
  for (const chunk of image.image.chunks) chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  m.poke(REG_P,image.image.entry!); world.addInterface('server',4,[0,3,103],'lan');
  world.addDisk('server',[new BlockMedium(cluster.blocks,false,cluster.disk)]);
  while (world.cycles < 20_000_000 && m.peek(2198)!==1 && m.peek(2199)===0) world.runCycles(6561);
  expect(m.peek(2199)).toBe(0); expect(m.peek(2198)).toBe(1);
},60_000);


test('the complete software population cold-boots on its actual hosting disks', () => {
  const s = createStarterWorld(source, {programs:true,chat:false});
  const readyAt = new Map<number,number>();
  while (s.world.cycles < 40_000_000 && (readyAt.size < s.web!.servers.length || s.machines.dns.peek(2281)!==1)) {
    s.world.runCycles(6561);
    for (const [index,server] of s.web!.servers.entries()) {
      expect(server.machine.peek(2199)).toBe(0);
      if (server.machine.peek(2198)===1 && !readyAt.has(index)) readyAt.set(index,s.world.cycles);
    }
  }
  expect(readyAt.size).toBe(s.web!.servers.length);
  expect(s.machines.dns.peek(2281)).toBe(1);
  console.info('Production software cold boot:', s.web!.catalog.software.length, 'programs;',
    s.web!.catalog.clusters.map((cluster,index)=>`${cluster.server}: ${cluster.blocks} blocks, ready at ${readyAt.get(index)} world cycles`).join('; '));
},60_000);
