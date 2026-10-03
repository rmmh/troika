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

  test('cooperative callback preserves live registers and rejects nested I/O even after completion', () => {
    const program = assemble(`@-9112
      M S 5710 W 2485 @service
      M A 1 M B 2 M C 8 M D 6440 M I 101 M J 102 M K 103 M L 104
      C S block_io W 6200 A H 0sAAA Z
service:
      R E 6201 I E 1 W 6201 E
      ; Finish the original hardware transfer before attempting nested I/O.
wait_device: R E 0s_BG N E Z J wait_device
      M A 2 M B Z M C Z M D 6440 C S block_io W 6202 A
      M A -77 M B -77 M C -77 M D -77 M E -77 M F -77
      M G -77 M H -77 M I -77 M J -77 M K -77 M L -77
      O S P
${driver}`);
    expect(program.diagnostics).toEqual([]);
    const medium = new BlockMedium(27);
    const data = Int16Array.from({ length: 243 }, (_, i) => i - 100);
    medium.write(8, data);
    const m = new Machine(); m.attach(new BlockDevice([undefined, undefined, medium]));
    for (const c of program.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    m.poke(REG_P, program.entry!);
    expect(m.run(100_000)).toBe('sleep-forever');
    expect(m.peek(6200)).toBe(0); expect(m.peek(6201)).toBe(1); expect(m.peek(6202)).toBe(-1);
    expect([-12, -11, -10, -5, -4, -3, -2].map(a => m.peek(a))).toEqual([2, 8, 6440, 101, 102, 103, 104]);
    expect(Array.from({ length: 243 }, (_, i) => m.peek(6440 + i))).toEqual(Array.from(data));
    expect(m.peek(2486)).toBe(0); expect(m.peek(REG_S)).toBe(5710);
    expect(medium.read(0)).toEqual(new Int16Array(243));
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
