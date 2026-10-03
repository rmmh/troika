import { Machine } from './machine';
import { BlockDevice, type BlockMedium } from './blockDevice';
import { NetworkFabric, type NetworkIdentity, type NetworkDevice } from './networkDevice';

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
