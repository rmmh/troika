import { Machine, type CpuState } from './machine';
import { BlockDevice, BlockMedium, type BlockDeviceState, type BlockMediumState } from './blockDevice';
import { NetworkFabric, type NetworkIdentity, NetworkDevice, type NetworkFabricState } from './networkDevice';

import { TextDevice, type TextDeviceState } from './textDevice';
import { DisplayDevice, type DisplayDeviceState } from './displayDevice';
import { stateBoolean, stateInteger } from './stateValidation';

type PeripheralState =
  | {kind: 'text'; state: TextDeviceState}
  | {kind: 'display'; state: DisplayDeviceState}
  | {kind: 'disk'; state: BlockDeviceState}
  | {kind: 'nic'; id: number; identity: number[]};
export interface WorldState {
  time: number;
  started: boolean;
  network: NetworkFabricState;
  media: BlockMediumState[];
  hosts: {id: string; cpu: CpuState; readyAt: number; phase: Host['phase'];
    sleepStarted: number; devices: PeripheralState[]}[];
}

interface Host {
  id: string;
  machine: Machine;
  readyAt: number;
  phase: 'ready' | 'instruction' | 'sleep' | 'interrupt';
  sleepStarted: number;
  devices: Set<number>;
}

/** Deterministic hardware/CPU coordinator; it contains no guest protocol state. */
export class World {
  readonly network = new NetworkFabric();
  private readonly hosts = new Map<string, Host>();
  private ordered: Host[] = [];
  private readonly disks: { host: string; device: BlockDevice }[] = [];
  private readonly interfaces: {host: string; device: NetworkDevice}[] = [];
  private mediaPool: BlockMedium[] = [];
  private time = 0;
  private started = false;

  get cycles(): number { return this.time; }

