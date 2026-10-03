import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { decodeText } from '../src/core/textEncoding';

test('native trust lab previews literal input and grades locally without changing executable page data', () => {
  const { world, machines, keyboard } = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const client = machines.client;
  let failure = '';
  const originalWrite = client.write.bind(client);
  client.write = (address, value) => {
    if (address === 2505 && value < 0) failure = JSON.stringify(Object.fromEntries([2125,2380,2418,2486,2493,2499,2500,2503,2504,2505,6215,6225,6960].map(a=>[a,client.peek(a)])));
    originalWrite(address,value);
  };
  const idle = () => client.peek(2504) === 4 && client.peek(5446) === 1 && client.peek(2488) === 0 && client.peek(5368) === 0 && client.read(68) !== 4;
  function until(done: () => boolean) {
    const deadline = world.cycles + 100_000_000;
    while (!done() && world.cycles < deadline) {
      world.runCycles(6561); if (client.peek(2504) === 5) throw new Error(starterScreen(client) + '\n' + failure); expect(client.peek(2504)).not.toBe(-2); expect(machines.server.peek(2199)).toBe(0);
    }
    expect(done()).toBe(true);
  }
  const press = (...keys: number[]) => { keyboard.queueTrytes(keys); until(idle); };
  const open = () => press(...Array(7).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  until(() => machines.server.peek(2381) === 80); keyboard.queueText(' '); until(idle); open();
  expect(starterScreen(client)).toContain('Trust lab');
  expect(starterScreen(client)).toContain('Score: 0/2');
  expect(client.peek(5362)).toBe(10); expect(client.peek(5360)).toBeLessThanOrEqual(4739);
  expect(client.peek(5414)).toBe(18);
  const code = () => Array.from({ length: 729 }, (_, i) => client.peek(4010 + i));
  const compiled = code(), dictionary = client.peek(5361);
  const canonicalURL = Array.from({ length: 108 }, (_, i) => client.peek(5954 + i));
  function record(index: number) {
    const descriptor = 4739 + 18 * index, pointer = client.peek(descriptor + 1), length = client.peek(descriptor + 2);
    return decodeText(Array.from({ length }, (_, i) => client.peek(pointer + i)));
  }
  function edit(previous: string, value: string, score: number) {
    keyboard.queueTrytes(Array(previous.length).fill(TEXT_KEYS.backspace)); keyboard.queueText(value); until(idle);
    press(TEXT_KEYS.activate);
    expect(record(12)).toBe(`Score: ${score}/2`);
    expect(code()).toEqual(compiled); expect(client.peek(5361)).toBe(dictionary);
    expect(client.peek(5414)).toBe(18); expect(client.peek(5362)).toBe(10);
    expect(client.peek(5364)).toBe(0); expect(client.peek(5365)).toBe(0);
    expect(client.peek(5368)).toBe(0); expect(client.peek(6225)).toBe(200);
  }
  expect(record(2)).toBe('<b>Hello</b>');
  let previous = '<b>Hello</b>';
  for (const value of ['<b>literal</b>', 'L 4:Home 6:/index', 'x'.repeat(54), '']) {
    edit(previous, value, 0); expect(record(2)).toBe(value); previous = value;
  }
  press(TEXT_KEYS.next); edit('', '', 0); edit('', '12', 0); edit('12', 'a', 0); edit('a', '2', 0); edit('2', '1', 1);
  press(TEXT_KEYS.next); edit('', '1', 1); edit('1', '2', 2); edit('2', '0', 1); edit('0', '2', 2);
  expect(starterScreen(client)).toContain('Score: 2/2');
  // SUBMIT leaves the request URL unchanged and the accepted page active.
  expect(Array.from({ length: 108 }, (_, i) => client.peek(5954 + i))).toEqual(canonicalURL);
  press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(client.peek(6218)).toBe(1); expect(client.peek(5363)).toBe(0);
  expect(starterScreen(client)).toContain('Trust lab');
  press(TEXT_KEYS.home); open();
  expect(record(12)).toBe('Score: 0/2'); expect(record(2)).toBe('<b>Hello</b>');
}, 60_000);
