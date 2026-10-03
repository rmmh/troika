import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createStarterWorld, starterScreen } from '../world/starter';
import { TEXT_KEYS } from '../core/textKeyboard';

declare const FIRMWARE_ROOT: string;
const session = createStarterWorld(name => readFileSync(join(FIRMWARE_ROOT, 'firmware/include', `${name}.asm`), 'utf8'));
const { world, machines, keyboard } = session;
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
advanceUntil(() => machines.server.peek(2381) === 80);
keyboard.queueText(' '); // Physical power-on key; firmware performs DHCP and DNS.
advanceUntil(idle);
console.log(starterScreen(machines.client));
if (process.argv.includes('--smoke')) {
  console.log(`\nReady: five native CPUs, two LANs, ${world.cycles} world cycles.`);
} else {
  console.log('\nType text to edit; blank line or /enter activates. /next /previous /left /right /backspace /delete /up /down; /quit exits.');
  const input = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  input.setPrompt('world> '); input.prompt();
  for await (const line of input) {
    if (line === '/quit') { input.close(); break; }
    const key = line === '' || line === '/enter' ? TEXT_KEYS.activate : TEXT_KEYS[line.slice(1) as keyof typeof TEXT_KEYS];
    if (key !== undefined && (line === '' || line.startsWith('/'))) keyboard.queueTrytes([key]);
    else if (line.startsWith('/')) { console.log('Unknown key command.'); input.prompt(); continue; }
    else if ([...line].some(c => c < ' ' || c > '~')) { console.log('Use printable ASCII text.'); input.prompt(); continue; }
    else keyboard.queueText(line);
    advanceUntil(idle);
    console.log(starterScreen(machines.client)); input.prompt();
  }
}
