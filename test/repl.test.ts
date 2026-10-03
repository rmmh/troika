import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('terminal debugger', () => {
  let dir: string;
  let entry: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'troika-repl-test-'));
    entry = join(dir, 'repl.cjs');
    await build({ entryPoints: ['src/cli/repl.ts'], bundle: true, outfile: entry, platform: 'node', format: 'cjs' });
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function repl(...lines: string[]): string {
    const result = spawnSync(process.execPath, [entry], {
      input: [...lines, 'exit', ''].join('\n'), encoding: 'utf8', timeout: 5000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  }

  it('normalizes breakpoint addresses to the CPU address space', () => {
    const output = repl('.org 9841', '___ ___', '.break 9842', '.until 9841', '.run 2');
    expect(output).toContain('breakpoint set at AAA (-9841)');
    expect(output).toContain('breakpoint hit at AAA (-9841)');
  });

  it('normalizes label offsets and deduplicates equivalent watches', () => {
    const output = repl('@9841', 'edge: ___', '.break edge+1', '.watch 19683', '.watch 0', '.watch');
    expect(output).toContain('breakpoint set at AAA (-9841)');
    expect(output).toContain('watch removed at ___ (0)');
    expect(output).toContain('no watches');
  });

  it('rejects partial numbers and inexact addresses', () => {
    const output = repl('.break 42abc', '.watch 1.5', '.until 1e3', '.org 9007199254740992', '.break');
    expect(output).toContain('bad address: 42abc');
    expect(output).toContain('bad address: 1.5');
    expect(output).toContain('bad address: 1e3');
    expect(output).toContain('usage: .org');
    expect(output).toContain('no breakpoints');
  });

  it('rejects invalid counts without executing instructions', () => {
    const output = repl('.step 2oops', '.run -1', '.run 1.5', '.step 1 2', '.mem 0 nope', '.dis 0 1e3', '.screenshot 1abc', '.regs');
    expect(output.match(/usage:/g)).toHaveLength(7);
    expect(output).toContain('cycles: 0');
  });

  it('supports zero counts and the default step count', () => {
    const output = repl('I A 1', '.step 0', '.step');
    expect(output).toContain('PC=_AA (-364)  +0 cycles');
    expect(output).toContain('PC=_AB (-363)  +1 cycles');
  });

  it('rejects extra command arguments before changing debugger state', () => {
    const output = repl('I A 1', '.step', '.break 100', '.watch 101', '.trace 102',
      '.reset extra', '.break clear extra', '.watch clear extra', '.trace clear extra',
      '.org 200 extra', '.until 300 extra', '.regs extra', '.labels extra', '.help extra',
      '.break', '.watch', '.trace', 'I B 1', '.step', '.regs');
    expect(output.match(/usage:/g)).toHaveLength(9);
    expect(output).toContain('  break _QF (100)');
    expect(output).toContain('  watch _QG (101)');
    expect(output).toContain('  trace _QH (102)');
    expect(output).toMatch(/A: __N \(1\)/);
    expect(output).toMatch(/B: __N \(1\)/);
    expect(output).toContain('cycles: 2');
  });

  it('shows labels when disassembly wraps from ZZZ to AAA', () => {
    const output = repl('@-9841', 'first: ___', '@9841', 'last: ___', '.dis last 2');
    expect(output).toMatch(/last:[\s\S]*ZZZ[\s\S]*first:[\s\S]*AAA/);
  });

  it('screenshots native text mode through the character ROM and palette', () => {
    const output = repl('W Z 0sDMT', 'W -3659 -9841', 'W -3658 9841', 'W -9841 65',
      '.run 4', '.screenshot');
    expect(output.match(/▀/g)).toHaveLength(162 * 81);
    expect(output).toContain('\x1b[38;2;255;255;255m');
    expect(output).toContain('\x1b[48;2;0;0;0m');
  });
});
