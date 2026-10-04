import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { decodeWide } from '../src/core/wide';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
for (const programs of [false, true]) for (const fault of ['link', 'expiry'] as const) {
  test(`native browser clears live HTTP and DNS on lease ${fault} and reconnects, programs=${programs}`, () => {
    const session = createStarterWorld(source, {programs});
    const {world, machines, keyboard} = session;
    const client = machines.client;
    const until = (done: () => boolean, limit = 20_000_000) => {
      const end = world.cycles + limit;
      while (!done() && world.cycles < end) {
        world.runCycles(6561);
        expect(client.peek(2504), `terminal browser failure ${client.peek(2505)}`).not.toBe(-2);
      }
      expect(done(), `world=${world.cycles} browser=${client.peek(2504)} dhcp=${client.peek(2344)} stream=${client.peek(2380)}`).toBe(true);
    };
    until(() => machines.server.peek(2381) === 80);
    keyboard.queueText(' '); until(() => canCheckpoint(session));
    expect(starterScreen(client)).toContain('Welcome to Troika World');
    // A fresh home GET reuses the native DNS cache and starts a real routed stream.
    keyboard.queueTrytes([TEXT_KEYS.home]);
    until(() => client.peek(2380) === 4 && client.peek(2504) >= 1 && client.peek(2504) <= 3);
    expect(client.peek(2292)).toBeGreaterThan(0);
    const expiry = decodeWide([client.peek(2354), client.peek(2355), client.peek(2356)]);
    if (fault === 'link') world.queueAction({kind: 'link', host: 'client', slot: 4, connected: false});
    else {
      // Keep the stream incomplete and stop lease renewal without replacing either server.
      world.queueAction({kind: 'link', host: 'server', slot: 4, connected: false});
      world.queueAction({kind: 'link', host: 'dhcp', slot: 4, connected: false});
    }
    until(() => client.peek(2067) === 0 && client.peek(2380) === 0 && client.peek(2292) === 0);
    if (fault === 'expiry') expect(Math.floor(world.cycles / 6561)).toBeGreaterThanOrEqual(expiry);
    expect(Array.from({length: 9}, (_, i) => client.peek(2067 + i))).toEqual(new Array(9).fill(0));
    expect(client.peek(2290)).toBe(0); // No surviving DNS transaction.
    expect(client.peek(2085)).toBe(0); // No surviving neighbour cache.
    for (const host of fault === 'link' ? ['client'] : ['server', 'dhcp']) world.queueAction({kind: 'link', host, slot: 4, connected: true});
    until(() => client.peek(2344) === 3 && canCheckpoint(session));
    keyboard.queueTrytes([TEXT_KEYS.home]); until(() => canCheckpoint(session));
    expect(starterScreen(client)).toContain('Welcome to Troika World');
    expect(Array.from({length: 9}, (_, i) => client.peek(2067 + i))).toEqual([1,2,7,1,2,9,1,3,3]);
  }, 60_000);
}
