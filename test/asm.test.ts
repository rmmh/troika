import { describe, expect, test } from 'vitest';
import { DEFAULT_ORG, Session, assemble } from '../src/asm/assemble';
import { lex } from '../src/asm/lexer';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { fromTribbles, norm } from '../src/core/tryte';

const T = fromTribbles;

/** Assemble and return the flat tryte list starting at DEFAULT_ORG (single chunk). */
function asm(src: string): number[] {
  const r = assemble(src);
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  expect(r.chunks).toHaveLength(1);
  expect(r.chunks[0]!.addr).toBe(DEFAULT_ORG);
  return r.chunks[0]!.data;
}

function loadAndRun(src: string, regs: Record<string, number> = {}, maxSteps = 2000): Machine {
  const r = assemble(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const m = new Machine();
  for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, DEFAULT_ORG);
  m.poke(REG_S, T('_ZZ'));
  for (const [reg, v] of Object.entries(regs)) m.poke(T('__' + reg), v);
  for (let i = 0; i < maxSteps && m.read(REG_P) !== r.end; i++) m.step();
  expect(m.read(REG_P)).toBe(r.end);
  return m;
}

describe('lexer', () => {
  test('token classes', () => {
    const { tokens, diagnostics } = lex('MA_ foo_Bar9 -42 +7 83 #T01 a/3 ; comment\nx: @$');
    expect(diagnostics).toEqual([]);
    expect(tokens.map((t) => `${t.kind}:${t.text}`)).toEqual([
      'tribble:MA_',
      'ident:foo_Bar9',
      'numeric:-42',
      'numeric:+7',
      'numeric:83',
      'numeric:#T01',
      'ident:a',
      'symbol:/',
      'numeric:3',
      'ident:x',
      'symbol::',
      'symbol:@',
      'symbol:$',
    ]);
    expect(tokens[5]!.value).toBe(-8); // #T01 = -9 + 1
    expect(tokens[2]!.value).toBe(-42);
  });

  test('line and column tracking', () => {
    const { tokens } = lex('AAB\n  foo');
    expect(tokens[0]).toMatchObject({ line: 1, col: 1 });
    expect(tokens[1]).toMatchObject({ line: 2, col: 3 });
  });
});

describe('verbatim and inflection', () => {
  test('verbatim runs copy directly', () => {
    expect(asm('AABAACAAD')).toEqual([T('AAB'), T('AAC'), T('AAD')]);
    expect(asm('MA_ __N')).toEqual([T('MA_'), T('__N')]);
  });

  test('register inflection matches verbatim', () => {
    expect(asm('M A B')).toEqual([T('MAB')]);
    expect(asm('M AB')).toEqual([T('MAB')]); // operands may share a tribble run
    expect(asm('S B C')).toEqual([T('SBC')]);
  });

  test('immediate inflection injects _ mode', () => {
    expect(asm('M A 83')).toEqual([T('MA_'), 83]);
    expect(asm('M A #1T0T')).toEqual([T('MA_'), 27 - 9 - 1]); // small literals would compress to V
  });

  test('memory inflection injects M mode with label fixup', () => {
    expect(asm('M A player_x player_x: 42')).toEqual([T('MAM'), DEFAULT_ORG + 2, 42]);
  });

  test('3-tribble operand is a tryte literal immediate', () => {
    expect(asm('P A NNN')).toEqual([T('PA_'), 757]);
    expect(asm('M S _ZZ')).toEqual([T('MS_'), T('_ZZ')]);
    expect(asm('M A __N')).toEqual([T('VAN')]); // small literals still compress
  });

  test('C resolves a label target to an immediate address, like J', () => {
    expect(asm('C S sub sub: O S P')).toEqual([T('CS_'), DEFAULT_ORG + 2, T('OSP')]);
  });

  test('address-of-label operand resolved as immediate', () => {
    expect(asm('M A @target target: 42')).toEqual([T('MA_'), DEFAULT_ORG + 2, 42]);
  });

  test('indirect offset inflection', () => {
    expect(asm('M A S/1')).toEqual([T('MAO'), norm(fromTribbles('S__') + 1)]);
    expect(asm('M A B/-3')).toEqual([T('MAO'), norm(fromTribbles('B__') - 3)]);
  });

  test('bare numerics emit data trytes', () => {
    expect(asm('1 2 -3')).toEqual([1, 2, -3]);
  });
});

