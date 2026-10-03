import { BLOCK_SIZE } from '../core/blockDevice';
import { encodeText } from '../core/textEncoding';
import { TRYTE_MAX, TRYTE_MIN } from '../core/tryte';
import type { Wide } from '../core/wide';

export interface DiskImageOptions {
  blocks?: number;
  volumeId: Wide;
  files?: Readonly<Record<string, ArrayLike<number>>>;
  directories?: readonly string[];
}

interface Node {
  name: string;
  children?: Map<string, Node>;
  content?: ArrayLike<number>;
  first?: number;
  count?: number;
}

/** Build-time scenario formatter only. No live guest filesystem operations. */
export function createDiskImage({ blocks = 729, volumeId, files = {}, directories = [] }: DiskImageOptions): Int16Array {
  if (!Number.isInteger(blocks) || blocks < 27 || blocks > 9841) throw new RangeError('volume capacity');
  if (!volumeId.some(v => v !== 0) || volumeId.some(v => !Number.isInteger(v) || v < TRYTE_MIN || v > TRYTE_MAX)) throw new RangeError('volume identity');
  const image = new Int16Array(blocks * BLOCK_SIZE);
  const fatBlocks = Math.ceil(blocks / BLOCK_SIZE);
  const rootStart = fatBlocks + 1;
  const dataStart = fatBlocks + 10;
  image.set([243, 27, 1, 2, 243, blocks, fatBlocks, rootStart, 9, dataStart, ...volumeId]);
  image.fill(-2, BLOCK_SIZE, (1 + fatBlocks) * BLOCK_SIZE);
  image.fill(0, BLOCK_SIZE + dataStart, BLOCK_SIZE + blocks);
  const root: Node = { name: '', children: new Map(), first: rootStart, count: 9 };
  function components(path: string, directory: boolean): string[] {
    if (!path.startsWith('/') || path.length > 171) throw new Error(`invalid fixture path: ${path}`);
    const parts = path.slice(1).split('/');
    if (parts.length > (directory ? 8 : 9) || parts.some(s => !/^[a-z0-9._-]{1,18}$/.test(s) || s === '.' || s === '..')) throw new Error(`invalid fixture path: ${path}`);
    return parts;
  }
  function parent(parts: string[]): Node {
    let at = root;
    for (const name of parts) {
      let next = at.children!.get(name);
      if (!next) { next = { name, children: new Map() }; at.children!.set(name, next); }
      if (!next.children) throw new Error('fixture path traverses a file');
      at = next;
    }
    return at;
  }
  for (const path of directories) parent(components(path, true));
  for (const [path, content] of Object.entries(files)) {
    const parts = components(path, false);
    const name = parts.pop()!;
    const at = parent(parts);
    if (at.children!.has(name)) throw new Error(`duplicate fixture entry: ${path}`);
    for (let i = 0; i < content.length; i++) if (!Number.isInteger(content[i]) || content[i]! < TRYTE_MIN || content[i]! > TRYTE_MAX) throw new Error('invalid fixture tryte');
    at.children!.set(name, { name, content });
  }
  let nextBlock = dataStart;
  function children(at: Node): Node[] { return [...at.children!.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0); }
  function allocate(at: Node): void {
    if (at.children && at.children.size > 81) throw new Error('fixture directory full');
    if (at !== root) {
      at.count = at.children ? Math.max(1, Math.ceil(at.children.size / 9)) : Math.ceil(at.content!.length / BLOCK_SIZE);
      at.first = at.count ? nextBlock : 0;
      if (nextBlock + at.count > blocks) throw new Error('fixture volume full');
      for (let i = 0; i < at.count; i++) image[BLOCK_SIZE + nextBlock + i] = i === at.count - 1 ? -1 : nextBlock + i + 1;
      nextBlock += at.count;
    }
    if (at.children) for (const child of children(at)) allocate(child);
  }
  allocate(root);
  function emit(at: Node): void {
    if (!at.children) { image.set(Array.from(at.content!), at.first! * BLOCK_SIZE); return; }
    children(at).forEach((child, i) => {
      const offset = at.first! * BLOCK_SIZE + i * 27;
      image.set([child.children ? 2 : 1, child.name.length, ...encodeText(child.name)], offset);
      image.set([child.first!, child.count!, child.children ? 243 : child.count ? (child.content!.length - 1) % 243 + 1 : 0], offset + 20);
      emit(child);
    });
  }
  emit(root);
  return image;
}
