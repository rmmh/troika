import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { createStarterWorld, starterScreen } from '../world/starter';
import { TEXT_KEYS } from '../core/textKeyboard';
import { DiskFile } from './diskFile';
import { canCheckpoint, clientFirmwareDescriptor } from '../world/checkpoint';

declare const FIRMWARE_ROOT: string;
async function main() {
  let serverPath: string | undefined, clientPath: string | undefined, archivePath: string | undefined, smoke = false, npc = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--smoke') smoke = true;
    else if (arg === '--npc') npc = true;
    else if (arg === '--server-disk' && args[i + 1] && !args[i + 1]!.startsWith('--') && !serverPath) serverPath = args[++i];
    else if (arg === '--client-disk' && args[i + 1] && !args[i + 1]!.startsWith('--') && !clientPath) clientPath = args[++i];
    else if (arg === '--archive-disk' && args[i + 1] && !args[i + 1]!.startsWith('--') && !archivePath) archivePath = args[++i];
    else if (arg === '--help') { console.log('npm run world -- [--smoke] [--npc] [--server-disk PATH] [--client-disk PATH] [--archive-disk PATH]'); return; }
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const storage: Partial<Record<'server' | 'client' | 'archive', DiskFile>> = {};
  let input: Interface | undefined;
  const stop = () => input?.close();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    if (serverPath) storage.server = new DiskFile(serverPath);
    if (archivePath) storage.archive = new DiskFile(archivePath);
    const source = (name: string) => readFileSync(join(FIRMWARE_ROOT, 'firmware/include', `${name}.asm`), 'utf8');
    let session = createStarterWorld(source, { npc, serverDisk: storage.server?.image, archiveDisk: storage.archive?.image });
    if (clientPath) {
      // Bind disk-loaded native phases to the exact linked resident and initial phase images.
      const identity = createHash('sha256').update(clientFirmwareDescriptor(session)).digest('hex');
      storage.client = new DiskFile(clientPath, identity);
      if (storage.client.image) session = createStarterWorld(source, { npc, serverDisk: storage.server?.image, archiveDisk: storage.archive?.image, clientDisk: storage.client.image });
    }
    const { world, machines, keyboard, disks } = session;
    function advanceUntil(done: () => boolean, limit = 100_000_000) {
      const deadline = world.cycles + limit;
      while (!done() && world.cycles < deadline) {
        world.runCycles(6561);
        if (machines.client.peek(2504) === -2) throw new Error(`browser failed: ${machines.client.peek(2505)}`);
        for (const name of ['server', 'archive', 'door', 'telnet'] as const) {
          if (machines[name].peek(2199)) throw new Error(`${name} failed: ${machines[name].peek(2199)}`);
        }
      }
      if (!done()) throw new Error('world did not become ready within the cycle budget');
    }
    function settle() {
      // Disk-loaded interactive modes keep their phase live while accepting keys.
      // Their native input hint allows presentation, but never a disk checkpoint.
      advanceUntil(() => canCheckpoint(session) ||
        (machines.client.peek(2488) === 2 && machines.client.peek(2514) === 1 && machines.client.read(68) !== 4));
      if (!canCheckpoint(session)) return;
      storage.server?.checkpoint(disks.server.image());
      storage.archive?.checkpoint(disks.archive.image());
      storage.client?.checkpoint(disks.client.image());
    }
    advanceUntil(() => machines.server.peek(2381) === 80 && machines.archive.peek(2381) === 80 && machines.door.peek(2381) === 80);
    keyboard.queueText(' '); // Physical power-on key; firmware performs DHCP and DNS.
    settle();
    session.npc?.keyboard.queueText(' ');
    console.log(starterScreen(machines.client));
    if (storage.server) console.log(`\nServer disk: ${storage.server.path}`);
    if (storage.archive) console.log(`Archive disk: ${storage.archive.path}`);
    if (storage.client) console.log(`Client disk: ${storage.client.path}`);
    if (smoke) {
      if (session.npc) advanceUntil(() => session.npc!.machine.peek(2325) > 0);
      console.log(`\nReady: ${Object.keys(machines).length + Number(!!session.npc)} native CPUs, two LANs, ${world.cycles} world cycles.`);
      return;
    }
    console.log('\nType text to edit; blank line or /enter activates. /next /previous /left /right /backspace /delete /up /down /home /console /download; /quit exits. Prefix literal / text with another /.');
    input = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
    input.on('SIGINT', stop);
    input.setPrompt('world> '); input.prompt();
    for await (const line of input) {
      if (line === '/quit') { input.close(); break; }
      const literal = line.startsWith('//');
      const typed = literal ? line.slice(1) : line;
      const key = line === '' || line === '/enter' ? TEXT_KEYS.activate : TEXT_KEYS[line.slice(1) as keyof typeof TEXT_KEYS];
      if (!literal && key !== undefined && (line === '' || line.startsWith('/'))) keyboard.queueTrytes([key]);
      else if (!literal && line.startsWith('/')) { console.log('Unknown key command.'); input.prompt(); continue; }
      else if ([...typed].some(c => c < ' ' || c > '~')) { console.log('Use printable ASCII text.'); input.prompt(); continue; }
      else keyboard.queueText(typed);
      settle();
      console.log(starterScreen(machines.client)); input.prompt();
    }
  } finally {
    input?.close(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); for (const disk of Object.values(storage)) disk.close();
  }
}
await main();