describe('validation and optimization', () => {
  test('small literal moves compress to class 2', () => {
    expect(asm('M A 1')).toEqual([T('VAN')]);
    expect(asm('A A 1')).toEqual([T('IAN')]);
    expect(asm('M A -13')).toEqual([T('VAA')]);
  });

  test('literal destination warns but assembles', () => {
    const r = assemble('M 5 B');
    expect(r.diagnostics).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/literal/) }),
    ]);
    expect(r.chunks[0]!.data).toEqual([T('M_B'), 5]);
  });

  test('class 2 oversized literal truncates with warning', () => {
    const r = assemble('I A 500');
    expect(r.diagnostics).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/truncat/) }),
    ]);
    expect(r.chunks[0]!.data).toEqual([T('IAA')]); // 500 wraps to -13
  });

  test('mode tribbles rejected as register operands', () => {
    const r = assemble('A A M');
    expect(r.diagnostics.some((d) => d.severity === 'error' && /addressing mode/.test(d.message))).toBe(true);
  });

  test('D requires plain registers', () => {
    expect(asm('D A B')).toEqual([T('DAB')]);
    expect(asm('D _ B')).toEqual([T('D_B')]);
    const r = assemble('D A 5');
    expect(r.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  test('T takes a numeric truth table operand', () => {
    expect(asm('T A B #TT00T0T0T')).toEqual([T('TAB'), T('BKD')]);
  });
});

describe('macros', () => {
  test('constants substitute anywhere', () => {
    expect(asm('$vram: 729  M A vram')).toEqual([T('MA_'), 729]);
  });

  test('parameterized macro (spec mod example)', () => {
    const src = '$mod/2: MX $1 QX $2 PX $2 S $1 X end  mod A B';
    expect(asm(src)).toEqual([T('MXA'), T('QXB'), T('PXB'), T('SAX')]);
    const m = loadAndRun(src, { A: 7, B: 3 });
    expect(m.read(T('__A'))).toBe(1); // 7 mod 3
  });

  test('outward-in: macros invoking macros', () => {
    expect(asm('$two: 2  $settwo/1: M $1 two end  settwo A')).toEqual([T('VAO')]); // M A 2 -> V A 2
  });

  test('arity errors are diagnosed', () => {
    const r = assemble('$f/2: A $1 $2 end  f A');
    expect(r.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
});

describe('control flow stdlib', () => {
  test('ife emits the complement predicate and exit jump', () => {
    // ife A B { V C 1 } -> N A B / J if_false / V C 1 / if_false:
    expect(asm('ife A B V C 1 end')).toEqual([T('NAB'), T('J_N'), T('VCN')]);
  });

  test('if/else defines each label exactly once', () => {
    expect(asm('ife A B V C 1 else V C 2 end')).toEqual([
      T('NAB'),
      T('J_O'), // to if_false (else entry), 2 trytes ahead
      T('VCN'),
      T('J_N'), // exit jump past the else body
      T('VCO'),
    ]);
  });

  test('sibling and nested ifs get unique labels', () => {
    const src = `
      ife A B  ife C D  V E 1  end  end
      ife A C  V E 2  end
    `;
    const r = assemble(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  test('control flow executes correctly', () => {
    const src = 'ife A B  M C 1  else  M C 2  end';
    expect(loadAndRun(src, { A: 5, B: 5 }).read(T('__C'))).toBe(1);
    expect(loadAndRun(src, { A: 5, B: 6 }).read(T('__C'))).toBe(2);
    const lt = 'ifl A B  M C 1  else  M C 2  end';
    expect(loadAndRun(lt, { A: -1, B: 0 }).read(T('__C'))).toBe(1);
    expect(loadAndRun(lt, { A: 1, B: 0 }).read(T('__C'))).toBe(2);
  });

  test('unbalanced end is diagnosed', () => {
    const r = assemble('end');
    expect(r.diagnostics.some((d) => /empty ID stack/.test(d.message))).toBe(true);
  });
});

describe('jumps and directives', () => {
  test('short backward jump', () => {
    expect(asm('loop: ___ J loop')).toEqual([0, norm(T('J__') - 2)]);
  });

  test('long jump expands to MP_ when out of short range', () => {
    const r = assemble('J far @1000 far: ___');
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.chunks).toEqual([
      { addr: DEFAULT_ORG, data: [T('MP_'), 1000] },
      { addr: 1000, data: [0] },
    ]);
  });

  test('@ origin with tribble or numeric address', () => {
    const r = assemble('@_OA 5 @100 7');
    expect(r.chunks).toEqual([
      { addr: T('_OA'), data: [5] },
      { addr: 100, data: [7] },
    ]);
  });

  test('label//size reserves uninitialized space', () => {
    const r = assemble('a: buf//10 b: 1');
    expect(r.labels.get('a')).toBe(DEFAULT_ORG);
    expect(r.labels.get('buf')).toBe(DEFAULT_ORG);
    expect(r.labels.get('b')).toBe(DEFAULT_ORG + 10);
    expect(r.chunks).toEqual([{ addr: DEFAULT_ORG + 10, data: [1] }]);
  });

  test('undefined and duplicate labels are errors', () => {
    expect(assemble('J nowhere').diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(assemble('x: ___ x:').diagnostics.some((d) => /duplicate/.test(d.message))).toBe(true);
  });
});

describe('end-to-end programs', () => {
  test('strlen with control-flow macros runs on the machine', () => {
    const src = `
            M B A
      loop: R C A
            ifn C Z
              I A 1
              J loop
            end
            S A B
    `;
    const m = new Machine();
    const r = assemble(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    const n = m.loadTribbles('TEST_STRING_', 100);
    m.poke(100 + n, 0); // null terminator
    m.poke(T('__A'), 100);
    m.poke(REG_P, DEFAULT_ORG);
    for (let i = 0; i < 1000 && m.read(REG_P) !== r.end; i++) m.step();
    expect(m.read(T('__A'))).toBe(4);
  });

  test('call/return round trip with a label target', () => {
    const src = `
            J main
      sub:  V A 7
            O S P
      main: C S sub
            M B A
    `;
    const m = loadAndRun(src);
    expect(m.read(T('__A'))).toBe(7);
    expect(m.read(T('__B'))).toBe(7);
    expect(m.read(REG_S)).toBe(T('_ZZ')); // stack balanced after return
  });
});

describe('incremental session', () => {
  test('forward references patch when defined', () => {
    const s = new Session();
    const r1 = s.feed('M A 83');
    expect(r1.committed).toBe(true);
    expect(r1.writes).toEqual([
      { addr: DEFAULT_ORG, value: T('MA_') },
      { addr: DEFAULT_ORG + 1, value: 83 },
    ]);

    const r2 = s.feed('J fwd');
    expect(r2.committed).toBe(true);
    expect(r2.result.pending).toEqual(['fwd']);

    const r3 = s.feed('fwd: M A 1');
    expect(r3.committed).toBe(true);
    expect(r3.result.pending).toEqual([]);
    // The earlier J is patched and the new instruction appears.
    expect(r3.writes).toEqual([
      { addr: DEFAULT_ORG + 2, value: T('J__') }, // jump offset 0: target is next tryte
      { addr: DEFAULT_ORG + 3, value: T('VAN') },
    ]);
  });

  test('error lines are not committed', () => {
    const s = new Session();
    expect(s.feed('Q A')).toMatchObject({ committed: false });
    expect(s.feed('A A B').committed).toBe(true);
  });
});

describe('0s septemvigesimal literals', () => {
  test('value and length', () => {
    expect(asm('M A 0sNNN')).toEqual(asm('M A NNN')); // = MA_ NNN
    expect(asm('M A 0sN')).toEqual([T('VAN')]); // 0sN = 1, small-literal compressed
    expect(asm('M Q 0sZZZ')).toEqual([T('MQ_'), 9841]);
  });

  test('self-delimits: identical with or without surrounding whitespace', () => {
    const want = [T('WZ_'), T('DPN')];
    expect(asm('W Z 0sDPN')).toEqual(want);
    expect(asm('WZ 0sDPN')).toEqual(want);
    expect(asm('WZ0sDPN')).toEqual(want);
    expect(asm('W Z0sDPN')).toEqual(want);
  });
});

describe('tribble-run equivalence: whitespace between tribbles is insignificant', () => {
  // Every grouping of a run's tribble characters must assemble identically.
  const sameAcross = (variants: string[]) => {
    const want = asm(variants[0]!);
    for (const v of variants) expect(asm(v), `${JSON.stringify(v)} -> ${want}`).toEqual(want);
  };

  test('class 1 two-operand (registers), single instruction', () => {
    sameAcross(['MAB', 'M A B', 'MA B', 'M AB']); // = MAB
    sameAcross(['SBC', 'S B C', 'SB C', 'S BC']);
  });

  test('class 1, multiple instructions straddling token boundaries', () => {
    // A A B ; M C D  -> [AAB, MCD], however the spaces fall.
    sameAcross(['AABMCD', 'A A B M C D', 'AAB MCD', 'AA BM CD', 'A AB MC D']);
  });

  test('class 2 immediate-tribble (V/I/F)', () => {
    sameAcross(['IAN', 'I A N', 'IA N', 'I AN']); // I A, +1
    sameAcross(['IANVAN', 'I A N V A N', 'IA NV AN', 'IAN VAN']);
  });

  test('D (DATABLAST) and predicates (G/L/E/N)', () => {
    sameAcross(['DAB', 'D A B', 'DA B', 'D AB']);
    sameAcross(['EAB', 'E A B', 'EA B', 'E AB']);
    sameAcross(['NABEAB', 'N A B E A B', 'NA BE AB', 'NAB EAB']);
  });

  test('T (truth table) with a self-delimiting table operand', () => {
    sameAcross(['TAB 0', 'T A B 0', 'TA B 0', 'T AB 0', 'TAB0']); // = [TAB, 0]
  });

  test('J with a numeric offset, and 0s immediates, self-delimit', () => {
    sameAcross(['J5', 'J 5']);
    sameAcross(['WZ0sDPN', 'WZ 0sDPN', 'W Z 0sDPN', 'W Z0sDPN']); // = [WZ_, DPN]
  });

  test('ragged runs (not a whole number of trytes) parse as instructions', () => {
    // A 2-op instruction is 3 tribbles but NOP (_) is one, so a run can be a
    // ragged 4 or 5 tribbles. It must still be whitespace-invariant.
    sameAcross(['MAB_', 'M A B _', 'MA B _', 'MA B_', 'M A B_', 'MAB _']); // 4 = [MAB, NOP]
    sameAcross(['MAB__', 'M A B _ _', 'MA B _ _', 'MA B_ _', 'MAB __']); // 5 = [MAB, NOP, NOP]
    sameAcross(['IAN_', 'I A N _', 'IA N _', 'I AN _']); // 4 = [IAN, NOP]
  });
});