  addMachine(id: string, machine = new Machine()): Machine {
    if (this.started) throw new Error('configure world machines before running');
    if (!id || this.hosts.has(id)) throw new Error('machine identity must be unique and nonempty');
    if (machine.cycles !== 0) throw new Error('world requires a fresh CPU');
    if ([...this.hosts.values()].some(h => h.machine === machine)) throw new Error('CPU already belongs to this world');
    this.hosts.set(id, { id, machine, readyAt: 0, phase: 'ready', sleepStarted: 0, devices: new Set() });
    this.ordered = [...this.hosts.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return machine;
  }

  private claimDevice(host: string, id: number): Host {
    if (this.started) throw new Error('configure world devices before running');
    const h = this.hosts.get(host);
    if (!h) throw new Error('unknown machine');
    if (h.devices.has(id)) throw new Error('duplicate world device slot');
    return h;
  }

  addInterface(host: string, id: 4 | 5, identity: NetworkIdentity, segment: string): NetworkDevice {
    const h = this.claimDevice(host, id);
    const nic = this.network.add(id, identity, segment);
    h.machine.attach(nic); h.devices.add(id);
    this.interfaces.push({host, device: nic});
    return nic;
  }

  addDisk(host: string, media?: readonly (BlockMedium | undefined)[]): BlockDevice {
    const h = this.claimDevice(host, -12);
    const disk = new BlockDevice(media, true);
    h.machine.attach(disk); h.devices.add(-12);
    this.disks.push({ host, device: disk });
    this.disks.sort((a, b) => a.host < b.host ? -1 : a.host > b.host ? 1 : 0);
    return disk;
  }

  /** Host boundary only. Unsupported or replaced hardware must never be omitted. */
  captureState(): WorldState {
    for (const {device} of this.disks) for (const medium of device.attachedMedia()) {
      if (medium && !this.mediaPool.includes(medium)) this.mediaPool.push(medium);
    }
    const hosts = this.ordered.map(host => ({id: host.id, cpu: host.machine.captureCpuState(),
      readyAt: host.readyAt, phase: host.phase, sleepStarted: host.sleepStarted,
      devices: host.machine.attachedDevices().map((device): PeripheralState => {
        if (device instanceof TextDevice) return {kind: 'text', state: device.captureState()};
        if (device instanceof DisplayDevice) return {kind: 'display', state: device.captureState()};
        if (device instanceof BlockDevice && this.disks.some(d => d.host === host.id && d.device === device)) {
          return {kind: 'disk', state: device.captureState(this.mediaPool)};
        }
        if (device instanceof NetworkDevice && this.interfaces.some(d => d.host === host.id && d.device === device)) {
          return {kind: 'nic', id: device.id, identity: [...device.identity]};
        }
        throw new Error(`unsupported snapshot peripheral on ${host.id}: ${device.id}`);
      })}));
    for (const entry of [...this.disks, ...this.interfaces]) {
      if (!this.hosts.get(entry.host)!.machine.attachedDevices().includes(entry.device)) throw new Error('world peripheral was replaced');
    }
    return {time: this.time, started: this.started, network: this.network.captureState(),
      media: this.mediaPool.map(medium => medium.captureState()), hosts};
  }

  /** Validate everything before touching a live CPU, peripheral or medium.
   * Restores into the same configured host/device topology; mounted media may change. */
  restoreState(state: WorldState): void {
    const current = this.captureState();
    stateInteger(state.time, 0); stateBoolean(state.started);
    if (state.network.time !== state.time || (!state.started && state.time !== 0)) throw new Error('snapshot world clock mismatch');
    this.network.validateState(state.network);
    if (!Array.isArray(state.media) || !Array.isArray(state.hosts) || state.hosts.length !== this.ordered.length) throw new Error('snapshot world topology mismatch');
    const pool = state.media.map((saved, i) => {
      const existing = this.mediaPool[i];
      const medium = existing?.blocks === saved.blocks && existing.readOnly === saved.readOnly
        ? existing : new BlockMedium(saved.blocks, saved.readOnly);
      medium.validateState(saved);
      return medium;
    });
    const apply: (() => void)[] = [];
    state.hosts.forEach((saved, index) => {
      const host = this.ordered[index]!, topology = current.hosts[index]!;
      if (saved.id !== host.id || !Array.isArray(saved.devices) || saved.devices.length !== topology.devices.length) throw new Error('snapshot host topology mismatch');
      new Machine().restoreCpuState(saved.cpu);
      stateInteger(saved.sleepStarted, 0, state.time);
      if (!['ready', 'instruction', 'sleep', 'interrupt'].includes(saved.phase)) throw new Error('snapshot scheduler phase');
      if (saved.readyAt !== Infinity) stateInteger(saved.readyAt, state.time);
      else if (saved.phase !== 'sleep') throw new Error('snapshot infinite reservation');
      if ((saved.phase === 'instruction') !== (saved.cpu.deferredDeviceCycles !== undefined) ||
          (saved.phase === 'sleep' && !saved.cpu.sleep) ||
          (saved.phase === 'ready' && state.started)) throw new Error('snapshot CPU reservation mismatch');
      if ((saved.phase === 'instruction' || saved.phase === 'interrupt') && saved.cpu.cycles !== saved.readyAt) throw new Error('snapshot reservation clock mismatch');
      if (saved.phase === 'instruction' && (saved.cpu.deferredDeviceCycles! < 1 || saved.readyAt - state.time > saved.cpu.deferredDeviceCycles!)) throw new Error('snapshot instruction interval mismatch');
      if (saved.phase === 'sleep' && saved.cpu.cycles !== saved.sleepStarted) throw new Error('snapshot sleep clock mismatch');
      if (!state.started && (saved.phase !== 'ready' || saved.cpu.cycles !== 0 || saved.readyAt !== 0)) throw new Error('snapshot unstarted world mismatch');
      const devices = host.machine.attachedDevices();
      saved.devices.forEach((peripheral, i) => {
        const device = devices[i]!, expected = topology.devices[i]!;
        if (peripheral.kind !== expected.kind) throw new Error('snapshot peripheral topology mismatch');
        switch (peripheral.kind) {
          case 'text':
            new TextDevice().restoreState(peripheral.state);
            apply.push(() => (device as TextDevice).restoreState(peripheral.state)); break;
          case 'display':
            new DisplayDevice(() => 0, () => {}).restoreState(peripheral.state);
            apply.push(() => (device as DisplayDevice).restoreState(peripheral.state)); break;
          case 'disk':
            (device as BlockDevice).validateState(peripheral.state, pool);
            apply.push(() => (device as BlockDevice).restoreState(peripheral.state, pool)); break;
          case 'nic': {
            const nic = device as NetworkDevice;
            if (peripheral.id !== nic.id || !Array.isArray(peripheral.identity) ||
                peripheral.identity.length !== 3 || peripheral.identity.some((v, j) => v !== nic.identity[j])) throw new Error('snapshot NIC host mismatch');
            break;
          }
          default: throw new Error('unsupported snapshot peripheral');
        }
      });
      apply.push(() => {
        host.machine.restoreCpuState(saved.cpu); host.readyAt = saved.readyAt;
        host.phase = saved.phase; host.sleepStarted = saved.sleepStarted;
      });
    });
    pool.forEach((medium, i) => medium.restoreState(state.media[i]!));
    this.mediaPool = pool;
    this.network.restoreState(state.network);
    for (const restore of apply) restore();
    this.time = state.time; this.started = state.started;
  }

  private hardwareTime(): number {
    let at = this.network.nextEventTime;
    for (const { device } of this.disks) at = Math.min(at, this.time + device.cyclesUntilCompletion());
    return at;
  }

  /** World time is independent of machine count and wall time. Equal-time events
   * complete NICs by interface identity, then disks by host identity, then CPUs
   * by host identity. Instruction effects are atomic at their start boundary;
   * local device ticking/IRQ dispatch waits for the reserved completion time.
   */
  advanceTo(target: number): void {
    if (!Number.isSafeInteger(target) || target < this.time) throw new RangeError('invalid world time');
    this.started = true;
    // Scenario hotplug/input may have latched events while the world was paused.
    for (const host of this.ordered) if (host.phase === 'sleep') host.readyAt = Math.min(host.readyAt, this.time);
    while (true) {
      const hardware = this.hardwareTime();
      let next = Math.min(target, hardware);
      for (const host of this.ordered) next = Math.min(next, host.readyAt);
      const elapsed = next - this.time;
      this.network.advanceTo(next);
      for (const { device } of this.disks) device.advance(elapsed);
      this.time = next;

      // A physical event can wake any CPU whose event enables/masks allow it.
      // Flush idle sleep at the requested horizon too, keeping timers in sync.
      if (hardware <= next || next === target) {
        for (const host of this.ordered) if (host.phase === 'sleep' && host.readyAt > next) host.readyAt = next;
      }
      for (const host of this.ordered) if (host.readyAt <= next) this.boundary(host);
      if (next === target) return;
    }
  }

  runCycles(cycles: number): void {
    if (!Number.isSafeInteger(cycles) || cycles < 0) throw new RangeError('invalid world duration');
    this.advanceTo(this.time + cycles);
  }

  private boundary(host: Host): void {
    const m = host.machine;
    let extra = 0;
    if (host.phase === 'instruction') extra = m.finishWorldInstruction();
    else if (host.phase === 'sleep') {
      const elapsed = this.time - host.sleepStarted;
      extra = m.finishWorldSleep(elapsed) - elapsed;
      if (extra < 0) throw new Error('world skipped a local device boundary');
    } else extra = m.pollWorldBoundary();
    if (extra) {
      host.phase = 'interrupt'; host.readyAt = this.time + extra; return;
    }
    if (m.sleep) {
      host.phase = 'sleep'; host.sleepStarted = this.time;
      host.readyAt = this.time + m.cyclesUntilSleepEvent();
    } else {
      host.phase = 'instruction';
      host.readyAt = this.time + m.startWorldInstruction();
      if (!Number.isSafeInteger(host.readyAt)) throw new RangeError('world cycle limit reached');
    }
  }
}
