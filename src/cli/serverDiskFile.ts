import { closeSync, fsyncSync, lstatSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { BLOCK_SIZE } from '../core/blockDevice';

const CELLS = 81 * BLOCK_SIZE;
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';

/** Host container for a physical disk, not a guest filesystem implementation.
 * Reopening it always accompanies a cold world boot with no retained traffic. */
export class ServerDiskFile {
  readonly path: string;
  readonly image: Int16Array | undefined;
  private lock: number | undefined;

  constructor(path: string) {
    const absolute = resolve(path);
    this.path = join(realpathSync(dirname(absolute)), basename(absolute));
    try { this.lock = openSync(`${this.path}.lock`, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Server disk is locked: ${this.path}.lock. Close the other session; remove a stale lock only after confirming that its process has exited.`);
      throw error;
    }
    try {
      writeFileSync(this.lock, `${process.pid}\n`);
      let bytes: Buffer;
      try {
        if (!lstatSync(this.path).isFile()) throw new Error('Server disk path must be a regular file');
        bytes = readFileSync(this.path);
      } catch (error) { if (missing(error)) return; throw error; }
      if (bytes.length !== CELLS * 2) throw new Error('Server disk must contain exactly 81 blocks of signed little-endian 16-bit trytes');
      const image = new Int16Array(CELLS);
      for (let i = 0; i < CELLS; i++) {
        const value = bytes.readInt16LE(i * 2);
        if (value < -9841 || value > 9841) throw new Error('Server disk contains an invalid tryte');
        image[i] = value;
      }
      this.image = image;
    } catch (error) { this.close(); throw error; }
  }

  checkpoint(image: Int16Array): void {
    if (this.lock === undefined) throw new Error('Server disk session is closed');
    if (image.length !== CELLS) throw new Error('Server disk size changed');
    const bytes = Buffer.alloc(CELLS * 2);
    for (let i = 0; i < CELLS; i++) {
      const value = image[i]!;
      if (value < -9841 || value > 9841) throw new Error('Server disk contains an invalid tryte');
      bytes.writeInt16LE(value, i * 2);
    }
    const staging = mkdtempSync(join(dirname(this.path), '.troika-disk-'));
    try {
      const temporary = join(staging, 'image');
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, this.path);
    } finally { rmSync(staging, { recursive: true, force: true }); }
  }

  close(): void {
    if (this.lock === undefined) return;
    closeSync(this.lock); this.lock = undefined;
    rmSync(`${this.path}.lock`, { force: true });
  }
}
