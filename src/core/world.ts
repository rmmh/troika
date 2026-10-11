import { Machine, type CpuState } from './machine';
import { BlockDevice, BlockMedium, type BlockDeviceState, type BlockMediumState } from './blockDevice';
import { NetworkFabric, type NetworkIdentity, NetworkDevice, type NetworkFabricState } from './networkDevice';

import { TextDevice, type TextDeviceState } from './textDevice';
import { DisplayDevice, type DisplayDeviceState } from './displayDevice';
import { SoundDevice, type SoundDeviceState } from './soundDevice';
import { stateBoolean, stateInteger, stateTrytes } from './stateValidation';

export type WorldAction =
  | {kind: 'text'; host: string; cells: number[]}
  | {kind: 'pad'; host: string; pad: 0 | 1; value: number}
  | {kind: 'link'; host: string; slot: 4 | 5; connected: boolean}
  | {kind: 'mount'; host: string; unit: number; medium: number | null};
export interface ScheduledWorldAction { at: number; sequence: number; action: WorldAction; }
const copyAction = (action: WorldAction): WorldAction => action.kind === 'text'
  ? {...action, cells: [...action.cells]} : {...action};

type PeripheralState =
  | {kind: 'text'; state: TextDeviceState}
  | {kind: 'display'; state: DisplayDeviceState}
  | {kind: 'sound'; state: SoundDeviceState}
  | {kind: 'disk'; state: BlockDeviceState}
  | {kind: 'nic'; id: number; identity: number[]};
export interface WorldState {
  time: number;
  started: boolean;
  nextAction: number;
  actions: ScheduledWorldAction[];
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
  // Keep completion ordering by host identity, but visit only busy controllers
  // at instruction boundaries. Device-owned notifications include direct calls
  // and snapshot restore, not just commands issued through a running CPU.
  private activeDisks: { host: string; device: BlockDevice }[] = [];
  private readonly refreshActiveDisks = () => {
    this.activeDisks = this.disks.filter(({device}) => device.cyclesUntilCompletion() !== Infinity);
  };
  private readonly interfaces: {host: string; device: NetworkDevice}[] = [];
  private mediaPool: BlockMedium[] = [];
  private time = 0;
  private started = false;
  private nextAction = 0;
  private actions: ScheduledWorldAction[] = [];

  registerMedium(medium: BlockMedium): number {
    if (!(medium instanceof BlockMedium)) throw new TypeError('invalid world medium');
    let index = this.mediaPool.indexOf(medium);
    if (index < 0) { index = this.mediaPool.length; this.mediaPool.push(medium); }
    return index;
  }

  private actionDevice(action: WorldAction) {
    const host = this.hosts.get(action.host);
    if (!host) throw new Error('unknown action host');
    const id = action.kind === 'text' ? 3 : action.kind === 'pad' ? 2 : action.kind === 'mount' ? -12 : action.slot;
    const device = host.machine.attachedDevices().find(device => device.id === id);
    if ((action.kind === 'text' && !(device instanceof TextDevice)) ||
        (action.kind === 'pad' && !(device instanceof DisplayDevice)) ||
        (action.kind === 'mount' && !this.disks.some(d => d.host === host.id && d.device === device)) ||
        (action.kind === 'link' && !this.interfaces.some(d => d.host === host.id && d.device === device))) throw new Error('invalid action peripheral');
    return device!;
  }

  private validateAction(action: WorldAction, pool: readonly BlockMedium[]): void {
    switch (action.kind) {
      case 'text': stateTrytes(action.cells); break;
      case 'pad': stateInteger(action.pad, 0, 1); stateInteger(action.value, -9841, 9841); break;
      case 'link': stateInteger(action.slot, 4, 5); stateBoolean(action.connected); break;
      case 'mount':
        stateInteger(action.unit, 0, 26);
        if (action.medium !== null) stateInteger(action.medium, 0, pool.length - 1);
        break;
      default: throw new Error('unknown world action');
    }
    this.actionDevice(action);
  }

