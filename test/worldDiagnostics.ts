import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { BlockDevice } from '../src/core/blockDevice';
import { World } from '../src/core/world';
import { Machine, REG_P, REG_S } from '../src/core/machine';
import { disassemble } from '../src/core/disasm';
import { starterScreen } from '../src/world/starter';

const stateCells = {
  stream: 2380, txWait: 2402, rxLeft: 2414, eof: 2417, streamStatus: 2418,
  diskCallback: 2486, imageBusy: 2488, browser: 2504, browserStatus: 2505,
  forthAction: 5368, uiReady: 5446, httpStatus: 6225, mounted: 6927, fileHandle: 6960,
};

/** Test-only observations. Polling PCs are evidence, never a liveness verdict. */
export class WorldDiagnostics {
  private worlds = new Map<World, Map<string, Machine>>();
  private disks = new Map<World, Map<string, BlockDevice>>();
  private history: unknown[] = [];
  private started: number;
  private sampled = -Infinity;
  private stage = 'test startup';
  private inCall: { world: number; cycles: number; caller?: string } | null = null;
  constructor(readonly path: string, private name: string, private timeout: number,
    private now = () => performance.now()) { this.started = now(); }
  register(world: World, id: string, machine: Machine) {
    if (!this.worlds.has(world)) this.worlds.set(world, new Map());
    this.worlds.get(world)!.set(id, machine);
  }
  registerDisk(world: World, id: string, disk: BlockDevice) {
    if (!this.disks.has(world)) this.disks.set(world, new Map());
    this.disks.get(world)!.set(id, disk);
  }
  get hasWorlds() { return this.worlds.size > 0; }
  setStage(stage: string) { this.stage = stage; }
  private snapshot() {
    return [...this.worlds].map(([world, machines], index) => ({
      world: index, cycles: world.cycles, nextNetworkEvent: world.network.nextEventTime,
      machines: Object.fromEntries([...machines].map(([id, m]) => [id, {
        pc: m.peek(REG_P), instruction: disassemble(a => m.peek(a), m.peek(REG_P)).text,
        sp: m.peek(REG_S), cycles: m.cycles, sleep: m.sleep,
        registers: Array.from({length: 27}, (_, i) => m.peek(i - 13)),
        // Guest firmware interpretation; these addresses are not universal device registers.
        guestState: Object.fromEntries(Object.entries(stateCells).map(([name, a]) => [name, m.peek(a)])),
        diskCyclesUntilCompletion: this.disks.get(world)?.get(id)?.cyclesUntilCompletion(),
      }])),
    }));
  }
  report(reason: string) {
    const sample = { elapsedMs: this.now() - this.started, stage: this.stage, inCall: this.inCall, worlds: this.snapshot() };
    this.history.push(sample); if (this.history.length > 8) this.history.shift();
    const report = { test: this.name, reason, timeoutMs: this.timeout, ...sample, history: this.history,
      screens: [...this.worlds].map(([, machines]) => machines.has('client') ? starterScreen(machines.get('client')!) : null),
      caveat: 'Samples do not prove liveness. A stale inCall sample can indicate a host-side wedge; repeated guest PCs may be normal polling. Infinity is serialized as a string.',
    };
    mkdirSync(dirname(this.path), {recursive: true});
    writeFileSync(this.path + '.tmp', JSON.stringify(report, (_, v) => typeof v === 'number' && !Number.isFinite(v) ? String(v) : v, 2));
    renameSync(this.path + '.tmp', this.path);
    return report;
  }
  run(world: World, cycles: number, run: () => void) {
    const now = this.now();
    if (this.timeout > 0 && now - this.started >= this.timeout - Math.min(1000, this.timeout / 10)) {
      this.report('synchronous wall-clock guard');
      throw new Error(`World simulation reached its wall-clock budget at ${this.stage}; diagnostics: ${this.path}`);
    }
    const sample = now - this.sampled >= 1000;
    if (sample) {
      this.sampled = now;
      this.inCall = {world: [...this.worlds.keys()].indexOf(world), cycles, caller: new Error().stack};
      this.report('entering simulation chunk');
    }
    try { run(); }
    catch (error) { this.report('simulation threw'); throw error; }
    finally {
      this.inCall = null;
      if (sample) this.report('simulation chunk returned');
    }
  }
}

let active: WorldDiagnostics | undefined;
export function setWorldDiagnostics(value?: WorldDiagnostics) { active = value; }
export function worldTestStage(stage: string) { active?.setStage(stage); }
export function installWorldDiagnostics() {
  const add = World.prototype.addMachine, run = World.prototype.runCycles, disk = World.prototype.addDisk;
  World.prototype.addMachine = function(id, machine) {
    const result = add.call(this, id, machine); active?.register(this, id, result); return result;
  };
  World.prototype.addDisk = function(id, media) {
    const result = disk.call(this, id, media); active?.registerDisk(this, id, result); return result;
  };
  World.prototype.runCycles = function(cycles) {
    if (active) active.run(this, cycles, () => run.call(this, cycles));
    else run.call(this, cycles);
  };
}
