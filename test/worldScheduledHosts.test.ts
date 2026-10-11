import {expect, test} from 'vitest';
import {assemble} from '../src/asm/assemble';
import {Machine, REG_P} from '../src/core/machine';
import {World} from '../src/core/world';

function cpu(source: string) {
  const result = assemble(`@500\n${source}`);
  expect(result.diagnostics).toEqual([]);
  const machine = new Machine();
  for (const chunk of result.chunks) chunk.data.forEach((value, i) => machine.poke(chunk.addr + i, value));
  machine.poke(REG_P, 500);
  return machine;
}

test('indefinitely sleeping hosts are not scanned at every active CPU instruction', () => {
  const world = new World();
  world.addMachine('active', cpu('loop: I A 1\nJ loop'));
  for (let i = 0; i < 20; i++) world.addMachine(`idle${i}`, cpu('H 0sAAA Z'));
  world.advanceTo(20);
  // Count scheduler reads, not elapsed time, to avoid a machine-speed assertion.
  const hosts = (world as unknown as {ordered: {id: string; readyAt: number}[]}).ordered;
  let reads = 0;
  for (const host of hosts.filter(host => host.id.startsWith('idle'))) {
    let readyAt = host.readyAt;
    expect(readyAt).toBe(Infinity);
    Object.defineProperty(host, 'readyAt', {
      get() { reads++; return readyAt; },
      set(value: number) { readyAt = value; },
    });
  }
  world.advanceTo(10000);
  // They are inspected at call entry and the final synchronization boundary,
  // but not thousands of times while the active CPU runs between those points.
  expect(reads).toBeLessThan(20 * 40);
  expect(world.cycles).toBe(10000);
  expect(world.captureState().hosts.filter(host => host.id.startsWith('idle'))
    .every(host => host.readyAt === Infinity && host.phase === 'sleep')).toBe(true);
});
