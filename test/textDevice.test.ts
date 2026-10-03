import { describe, expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { TextDevice } from '../src/core/textDevice';
import { decodeText, encodeChar, encodeText } from '../src/core/textEncoding';
import { fromTribbles } from '../src/core/tryte';

describe('text encoding', () => {
  test('round trips the supported printable rows', () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz .,:;!?-+/()\'"0123456789@#$%&*<=>[\\]^`{|}~\n';
    expect(decodeText(encodeText(chars))).toBe(chars);
  });

  test('round trips all printable ASCII plus newline', () => {
    const printable = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
    expect(decodeText(encodeText(printable + '\n'))).toBe(printable + '\n');
  });

  test('digit row starts at _NN', () => {
    expect(encodeChar('0')).toBe(fromTribbles('_NN'));
    expect(encodeChar('1')).toBe(fromTribbles('_NO'));
    expect(encodeChar('9')).toBe(fromTribbles('_NW'));
  });

  test('lowercase uses the readable __x row and uppercase uses _Mx', () => {
    expect(encodeChar('a')).toBe(fromTribbles('__A'));
    expect(encodeChar('z')).toBe(fromTribbles('__Z'));
    expect(encodeChar('A')).toBe(fromTribbles('_MA'));
    expect(encodeChar('Z')).toBe(fromTribbles('_MZ'));
  });

  test('zero tryte is reserved for null terminators, not visible underscore', () => {
    expect(encodeChar('_')).toBe(fromTribbles('_NY'));
    expect(decodeText([0])).toBe('<?>');
  });

  test('remaining printable ASCII uses the _O row', () => {
    expect(encodeChar('$')).toBe(fromTribbles('_OA'));
    expect(encodeChar('~')).toBe(fromTribbles('_OP'));
  });
});

describe('TextDevice', () => {
  test('debugger inspection and cycle previews preserve pending serial input', () => {
    const machine = new Machine();
    const dev = new TextDevice();
    machine.attach(dev);
    dev.queueText('ab');
    const rx = fromTribbles('_PB');
    expect(machine.inspect(rx)).toBe(encodeChar('a'));
    expect(machine.inspect(rx)).toBe(encodeChar('a'));
    machine.previewCyclesAt(rx);
    machine.cycleBoundsAt(rx);
    expect(machine.read(rx)).toBe(encodeChar('a'));
    expect(machine.inspect(rx)).toBe(encodeChar('b'));
    expect(machine.read(rx)).toBe(encodeChar('b'));
    expect(machine.inspect(rx)).toBe(0);
  });

  test('inspection falls back to backing RAM for a device without a safe read hook', () => {
    const machine = new Machine();
    const addr = fromTribbles('_PA');
    machine.poke(addr, 42);
    machine.attach({ id: 3, read: () => { throw new Error('destructive read'); } });
    expect(machine.inspect(addr)).toBe(42);
    expect(machine.inspect(fromTribbles('__Z'))).toBe(0);
    expect(() => machine.read(addr)).toThrow('destructive read');
  });

  test('reports status, pops input, appends output, and clears', () => {
    const dev = new TextDevice();
    expect(dev.isUnlocked()).toBe(false);
    expect(dev.hasActivity()).toBe(false);
    expect(dev.read(-13, 0)).toBe(3);
    expect(dev.hasActivity()).toBe(true);

    dev.queueText('a');
    expect(dev.hasActivity()).toBe(true);
    expect(dev.read(-13, 0)).toBe(4);
    expect(dev.read(-12, 0)).toBe(fromTribbles('__A'));
    expect(dev.read(-13, 0)).toBe(3);
    expect(dev.read(-12, 0)).toBe(0);

    expect(dev.write(-11, fromTribbles('__B'))).toBe(true);
    expect(dev.outputText()).toBe('b');
    expect(dev.write(-10, 0)).toBe(true);
    expect(dev.outputText()).toBe('');
    expect(dev.isUnlocked()).toBe(false);
    expect(dev.hasActivity()).toBe(false);
  });

  test('handles large queued input and preserves order across partial reads and appends', () => {
    const dev = new TextDevice();
    const source = 'abc'.repeat(50_000);
    dev.queueText(source);
    const prefix = Array.from({ length: 100_000 }, () => dev.read(-12, 0));
    expect(decodeText(prefix)).toBe(source.slice(0, 100_000));
    dev.queueTrytes([encodeChar('x'), encodeChar('y')]);
    const tail: number[] = [];
    while (dev.inspect(-13, 0) === 4) tail.push(dev.read(-12, 0));
    expect(decodeText(tail)).toBe(source.slice(100_000) + 'xy');
    expect(dev.read(-12, 0)).toBe(0);
    expect(dev.hasActivity()).toBe(true);
  });

  test('clearing buffers preserves terminal activity and hardware unlock state', () => {
    const dev = new TextDevice();
    dev.write(-9, 1);
    dev.queueText('pending');
    dev.write(-11, encodeChar('x'));
    dev.clearBuffers();
    expect(dev.outputText()).toBe('');
    expect(dev.outputTrytes()).toEqual([]);
    expect(dev.inspect(-13, 0)).toBe(3);
    expect(dev.isUnlocked()).toBe(true);
    expect(dev.hasActivity()).toBe(true);
    dev.write(-11, encodeChar('y'));
    expect(dev.outputText()).toBe('y');
    dev.reset();
    expect(dev.hasActivity()).toBe(false);
    expect(dev.isUnlocked()).toBe(false);
  });

  test('unlock register tracks lock state', () => {
    const dev = new TextDevice();
    expect(dev.read(-9, 0)).toBe(0);
    expect(dev.write(-9, 1)).toBe(true);
    expect(dev.isUnlocked()).toBe(true);
    expect(dev.read(-9, 0)).toBe(1);
    expect(dev.write(-9, 0)).toBe(true);
    expect(dev.isUnlocked()).toBe(false);
  });

  test('assembled program can echo through _PB/_PC', () => {
    const src = `
getc:
      R A _PA
      ifg A 3
        R A _PB
        W _PC A
        H Z Z
      end
      J getc
`;
    const result = assemble(src);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const machine = new Machine();
    const dev = new TextDevice();
    machine.attach(dev);
    for (const c of result.chunks) c.data.forEach((v, i) => machine.poke(c.addr + i, v));
    machine.poke(REG_P, result.chunks[0]!.addr);
    machine.poke(REG_S, fromTribbles('_ZZ'));
    dev.queueText('Z');

    expect(machine.run(1000)).toBe('sleep-forever');
    expect(dev.outputText()).toBe('Z');
  });
});
