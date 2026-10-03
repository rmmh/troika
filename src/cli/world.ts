import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { createStarterWorld, starterScreen } from '../world/starter';
import { TEXT_KEYS } from '../core/textKeyboard';
import { ServerDiskFile } from './serverDiskFile';

declare const FIRMWARE_ROOT: string;
async function main() {
  let diskPath: string | undefined, smoke = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--smoke') smoke = true;
    else if (arg === '--server-disk' && args[i + 1] && !args[i + 1]!.startsWith('--') && !diskPath) diskPath = args[++i];
    else if (arg === '--help') { console.log('npm run world -- [--smoke] [--server-disk PATH]'); return; }
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const storage = diskPath ? new ServerDiskFile(diskPath) : undefined;
  let input: Interface | undefined;
  const stop = () => input?.close();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const session = createStarterWorld(name => readFileSync(join(FIRMWARE_ROOT, 'firmware/include', `${name}.asm`), 'utf8'), { serverDisk: storage?.image });
    const { world, machines, keyboard, controllers, disks } = session;
    function advanceUntil(done: () => boolean, limit = 100_000_000) {
      const deadline = world.cycles + limit;
      while (!done() && world.cycles < deadline) {
        world.runCycles(6561);
        if (machines.client.peek(2504) === -1) throw new Error(`browser failed: ${machines.client.peek(2505)}`);
        if (machines.server.peek(2199)) throw new Error(`server failed: ${machines.server.peek(2199)}`);
      }
      if (!done()) throw new Error('world did not become ready within the cycle budget');
    }
    const idle = () => machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(2488) === 0 && machines.client.peek(5368) === 0 && machines.client.read(68) !== 4;
    function settle() {
      advanceUntil(() => idle() && machines.server.peek(6960) === 0 && controllers.server.cyclesUntilCompletion() === Infinity);
      storage?.checkpoint(disks.server.image());
    }
    advanceUntil(() => machines.server.peek(2381) === 80);
    keyboard.queueText(' '); // Physical power-on key; firmware performs DHCP and DNS.
    settle();
    console.log(starterScreen(machines.client));
    if (storage) console.log(`\nServer disk: ${storage.path}`);
    if (smoke) {
      console.log(`\nReady: five native CPUs, two LANs, ${world.cycles} world cycles.`);
      return;
    }
    console.log('\nType text to edit; blank line or /enter activates. /next /previous /left /right /backspace /delete /up /down; /quit exits. Prefix literal / text with another /.');
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
    input?.close(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); storage?.close();
  }
}
await main();
