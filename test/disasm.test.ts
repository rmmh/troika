import { describe, expect, test } from 'vitest';
import { disassemble } from '../src/core/disasm';
import { instructionLength } from '../src/core/decode';
import { Machine } from '../src/core/machine';
import { fromTribbles, norm } from '../src/core/tryte';
import { DEFAULT_ORG, assemble } from '../src/asm/assemble';

function dis(tribbles: string): { text: string; length: number } {
  const m = new Machine();
  m.loadTribbles(tribbles, 0);
  return disassemble((a) => m.read(a), 0);
}

describe('disassemble', () => {
  test('hand cases', () => {
    expect(dis('AXY')).toEqual({ text: 'A X Y', length: 1 });
    expect(dis('___')).toEqual({ text: '___', length: 1 });
    expect(dis('J_N')).toEqual({ text: 'J 1', length: 1 });
    expect(dis('JAA')).toEqual({ text: 'J -364', length: 1 });
    expect(dis('MA_' + '__N')).toEqual({ text: 'M A 1', length: 2 });
    expect(dis('MAM' + 'PAA')).toEqual({ text: 'M A mem_PAA', length: 2 });
    expect(dis('MAO' + 'S_N')).toEqual({ text: 'M A S/1', length: 2 });
    expect(dis('SBM' + '_BC')).toEqual({ text: 'S B mem__BC', length: 2 });
    expect(dis('VAN')).toEqual({ text: 'V A 1', length: 1 });
    expect(dis('IAA')).toEqual({ text: 'I A -13', length: 1 });
    expect(dis('FAN')).toEqual({ text: 'F A 1', length: 1 });
    expect(dis('FAM')).toEqual({ text: 'F A -1', length: 1 });
    expect(dis('FAA')).toEqual({ text: 'F A -13', length: 1 });
    expect(dis('FAV')).toEqual({ text: 'F A 9', length: 1 });
    expect(dis('D_B')).toEqual({ text: 'D _ B', length: 1 });
    expect(dis('TAB' + 'BKD')).toEqual({ text: `T A B #${'TT00T0T0T'}`, length: 2 });
    expect(dis('CS_' + 'ABC')).toEqual({ text: `C S ${fromTribbles('ABC')}`, length: 2 });
    expect(dis('T__' + '__A' + '__B' + '__C')).toEqual({
      text: 'T -13 -12 #000000TT1',
      length: 4,
    });
  });

  test('fuzz: length always matches instructionLength and decode is total', () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    const m = new Machine();
    for (let trial = 0; trial < 2000; trial++) {
      for (let i = 0; i < 8; i++) m.poke(1000 + i, norm(rand()));
      const read = (a: number) => m.read(a);
      const d = disassemble(read, 1000);
      expect(d.length).toBeGreaterThanOrEqual(1);
      expect(d.length).toBeLessThanOrEqual(4); // T with two mode slots + table
      expect(d.length).toBe(instructionLength(read, 1000));
      expect(d.text.length).toBeGreaterThan(0);
    }
  });

  test('round-trip disassembled text back through assembler', () => {
    const cases = [
      'AXY',
      '___',
      'J_N',
      'JAA',
      'MA_' + '_NA',
      'MAM' + 'PAA',
      'MAO' + 'S_N',
      'SBM' + '_BC',
      'VAN',
      'IAA',
      'FAN',
      'FAM',
      'FAA',
      'FAV',
      'D_B',
      'TAB' + 'BKD',
      'CS_' + 'ABC',
      'T__' + '__A' + '__B' + '__C',
    ];

    for (const tribbles of cases) {
      const m = new Machine();
      m.loadTribbles(tribbles, DEFAULT_ORG);
      const d = disassemble((a) => m.read(a), DEFAULT_ORG);

      // Find all memory operands of the form mem_XYZ
      const matches = d.text.matchAll(/\bmem_([A-Z_]{3})\b/g);
      let prefix = '';
      for (const match of matches) {
        const label = match[0];
        const addrStr = match[1]!;
        const addr = fromTribbles(addrStr);
        prefix += `@${addr} ${label}:\n`;
      }

      const src = `${prefix}@${DEFAULT_ORG}\n${d.text}`;
      const r = assemble(src);
      const errors = r.diagnostics.filter((diag) => diag.severity === 'error');
      expect(errors, `Assembly errors for: ${d.text} (from tribbles ${tribbles})`).toEqual([]);

      const originalBytes = Array.from({ length: d.length }, (_, i) => m.read(DEFAULT_ORG + i));
      const chunk = r.chunks.find((c) => c.addr === DEFAULT_ORG);
      expect(chunk, `No chunk found at DEFAULT_ORG for: ${d.text}`).toBeDefined();
      expect(chunk!.data).toEqual(originalBytes);
    }
  });
});