  /** Equal-time actions retain enqueue order, after hardware completion and before CPUs. */
  queueAction(action: WorldAction, at = this.time): number {
    stateInteger(at, this.time); stateInteger(this.nextAction, 0, Number.MAX_SAFE_INTEGER - 1);
    this.validateAction(action, this.mediaPool);
    const sequence = this.nextAction++;
    this.actions.push({at, sequence, action: copyAction(action)});
    this.actions.sort((a, b) => a.at - b.at || a.sequence - b.sequence);
    return sequence;
  }

  private applyAction(action: WorldAction): void {
    const device = this.actionDevice(action);
    switch (action.kind) {
      case 'text': (device as TextDevice).queueTrytes(action.cells); break;
      case 'pad': (device as DisplayDevice).setGamepadState(action.pad, action.value); break;
      case 'link': (device as NetworkDevice).setLink(action.connected); break;
      case 'mount': (device as BlockDevice).setMedium(action.unit, action.medium === null ? undefined : this.mediaPool[action.medium]); break;
    }
  }

  get hasPendingActions(): boolean { return this.actions.length !== 0; }

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
    const disk = new BlockDevice(media, true, this.refreshActiveDisks);
    for (const medium of disk.attachedMedia()) if (medium) this.registerMedium(medium);
    h.machine.attach(disk); h.devices.add(-12);
    this.disks.push({ host, device: disk });
    this.disks.sort((a, b) => a.host < b.host ? -1 : a.host > b.host ? 1 : 0);
    return disk;
  }

  /** Host boundary only. Unsupported or replaced hardware must never be omitted. */
  captureState(): WorldState {
    for (const {device} of this.disks) for (const medium of device.attachedMedia()) {
      if (medium) this.registerMedium(medium);
    }
    const hosts = this.ordered.map(host => ({id: host.id, cpu: host.machine.captureCpuState(),
      readyAt: host.readyAt, phase: host.phase, sleepStarted: host.sleepStarted,
      devices: host.machine.attachedDevices().map((device): PeripheralState => {
        if (device instanceof TextDevice) return {kind: 'text', state: device.captureState()};
        if (device instanceof DisplayDevice) return {kind: 'display', state: device.captureState()};
        if (device instanceof SoundDevice) return {kind: 'sound', state: device.captureState()};
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
    return {time: this.time, started: this.started, nextAction: this.nextAction,
      actions: this.actions.map(entry => ({...entry, action: copyAction(entry.action)})), network: this.network.captureState(),
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
    stateInteger(state.nextAction, 0);
    if (!Array.isArray(state.actions)) throw new Error('invalid world action queue');
    const sequences = new Set<number>();
    const actions = state.actions.map((entry, i) => {
      stateInteger(entry.at, state.time); stateInteger(entry.sequence, 0, state.nextAction - 1);
      const previous = state.actions[i - 1];
      if (sequences.has(entry.sequence) || (previous && (entry.at < previous.at ||
          (entry.at === previous.at && entry.sequence < previous.sequence)))) throw new Error('invalid world action order');
      sequences.add(entry.sequence); this.validateAction(entry.action, pool);
      return {...entry, action: copyAction(entry.action)};
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
          case 'sound':
            new SoundDevice(() => 0, () => {}).restoreState(peripheral.state);
            apply.push(() => (device as SoundDevice).restoreState(peripheral.state)); break;
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
    this.actions = actions; this.nextAction = state.nextAction;
  }

  private hardwareTime(): number {
    let at = this.network.nextEventTime;
    for (const { device } of this.activeDisks) at = Math.min(at, this.time + device.cyclesUntilCompletion());
    return at;
  }

  /** World time is independent of machine count and wall time. Equal-time events
   * complete NICs by interface identity, then disks by host identity, then queued external actions, then CPUs
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
      const actionTime = this.actions[0]?.at ?? Infinity;
      let next = Math.min(target, hardware, actionTime);
      for (const host of this.ordered) next = Math.min(next, host.readyAt);
      const elapsed = next - this.time;
      this.network.advanceTo(next);
      for (const { device } of this.activeDisks) device.advance(elapsed);
      this.time = next;
      while (this.actions[0]?.at === next) this.applyAction(this.actions.shift()!.action);

      // A physical event can wake any CPU whose event enables/masks allow it.
      // Flush idle sleep at the requested horizon too, keeping timers in sync.
      if (hardware <= next || actionTime <= next || next === target) {
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
