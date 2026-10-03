import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { expect, test } from 'vitest';
import { assemble } from '../src/asm/assemble';
import { World } from '../src/core/world';
import { REG_P } from '../src/core/machine';
import { WorldDiagnostics } from './worldDiagnostics';

test.each(['loop: J loop', 'H 0sAAA Z'])('diagnostics retain guest loop/halt evidence and enforce a synchronous wall budget: %s', program => {
  const dir = mkdtempSync(join(tmpdir(), 'troika-timeout-'));
  try {
    let now = 0;
    const path = join(dir, 'report.json');
    const diagnostics = new WorldDiagnostics(path, program, 5000, () => now);
    const world = new World(), machine = world.addMachine('client');
    const image = assemble('@500\n' + program);
    expect(image.diagnostics).toEqual([]);
    for (const c of image.chunks) c.data.forEach((v, i) => machine.poke(c.addr+i, v));
    machine.poke(REG_P, 500); diagnostics.register(world, 'client', machine);
    diagnostics.setStage('waiting for guest to finish');
    for (let i = 0; i < 4; i++) {
      diagnostics.run(world, 100, () => world.runCycles(100)); now += 1000;
    }
    now = 4500;
    expect(() => diagnostics.run(world, 100, () => world.runCycles(100))).toThrow('wall-clock budget');
    const report = JSON.parse(readFileSync(path, 'utf8'));
    expect(report.reason).toBe('synchronous wall-clock guard');
    expect(report.stage).toBe('waiting for guest to finish');
    expect(report.worlds[0].cycles).toBe(400);
    const cpu = report.worlds[0].machines.client;
    expect(cpu.instruction).toBeTypeOf('string');
    expect(cpu.registers).toHaveLength(27);
    expect(report.history.length).toBeLessThanOrEqual(8);
    if (program.startsWith('H')) expect(cpu.sleep.remaining).toBe('Infinity');
    else expect(cpu.pc).toBe(500);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('a host-side infinite loop leaves an entering-chunk report even when timers and failure hooks cannot run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'troika-host-wedge-'));
  try {
    const path = join(dir, 'report.json'), entry = join(dir, 'wedge.ts'), bundle = join(dir, 'wedge.cjs');
    writeFileSync(entry, `
import { WorldDiagnostics } from ${JSON.stringify(resolve('test/worldDiagnostics.ts'))};
import { World } from ${JSON.stringify(resolve('src/core/world.ts'))};
const world = new World();
const d = new WorldDiagnostics(${JSON.stringify(path)}, 'injected host wedge', 100);
d.register(world, 'client', world.addMachine('client'));
d.setStage('injected non-returning simulation chunk');
d.run(world, 6561, () => { for (;;) {} });
`);
    buildSync({entryPoints: [entry], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent'});
    const child = spawnSync(process.execPath, [bundle], {timeout: 1000, encoding: 'utf8'});
    expect((child.error as NodeJS.ErrnoException)?.code).toBe('ETIMEDOUT');
    const report = JSON.parse(readFileSync(path, 'utf8'));
    expect(report.reason).toBe('entering simulation chunk');
    expect(report.inCall.cycles).toBe(6561);
    expect(report.inCall.caller).toContain('wedge.cjs');
    expect(report.worlds[0].cycles).toBe(0);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
