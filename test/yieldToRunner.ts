import { beforeEach } from 'vitest';

// Vitest batches task updates on a 100 ms timer. Let that batch and its IPC
// acknowledgement finish before a CPU-bound native simulation blocks the
// worker's event loop. A single setImmediate can run before the batch is sent.
beforeEach(() => new Promise<void>(resolve => setTimeout(resolve, 120)));


import { resolve } from 'node:path';
import { WorldDiagnostics, installWorldDiagnostics, setWorldDiagnostics } from './worldDiagnostics';

installWorldDiagnostics();
beforeEach(context => {
  const path = resolve('test-results/world-diagnostics', `${process.pid}-${context.task.id}.json`);
  const diagnostics = new WorldDiagnostics(path, context.task.name, context.task.timeout);
  setWorldDiagnostics(diagnostics);
  context.onTestFailed(() => {
    if (!diagnostics.hasWorlds) return;
    diagnostics.report('test failed');
    console.error(`World timeout/failure diagnostics: ${path}`);
  });
  context.onTestFinished(() => {
    if (diagnostics.hasWorlds && context.task.result?.state === 'pass') diagnostics.report('test passed');
    setWorldDiagnostics();
  });
});
