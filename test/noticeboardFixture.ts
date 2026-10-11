import {readFileSync} from 'node:fs';
import {expect} from 'vitest';
import {createStarterWorld, starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
export function boot(serverDisk?: Int16Array) {
  const session = createStarterWorld(source, { serverDisk });
  const { world, machines, keyboard } = session;
  function until(done: () => boolean) {
    const end = world.cycles + 100_000_000;
    while (!done() && world.cycles < end) {
      world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const idle = () => machines.client.peek(2504) === 4 && machines.client.peek(5446) === 1 && machines.client.peek(2488) === 0 && machines.client.peek(5368) === 0 && machines.client.read(68) !== 4;
  const press = (...keys: number[]) => { keyboard.queueTrytes(keys); until(idle); };
  const type = (text: string) => { keyboard.queueText(text); until(idle); };
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle);
  press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(machines.client)).toContain('Noticeboard');
  return { ...session, press, type };
}
