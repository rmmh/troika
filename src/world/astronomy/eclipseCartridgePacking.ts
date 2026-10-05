import { BLOCK_SIZE } from '../../core/blockDevice';
import { packEclipseCatalogue } from './eclipsePacking';

/** Immutable raw medium: directory at block 0; 42 independently checked century files.
 * Directory cells 0..3 = E,C,1,42; cells 4..87 = (start block,length) pairs.
 * Solar centuries 1000..3000 precede the corresponding lunar centuries. */
export function buildEclipseCartridge(input: unknown): Int16Array {
  const files = packEclipseCatalogue(input);
  const blocks = 1 + files.reduce((n, file) => n + Math.ceil(file.cells.length / BLOCK_SIZE), 0);
  const image = new Int16Array(blocks * BLOCK_SIZE);
  image.set([69,67,1,42]);
  let block = 1;
  files.forEach((file, i) => {
    image.set([block,file.cells.length], 4+i*2);
    image.set(file.cells,block*BLOCK_SIZE);
    block += Math.ceil(file.cells.length/BLOCK_SIZE);
  });
  return image;
}
