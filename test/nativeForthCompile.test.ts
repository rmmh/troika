import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { FirmwareProbe } from './firmwareProbe';

const modules = ['forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile'].map(name => ({ name,
  source: readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8') }));
const linked = linkFirmware([{ name: 'boot', source: 'J entry' }, ...modules, { name: 'app', source: `
entry: M S 5710 C S f_reset J halt
feed: M A 5711 R B 6201 C S f_feed J halt
record: C S f_record_end J halt
seal: C S f_seal J halt
run: M A @hook_name M B 4 C S f_find N A Z J halt
     M A C C S f_invoke J halt
halt: W 6200 A H 0sAAA Z
hook_name: "LOAD"
f_validate_navigation: M A -87 O S P` }]);
function compiler() {
  const m = new FirmwareProbe(['mmio', 'forth.state', 'page.script', 'page.text', 'page.records', 'native.stack', 'url.state', 'scratch']);
  for (const c of linked.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  function execute(label: string) {
    m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null;
    expect(m.run(3_000_000)).toBe('sleep-forever'); expect(m.peek(REG_S)).toBe(5710);
    expect(m.stackHighWater).toBeLessThanOrEqual(18); return m.peek(6200);
  }
  expect(execute('entry')).toBe(0);
  function feed(text: string, chunk = 216) {
    const cells = encodeText(text); let status = 0;
    for (let i = 0; i < cells.length; i += chunk) {
      const part = cells.slice(i, i + chunk); part.forEach((v, j) => m.poke(5711 + j, v));
      m.poke(6201, part.length); status = execute('feed'); if (status !== 0) break;
    }
    return status;
  }
  return { m, execute, feed, variable: (i = 0) => m.peek(5333 + i) };
}
function compile(text: string, chunk = 216) {
  const r = compiler(); const fed = r.feed(text, chunk); const status = fed || r.execute('seal');
  return { ...r, status };
}

describe('native streaming Forth compiler', () => {
  test.each([1, 2, 3, 7, 27, 216])('compiles and executes source split into %i-cell chunks', chunk => {
    const r = compile('VARIABLE result : twice DUP + ; : load 21 twice result ! ;', chunk);
    expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(42);
  });
  test.each([
    ['VARIABLE r : LOAD 0 IF 1 ELSE 2 THEN r ! ;', 2],
    ['VARIABLE r : LOAD -1 IF 1 ELSE 2 THEN r ! ;', 1],
    ['VARIABLE r : LOAD 7 0 IF 1 + THEN r ! ;', 7],
    ['VARIABLE r : LOAD 5 BEGIN 1 - DUP 0= UNTIL r ! ;', 0],
    ['VARIABLE r : LOAD 5 BEGIN DUP WHILE 1 - REPEAT r ! ;', 0],
    ['VARIABLE r : fact DUP 1 > IF DUP 1 - RECURSE * ELSE DROP 1 THEN ; : LOAD 5 fact r ! ;', 120],
    ['VARIABLE r : work 7 r ! EXIT 9 r ! ; : LOAD work ;', 7],
    ['VARIABLE r : x 1 ; : old x ; : x 2 ; : LOAD old 10 * x + r ! ;', 12],
    ['VARIABLE r : + - ; : LOAD 9 2 + r ! ;', 7],
  ])('native compilation honors %s', (source, result) => {
    const r = compile(source, 3); expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(result);
  });
  test('LF between C records terminates tokens and line comments but preserves a definition/comment', () => {
    const r = compiler(); expect(r.feed('VARIABLE r : LOAD ( stack', 1)).toBe(0);
    expect(r.execute('record')).toBe(0); expect(r.feed(' comment ) 7 \\ ignore this', 2)).toBe(0);
    expect(r.execute('record')).toBe(0); expect(r.feed('r ! ;')).toBe(0);
    expect(r.execute('seal')).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(7);
  });
  test.each([
    'DEFER d : target 7 ; \' target IS d VARIABLE r : LOAD d r ! ;',
    'DEFER d \' DUP IS d VARIABLE r : LOAD 7 d DROP r ! ;',
    'VARIABLE r DEFER d \' r IS d : LOAD 7 d ! ;',
    'DEFER odd : even DUP IF 1 - odd ELSE DROP 1 THEN ; : odd_impl DUP IF 1 - even ELSE DROP 0 THEN ; \' odd_impl IS odd VARIABLE r : LOAD 8 even 6 + r ! ;',
  ])('binds deferred targets entirely in script RAM: %s', source => {
    const r = compile(source, 2); expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(7);
  });
  test.each([
    ': LOAD missing ;', ': LOAD 9842 DROP ;', ': LOAD -9842 DROP ;', ': LOAD 99999999999 DROP ;',
    ': LOAD 12x DROP ;', ': LOAD IF ;', ': LOAD ELSE ;', ': LOAD THEN ;', ': LOAD REPEAT ;',
    ': LOAD BEGIN ;', ': LOAD BEGIN THEN ;', ': LOAD IF UNTIL ;', ': LOAD WHILE ;',
    ': LOAD 1', '( unfinished', ': LOAD ( unfinished ;', 'DEFER d : LOAD d ;',
    "DEFER d ' missing IS d : LOAD ;", "DEFER d ' DUP d : LOAD ;", "' DUP IS absent : LOAD ;",
    'VARIABLE IF', ': THEN ;', ': bad:name ;', ': 123 ;', ': LOAD : nested ; ;',
    ': abcdefghijklmnopqrstuvwxyzAB ;', ': LOAD RECURSE', '1', 'IS d',
  ])('rejects invalid source and never seals it: %s', source => {
    const r = compile(source, 1); expect(r.status).toBeLessThan(0); expect(r.m.peek(5363)).toBe(0);
    expect(r.execute('seal')).toBeLessThan(0);
  });
});


describe('native compiler exact limits and sealed entry points', () => {
  test('exactly 729 emitted cells fit and the next cell invalidates the page', () => {
    const source = ': LOAD ' + '0 DROP '.repeat(240) + 'EXIT ;';
    const r = compile(source, 17); expect(r.status).toBe(0); expect(r.m.peek(5360)).toBe(4739);
    expect(r.execute('run')).toBe(0);
    const full = compile(source.replace('EXIT ;', 'EXIT EXIT ;'), 17);
    expect(full.status).toBe(-91); expect(full.m.peek(5363)).toBe(0); expect(full.m.peek(5360)).toBe(4739);
  });
  test('27 variable cells fit and redefinitions retain old bound cells', () => {
    const declarations = Array.from({ length: 27 }, (_, i) => `VARIABLE v${i}`).join(' ');
    const r = compile(declarations + ' : LOAD 7 v26 ! ;', 13);
    expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable(26)).toBe(7);
    expect(compile(declarations + ' VARIABLE more').status).toBe(-91);
    const shadow = compile('VARIABLE r : old r ; VARIABLE r : LOAD 7 old ! 9 r ! ;');
    expect(shadow.status).toBe(0); expect(shadow.execute('run')).toBe(0);
    expect(shadow.variable(0)).toBe(7); expect(shadow.variable(1)).toBe(9);
  });
  test('13 control frames fit and the fourteenth fails without overwriting variables', () => {
    const source = (n: number) => ': LOAD ' + '1 IF '.repeat(n) + 'THEN '.repeat(n) + ';';
    const r = compile(source(13), 1); expect(r.status).toBe(0); expect(r.execute('run')).toBe(0);
    const full = compile(source(14), 1); expect(full.status).toBe(-92); expect(full.variable()).toBe(0);
  });
  test.each([-9841, 9841, 0])('compiles signed boundary literal %i', value => {
    const r = compile(`VARIABLE r : LOAD ${value >= 0 ? '+' : ''}${value} r ! ;`, 1);
    expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(value);
  });
  test('27-character names, numeric-prefix names and shadowed 0= remain ordinary words', () => {
    const name = 'abcdefghijklmnopqrstuvwxyzA';
    const r = compile(`VARIABLE r : ${name} 7 ; : 1PLUS 1 + ; : 0= DROP 9 ; : LOAD ${name} 1PLUS 0= r ! ;`, 1);
    expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(9);
  });
  test('a deferred event hook invokes its bound body and a variable hook fails its stack contract', () => {
    const r = compile("VARIABLE r DEFER LOAD : event 7 r ! ; ' event IS LOAD");
    expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(7);
    const variable = compile('VARIABLE LOAD'); expect(variable.status).toBe(0); expect(variable.execute('run')).toBe(-86);
  });
  test('compiled recursion and loops obey runtime bounds instead of native recursion', () => {
    const recursive = compile(': LOAD RECURSE ;'); expect(recursive.status).toBe(0); expect(recursive.execute('run')).toBe(-83);
    const loop = compile(': LOAD BEGIN 1 DROP 0 UNTIL ;'); expect(loop.status).toBe(0); expect(loop.execute('run')).toBe(-84);
  });
  test('source cannot name the current incomplete word except through RECURSE', () => {
    expect(compile(': LOAD LOAD ;').status).toBe(-90);
    const r = compile('VARIABLE r : x 7 ; : x x 1 + ; : LOAD x r ! ;');
    expect(r.status).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(8);
  });
  test('a compiler error remains sticky across future chunks and needs reset', () => {
    const r = compiler(); expect(r.feed(': LOAD missing ')).toBe(-90);
    expect(r.feed('; : missing ;')).toBe(-90); expect(r.execute('seal')).toBe(-90); expect(r.execute('run')).toBe(-90);
    expect(r.execute('entry')).toBe(0); expect(r.feed(': LOAD ;')).toBe(0); expect(r.execute('seal')).toBe(0); expect(r.execute('run')).toBe(0);
  });
  test('an incomplete definition cannot execute before the page is sealed', () => {
    const r = compiler(); expect(r.feed('VARIABLE r : LOAD 7 r ! ; ')).toBe(0);
    expect(r.execute('run')).toBe(-90); expect(r.variable()).toBe(0);
    expect(r.execute('seal')).toBe(0); expect(r.execute('run')).toBe(0); expect(r.variable()).toBe(7);
  });
});
