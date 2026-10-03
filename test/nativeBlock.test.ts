import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { BlockDevice, BlockMedium } from '../src/core/blockDevice';
import { auditClientImage } from '../src/firmware/layout';

const driver = readFileSync(new URL('../firmware/include/block.asm', import.meta.url), 'utf8');

describe('native block driver', () => {
  test('copies between guest RAM and a selected disk entirely through guest instructions', () => {
    const program = assemble(`@-9112
      M S 5710
      M A 2
      M B 2
      M C 80
      M D 6440
      C S block_io
      M J A
      M F D
      M G 243
clear: W F Z
      I F 1
      I G -1
      N G Z J clear
      M A 1
      C S block_io
      H 0sAAA Z
${driver}`);
    expect(program.diagnostics).toEqual([]);
    const usage = auditClientImage(program.chunks);
    expect(usage.used).toBeLessThan(243);
    const medium = new BlockMedium(81);
    const machine = new Machine();
    machine.attach(new BlockDevice([undefined, undefined, medium]));
    for (const chunk of program.chunks) chunk.data.forEach((v, i) => machine.poke(chunk.addr + i, v));
    const data = Int16Array.from({ length: 243 }, (_, i) => i * 79 - 9500);
    data.forEach((v, i) => machine.poke(6440 + i, v));
    machine.poke(REG_P, program.entry!);
    expect(machine.run(100_000)).toBe('sleep-forever');
    expect(machine.peek(-13)).toBe(0); // A
    expect(machine.peek(-4)).toBe(0); // J: WRITE result
    expect(machine.peek(REG_S)).toBe(5710);
    expect(medium.read(80)).toEqual(data);
    expect(Int16Array.from({ length: 243 }, (_, i) => machine.peek(6440 + i))).toEqual(data);
  });

  test.each([-1, 27])('rejects invalid unit %i without silently using the previously selected drive', unit => {
    const program = assemble(`@-9112\nM S 5710\nM A 2\nM B ${unit}\nM C 0\nM D 6440\nC S block_io\nH 0sAAA Z\n${driver}`);
    expect(program.diagnostics).toEqual([]);
    const medium = new BlockMedium(27);
    const m = new Machine(); m.attach(new BlockDevice([medium]));
    for (const c of program.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    m.poke(6440, 99); m.poke(REG_P, program.entry!);
    expect(m.run(100_000)).toBe('sleep-forever');
    expect(m.peek(-13)).toBe(-6);
    expect(medium.read(0)[0]).toBe(0);
  });
});
