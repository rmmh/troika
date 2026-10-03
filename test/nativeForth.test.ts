import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';
import { encodeText } from '../src/core/textEncoding';
import { norm } from '../src/core/tryte';

const modules = ['forthVm', 'forthPage'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
// These fixtures are VM bytecode, not a host Forth compiler. Compiler acceptance
// requires separate native source compilation tests before page integration.
function run(code: number[], options: { variables?: number; records?: number[][]; text?: number[]; form?: boolean; entry?: number; ready?: number } = {}) {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 M A ${options.entry ?? 4010} C S f_run W 6200 A H 0sAAA Z
; Browser URL validator is not yet implemented. This native fixture accepts
; only a one-cell root path, and never navigates or consults host code.
f_validate_navigation: N B 1 J fp_bad R E A N E 0s_NI J fp_bad M A Z O S P` }]);
  const m = new FirmwareProbe(['mmio', 'forth.state', 'page.text', 'page.records', 'native.stack', 'url.state']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  code.forEach((v, i) => m.poke(4010 + i, v));
  m.poke(5360, 4010 + code.length); m.poke(5362, options.variables ?? 27); m.poke(5363, options.ready ?? 1);
  m.poke(5414, options.records?.length ?? 0); m.poke(5415, options.form ? 1 : 0);
  options.records?.forEach((r, i) => r.forEach((v, j) => m.poke(4739 + i * 18 + j, v)));
  options.text?.forEach((v, i) => m.poke(2552 + i, v));
  m.poke(REG_P, linked.image.entry!);
  expect(m.run(2_000_000)).toBe('sleep-forever');
  expect(m.peek(REG_S)).toBe(5710); expect(m.stackHighWater).toBeLessThanOrEqual(12);
  return { m, status: m.peek(6200), variable: (i = 0) => m.peek(5333 + i), linked };
}
const lit = (n: number) => [0, n];
const store = (i = 0) => [...lit(5333 + i), 22];
function value(code: number[]) { return run([...code, ...store(), 1]); }

describe('native bounded Forth VM', () => {
  test.each([
    [[...lit(7), ...lit(3), 11], 10], [[...lit(7), ...lit(3), 12], 4],
    [[...lit(9841), ...lit(2), 13], norm(19682)],
    [[...lit(9841), ...lit(1), 11], -9841],
    [[...lit(-3), 19], 3], [[...lit(-9841), 20], 9841],
    [[...lit(0), 18], 1], [[...lit(-1), 18], 0],
    [[...lit(-3), ...lit(2), 16], 1], [[...lit(-3), ...lit(2), 17], 0],
    [[...lit(2), ...lit(2), 15], 1], [[...lit(3), ...lit(2), 15], 0],
  ])('arithmetic/comparison %j returns %i', (code, expected) => {
    const r = value(code as number[]); expect(r.status).toBe(0); expect(r.variable()).toBe(expected);
  });
  test.each([[7, 3], [-7, 3], [7, -3], [-7, -3], [8, 3], [-8, 3], [9841, 2], [-9841, -2], [1, 3], [0, -1]])(
    '/MOD truncates %i / %i toward zero with dividend-signed remainder', (a, b) => {
      const r = run([...lit(a), ...lit(b), 14, ...store(0), ...store(1), 1]);
      expect(r.status).toBe(0); expect(r.variable(0)).toBe(Math.trunc(a / b) || 0); expect(r.variable(1)).toBe(a % b || 0);
    });
  test('stack shuffles and DEPTH have conventional effects', () => {
    const r = run([...lit(1), ...lit(2), ...lit(3), 10, 8, 9, 6, 7, 27,
      ...store(0), ...store(1), ...store(2), ...store(3), ...store(4), 1]);
    expect(r.status).toBe(0); expect([0, 1, 2, 3, 4].map(r.variable)).toEqual([4, 1, 3, 1, 2]);
  });
  test('CALL and DEFER use guest return cells without native recursion', () => {
    // main: call body; defer target-cell; store sum; return. body pushes 5.
    const code = [2, 4022, 5, 4025, 11, ...store(), 1, 0, 0, 0, 0, 5, 1, 4022];
    const r = run(code); expect(r.status).toBe(0); expect(r.variable()).toBe(10);
  });
  test.each([
    [[7, 1], -81], [[...Array(82).fill(6)], -81],
    [[...lit(1), ...Array(81).fill(6), 1], -82],
    [[2, 4010], -83], [[3, 4010], -84], [[...lit(1), ...lit(0), 14], -85],
    [[...lit(1), 1], -86], [[28], -80], [[0], -80], [[3, 5000], -80],
  ])('failure %j returns %i and clears stacks/actions', (code, status) => {
    const r = run(code as number[]); expect(r.status).toBe(status);
    expect([5364, 5365, 5368, 5369, 5370, 5372].map(a => r.m.peek(a))).toEqual([0, 0, 0, 0, 0, 0]);
  });
  test('instruction budget is charged before side effects and allows exactly 729 instructions', () => {
    const code = [...lit(145), ...lit(1), 12, 6, 4, 4020, 3, 4012, 7, 27, 7, 1];
    const exact = run(code); expect(exact.status).toBe(0); expect(exact.m.peek(5367)).toBe(0);
    code[1] = 146; const exhausted = run(code); expect(exhausted.status).toBe(-84);
    expect(run([...Array(364).fill([0, 1, 7]).flat(), 1]).status).toBe(-80);
  });
});


describe('native Forth page-scoped words', () => {
  test('FIELD@ exposes only a current input slice and @ reads its cells', () => {
    const r = run([...lit(0), 23, ...store(1), 21, ...store(0), 1], {
      records: [[6, 2552, 3, 54, 2606, 1, 1]], text: [11, 22, 33],
    });
    expect(r.status).toBe(0); expect(r.variable(0)).toBe(11); expect(r.variable(1)).toBe(3);
  });
  test.each([-1, 1, 3, 9841])('FIELD@ rejects unavailable index %i', index => {
    expect(run([...lit(index), 23, 7, 7, 1], { records: [[6, 2552, 1, 54]] }).status).toBe(-87);
  });
  test.each([0, 365, 2485, 2551, 2555, 4010, 4739, 5225, 5334, 5468, 5954, 9841])(
    '@ rejects non-slice address %i', address => {
      expect(run([...lit(address), 21, 7, 1], { variables: 1, records: [[2, 2552, 3, 3]] }).status).toBe(-87);
    });
  test.each([2485, 2552, 4010, 5334, 9841])('! rejects non-variable address %i', address => {
    expect(run([...lit(7), ...lit(address), 22, 1], { variables: 1 }).status).toBe(-87);
  });
  test('TEXT! permits overlapping moves within capacity and updates counted length', () => {
    const r = run([...lit(2553), ...lit(3), ...lit(0), 24, 1], { records: [[2, 2552, 5, 5]], text: [1, 2, 3, 4, 5] });
    expect(r.status).toBe(0); expect(r.m.peek(4741)).toBe(3);
    expect([0, 1, 2].map(i => r.m.peek(2552 + i))).toEqual([2, 3, 4]);
  });
  test('TEXT! handles reverse overlap without changing the source mid-copy', () => {
    const r = run([...lit(2552), ...lit(4), ...lit(1), 24, 1], { records: [[2, 2552, 5, 5], [1, 2553, 4, 4]], text: [1, 2, 3, 4, 5] });
    expect(r.status).toBe(0); expect([0, 1, 2, 3, 4].map(i => r.m.peek(2552 + i))).toEqual([1, 1, 2, 3, 4]);
  });
  test('TEXT! rejects a source spanning adjacent declared strings and oversized destinations', () => {
    const options = { records: [[2, 2552, 2, 2], [2, 2554, 2, 2]], text: [1, 2, 3, 4] };
    expect(run([...lit(2553), ...lit(2), ...lit(0), 24, 1], options).status).toBe(-87);
    expect(run([...lit(2552), ...lit(2), ...lit(1), 24, 1], { ...options, records: [[2, 2552, 2, 2], [2, 2554, 1, 1]] }).status).toBe(-87);
    expect(run([...lit(2552), ...lit(1), ...lit(0), 24, 1], { ...options, records: [[6, 2552, 2, 54]] }).status).toBe(-87);
  });
  test('zero-length slices still require a declared boundary', () => {
    const options = { records: [[2, 2552, 2, 2]], text: [1, 2] };
    expect(run([...lit(2554), ...lit(0), ...lit(0), 24, 1], options).status).toBe(0);
    expect(run([...lit(2555), ...lit(0), ...lit(0), 24, 1], options).status).toBe(-87);
  });
  test('SEND is deferred until successful return, needs a form and allows only one action', () => {
    const sent = run([25, 1], { form: true }); expect(sent.status).toBe(0); expect(sent.m.peek(5368)).toBe(1);
    expect(run([25, 1]).status).toBe(-88);
    for (const code of [[25, 25, 1], [25, 7], [25, ...lit(1), 1]]) {
      const r = run(code, { form: true }); expect(r.status).toBeLessThan(0); expect(r.m.peek(5368)).toBe(0);
    }
  });
  test('GO copies its slice, calls a native URL-validation boundary and discards failed actions', () => {
    const options = { records: [[2, 2552, 1, 1]], text: encodeText('/') };
    const r = run([...lit(2552), ...lit(1), 26, 1], options);
    expect(r.status).toBe(0); expect(r.m.peek(5368)).toBe(2); expect(r.m.peek(5369)).toBe(5954);
    expect(r.m.peek(5370)).toBe(1); expect(r.m.peek(5954)).toBe(encodeText('/')[0]);
    expect(run([...lit(2552), ...lit(1), 26, 1], { ...options, text: encodeText('?') }).status).toBe(-87);
    const failed = run([...lit(2552), ...lit(1), 26, 7], options);
    expect(failed.status).toBe(-81); expect(failed.m.peek(5368)).toBe(0);
  });
  test('earlier text updates may remain after a handler failure but its pending action is gone', () => {
    const r = run([...lit(2553), ...lit(1), ...lit(0), 24, 25, 7], { form: true, records: [[2, 2552, 2, 2]], text: [1, 2] });
    expect(r.status).toBe(-81); expect(r.m.peek(2552)).toBe(2); expect(r.m.peek(4741)).toBe(1); expect(r.m.peek(5368)).toBe(0);
  });
});


test.each([0, 2])('unsealed page state %i cannot execute a handler', ready => {
  const r = run([25, 1], { ready, form: true }); expect(r.status).toBe(-80); expect(r.m.peek(5368)).toBe(0);
});
test('the twenty-seventh return frame fits and the twenty-eighth fails without native recursion', () => {
  for (const depth of [27, 28]) {
    const code = Array.from({ length: depth }, (_, i) => [2, 4010 + (i + 1) * 3, 1]).flat(); code.push(1);
    const r = run(code); expect(r.status).toBe(depth === 27 ? 0 : -83); expect(r.m.stackHighWater).toBeLessThanOrEqual(2);
  }
});
test.each([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26])(
  'opcode %i checks underflow before any side effect', opcode => {
    const r = run(opcode === 4 ? [4, 4010, 1] : [opcode, 1]); expect(r.status).toBe(-81);
  });
test('signed /MOD matches truncation across deterministic full-range samples', () => {
  let seed = 17;
  for (let i = 0; i < 54; i++) {
    seed = (seed * 73 + 19) % 19683; const a = seed - 9841;
    seed = (seed * 73 + 19) % 19683; const b = seed - 9841 || 1;
    const r = run([...lit(a), ...lit(b), 14, ...store(0), ...store(1), 1]);
    expect(r.status).toBe(0); expect(r.variable(0)).toBe(Math.trunc(a / b) || 0); expect(r.variable(1)).toBe(a % b || 0);
  }
});


test.each([0, -41, 54, 58, 9841])('TEXT! rejects undefined text code %i before altering the destination', bad => {
  const r = run([...lit(bad), ...store(), ...lit(5333), ...lit(1), ...lit(0), 24, 1], {
    records: [[2, 2552, 2, 2]], text: [1, 2],
  });
  expect(r.status).toBe(-87); expect(r.m.peek(2552)).toBe(1); expect(r.m.peek(4741)).toBe(2);
});
test('navigation reset clears dictionary, variables, slice metadata and pending actions', () => {
  const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 C S f_reset H 0sAAA Z
f_validate_navigation: M A -87 O S P` }]);
  const m = new FirmwareProbe(['mmio', 'forth.state', 'page.script', 'native.stack']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  for (let i = 4010; i <= 4738; i++) m.poke(i, 17);
  for (let i = 5225; i <= 5467; i++) m.poke(i, 17);
  m.poke(REG_P, linked.image.entry!); expect(m.run(100_000)).toBe('sleep-forever');
  expect(Array.from({ length: 729 }, (_, i) => m.peek(4010 + i))).toEqual(Array(729).fill(0));
  expect(Array.from({ length: 243 }, (_, i) => m.peek(5225 + i))).toEqual(Array.from({ length: 243 }, (_, i) => i === 5360 - 5225 ? 4010 : 0));
});
