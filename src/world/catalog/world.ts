import type { World } from '../../core/world';
import { REG_P } from '../../core/machine';
import { BlockMedium } from '../../core/blockDevice';
import { buildVirtualHostFirmware } from '../virtualHostImage';
import type { buildWebCatalog } from './pages';

/** Install initial media and CPUs. All subsequent serving executes guest code. */
export function addWebServers(world: World, source: (name: string) => string, catalog: ReturnType<typeof buildWebCatalog>) {
  const servers = catalog.clusters.map(cluster => {
    const id = `web${cluster.server}`, image = buildVirtualHostFirmware(source, cluster.hosts, cluster.server, cluster.plainPaths);
    const machine = world.addMachine(id);
    for (const chunk of image.image.chunks) chunk.data.forEach((v, i) => machine.poke(chunk.addr + i, v));
    machine.poke(REG_P, image.image.entry!);
    world.addInterface(id, 4, [0, 3, cluster.server], 'b');
    const disk = new BlockMedium(cluster.blocks, false, cluster.disk);
    const controller = world.addDisk(id, [disk]);
    return {id, image, machine, disk, controller};
  });
  return {catalog, servers};
}
