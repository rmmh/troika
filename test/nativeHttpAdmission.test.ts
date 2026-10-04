import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { createStarterWorld } from '../src/world/starter';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
function fixture(shared = false) {
  const s = createStarterWorld(source), role = shared ? 'server' : 'door';
  const m = s.machines[role], labels = s.images[role].image.labels;
  function call(label: string, argument = 0) {
    m.sleep = null;
    m.poke(-13, argument);
    m.poke(REG_S, 5709);
    m.poke(5709, labels.get('failed')!); // return to the production halt, which records A
    m.poke(REG_P, labels.get(label)!);
    expect(m.run(1_000_000)).toBe('sleep-forever');
    expect(m.peek(REG_S)).toBe(5710);
    return m.peek(2199);
  }
  expect(call('http_mux_init')).toBe(0);
  const select = (slot: number) => expect(call('http_mux_select', slot)).toBe(0);
  const state = (slot: number, http: number, method: number, opened = 0) => {
    select(slot); m.poke(2380, 4); m.poke(2493, http); m.poke(6219, method); m.poke(6960, opened);
  };
  return {m, call, select, state};
}

test.each([0, 1, 2])('writer slot %i waits for every parked reader without stopping responses', writer => {
  const f = fixture(), readers = [0, 1, 2].filter(slot => slot !== writer);
  for (const slot of readers) f.state(slot, 3, 1, 1);
  f.state(writer, 0, 2);
  expect(f.call('http_mux_admit')).toBe(1);
  expect(f.m.peek(2331)).toBe(writer);
  for (const slot of readers) {
    f.select(slot);
    expect(f.call('http_mux_admit')).toBe(0); // retained GET can drain
    f.m.poke(6960, 0); f.m.poke(2493, 4);
    f.select(writer);
    expect(f.call('http_mux_admit')).toBe(slot === readers[1] ? 0 : 1);
  }
  // Even after the last reader closes, the writer owns admission through dispatch.
  f.state(readers[0]!, 0, 1);
  expect(f.call('http_mux_admit')).toBe(1);
  f.select(writer); f.m.poke(2493, 1);
  expect(f.call('http_mux_admit')).toBe(0);
  expect(f.m.peek(2331)).toBe(-1);
  f.select(readers[0]!);
  expect(f.call('http_mux_admit')).toBe(0);
});

test.each([0, 6])('a disconnected writer releases admission at transport state %i', closed => {
  const f = fixture();
  f.state(1, 0, 2); expect(f.call('http_mux_admit')).toBe(0);
  f.state(2, 0, 1); expect(f.call('http_mux_admit')).toBe(1);
  f.select(1); f.m.poke(2380, closed);
  expect(f.call('http_mux_admit')).toBe(0);
  expect(f.m.peek(2331)).toBe(-1);
  f.select(2); expect(f.call('http_mux_admit')).toBe(0);
});

test('three full POST bodies live in their own parked transport without touching script RAM', () => {
  const f = fixture();
  for (let i = 0; i < 216; i++) f.m.poke(4010 + i, 777);
  for (const slot of [0, 1, 2]) {
    f.state(slot, 0, 2);
    for (let i = 0; i < 216; i++) {
      f.m.poke(6217, i + 1);
      expect(f.call('http_body', slot * 1000 + i + 1)).toBe(0);
    }
  }
  for (const slot of [1, 0, 2, 0, 1, 2]) {
    f.select(slot);
    expect(Array.from({length: 216}, (_, i) => f.m.peek(1607 + i)))
      .toEqual(Array.from({length: 216}, (_, i) => slot * 1000 + i + 1));
  }
  expect(Array.from({length: 216}, (_, i) => f.m.peek(4010 + i))).toEqual(Array(216).fill(777));
  f.m.poke(6217, 217);
  expect(f.call('http_body', 99)).toBeLessThan(0);
  expect(f.m.peek(1823)).toBe(0); // oversized input cannot overwrite the control frame
});

test('shared generated body excludes new dispatch while existing readers keep draining', () => {
  const f = fixture(true);
  for (let i = 0; i < 688; i++) f.m.poke(2552 + i, i + 1);
  f.state(0, 1, 1); f.m.poke(2496, 688);
  expect(f.call('http_mux_admit')).toBe(0); expect(f.m.peek(2333)).toBe(0);
  f.state(1, 0, 1); expect(f.call('http_mux_admit')).toBe(1);
  f.state(2, 3, 1, 1); f.m.poke(2496, 216);
  expect(f.call('http_mux_admit')).toBe(0); expect(f.m.peek(2333)).toBe(0);
  f.select(0);
  expect(Array.from({length:688},(_,i)=>f.m.peek(2552+i))).toEqual(Array.from({length:688},(_,i)=>i+1));
  // Last chunk is already copied into this client's retained TX. A missing ACK
  // must not prevent another client from using the now-unreferenced body arena.
  f.m.poke(2496,0); f.m.poke(2493,4); f.m.poke(2402,1);
  expect(f.call('http_mux_admit')).toBe(0); expect(f.m.peek(2333)).toBe(-1);
  f.select(1); expect(f.call('http_mux_admit')).toBe(0);
});
