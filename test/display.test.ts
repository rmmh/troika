import { describe, expect, test } from 'vitest';
import { assemble, DEFAULT_ORG } from '../src/asm/assemble';
import {
  DISPLAY_CTRL,
  DISPLAY_OFF,
  DISPLAY_ON,
  displayEnabled,
  VRAM_SIZE,
} from '../src/core/display';
import { Machine, REG_P } from '../src/core/machine';
import { fromTribbles } from '../src/core/tryte';

const T = fromTribbles;

function run(src: string): Machine {
  const r = assemble(src, { prelude: false });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const m = new Machine();
  for (const c of r.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
  m.poke(REG_P, DEFAULT_ORG);
  for (let i = 0; i < 100 && m.read(REG_P) !== r.end; i++) m.step();
  return m;
}

describe('display-enable latch', () => {
  test('constants', () => {
    expect(DISPLAY_CTRL).toBe(0); // the ___ register
    expect(DISPLAY_ON).toBe(T('DPN'));
    expect(DISPLAY_OFF).toBe(T('DP_'));
    expect(VRAM_SIZE).toBe(6561);
  });

  test('powers up disabled', () => {
    const m = new Machine();
    expect(displayEnabled((a) => m.peek(a))).toBe(false);
  });

  test('W Z DPN enables, W Z DP_ disables', () => {
    const on = run('W Z DPN');
    expect(on.peek(DISPLAY_CTRL)).toBe(DISPLAY_ON);
    expect(displayEnabled((a) => on.peek(a))).toBe(true);

    const off = run('W Z DPN\nW Z DP_');
    expect(displayEnabled((a) => off.peek(a))).toBe(false);
  });
});
