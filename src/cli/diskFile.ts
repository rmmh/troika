import { closeSync, fsyncSync, lstatSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { BLOCK_SIZE } from '../core/blockDevice';

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';

/** Host container for a physical disk, not a guest filesystem implementation.
 * Reopening it always accompanies a cold world boot with no retained traffic. */
export class DiskFile {
  readonly path: string;
  readonly image: Int16Array | undefined;
  private readonly header: Buffer;
  private readonly cells: number;
  private lock: number | undefined;

  constructor(path: string, firmwareIdentity?: string, blocks = 81) {
    if (blocks !== 81 && blocks !== 243) throw new Error('Unsupported disk capacity');
    this.cells = blocks * BLOCK_SIZE;
    if (firmwareIdentity !== undefined && !/^[a-f0-9]{64}$/.test(firmwareIdentity)) throw new Error('Invalid firmware identity');
    this.header = firmwareIdentity === undefined ? Buffer.alloc(0) : Buffer.from(`TROIKA DISK 1 ${firmwareIdentity}\n`, 'ascii');
    const absolute = resolve(path);
    this.path = join(realpathSync(dirname(absolute)), basename(absolute));
    try { this.lock = openSync(`${this.path}.lock`, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Disk is locked: ${this.path}.lock. Close the other session; remove a stale lock only after confirming that its process has exited.`);
      throw error;
    }
    try {
      writeFileSync(this.lock, `${process.pid}\n`);
      let bytes: Buffer;
      try {
        if (!lstatSync(this.path).isFile()) throw new Error('Disk path must be a regular file');
        bytes = readFileSync(this.path);
      } catch (error) { if (missing(error)) return; throw error; }
      if (bytes.length !== this.header.length + this.cells * 2) throw new Error(`Disk must contain exactly ${blocks} blocks of signed little-endian 16-bit trytes`);
      if (!bytes.subarray(0, this.header.length).equals(this.header)) throw new Error('Disk firmware mismatch: use the matching Troika build or a new client disk');
      const image = new Int16Array(this.cells);
      for (let i = 0; i < this.cells; i++) {
        const value = bytes.readInt16LE(this.header.length + i * 2);
        if (value < -9841 || value > 9841) throw new Error('Disk contains an invalid tryte');
        image[i] = value;
      }
      this.image = image;
    } catch (error) { this.close(); throw error; }
  }

  checkpoint(image: Int16Array): void {
    if (this.lock === undefined) throw new Error('Disk session is closed');
    if (image.length !== this.cells) throw new Error('Disk size changed');
    const bytes = Buffer.alloc(this.header.length + this.cells * 2);
    this.header.copy(bytes);
    for (let i = 0; i < this.cells; i++) {
      const value = image[i]!;
      if (value < -9841 || value > 9841) throw new Error('Disk contains an invalid tryte');
      bytes.writeInt16LE(value, this.header.length + i * 2);
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
