import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { createStarterWorld } from '../src/world/starter';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
function fixture() {
  const s = createStarterWorld(source), m = s.machines.door, labels = s.images.door.image.labels;
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
