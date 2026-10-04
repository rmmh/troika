import type { Device } from './devices';
import { DeviceEvents, type DeviceEventState } from './deviceEvents';
import { stateBoolean, stateInteger, stateTrytes } from './stateValidation';
import { norm, TRYTE_MAX, TRYTE_MIN } from './tryte';
import { decodeWide, encodeWide, type Wide } from './wide';

export const FRAME_SIZE = 243;
export const FRAME_HEADER = 27;
export const FRAME_PAYLOAD = 216;
export const NETWORK_TICK_CYCLES = 6561;
export const NETWORK_IRQ = 4;
export type NetworkIdentity = readonly [number, number, number];

export function identityKey(id: NetworkIdentity): string { return id.join(','); }
export function validateIdentity(id: NetworkIdentity): void {
  if (id.length !== 3 || id.every(v => v === 0) || id.some(v => !Number.isInteger(v) || v < TRYTE_MIN || v > TRYTE_MAX)) {
    throw new RangeError('interface identity must contain three signed trytes and be nonzero');
  }
}

export interface NetworkDeviceState {
  id: 4 | 5;
  identity: NetworkIdentity;
  connected: boolean;
  txCursor: number;
  rxCursor: number;
  rxHead: number;
  rxCount: number;
  rx: Int16Array[];
  staging: Int16Array;
  tx: Int16Array;
  due: number;
  result: number;
  dropped: number;
  events: DeviceEventState;
  clockLatch: Wide;
}
export interface NetworkFabricState {
  time: number;
  ports: {segment: string; device: NetworkDeviceState}[];
}

/** A NIC has no routes, addresses, stream state, guest buffers or service code. */
export class NetworkDevice implements Device {
  readonly identity: NetworkIdentity;
  private connected = false;
  private txCursor = 0;
  private rxCursor = 0;
  private rxHead = 0;
  private rxCount = 0;
  private readonly rx = Array.from({ length: 3 }, () => new Int16Array(FRAME_SIZE));
  private readonly staging = new Int16Array(FRAME_SIZE);
  private readonly tx = new Int16Array(FRAME_SIZE);
  private due = Infinity;
  private result = 0;
  private dropped = 0;
  private readonly events = new DeviceEvents(5);
  private clockLatch: Wide = [0, 0, 0];

  constructor(readonly id: 4 | 5, identity: NetworkIdentity, private readonly worldCycles: () => number) {
    if (id !== 4 && id !== 5) throw new RangeError('NIC is device Q or R');
    validateIdentity(identity);
    this.identity = Object.freeze([...identity]) as unknown as NetworkIdentity;
  }

  captureState(): NetworkDeviceState {
    return {id: this.id, identity: [...this.identity], connected: this.connected,
      txCursor: this.txCursor, rxCursor: this.rxCursor, rxHead: this.rxHead, rxCount: this.rxCount,
      rx: this.rx.map(frame => frame.slice()), staging: this.staging.slice(), tx: this.tx.slice(),
      due: this.due, result: this.result, dropped: this.dropped,
      events: this.events.captureState(), clockLatch: [...this.clockLatch]};
  }

  /** Validation is separate so a fabric can reject every bad port atomically. */
  validateState(state: NetworkDeviceState, time?: number): void {
    validateIdentity(state.identity);
    if (state.id !== this.id || identityKey(state.identity) !== identityKey(this.identity)) throw new Error('snapshot NIC identity mismatch');
    stateBoolean(state.connected);
    stateInteger(state.txCursor, 0, FRAME_SIZE - 1); stateInteger(state.rxCursor, 0, FRAME_SIZE - 1);
    stateInteger(state.rxHead, 0, 2); stateInteger(state.rxCount, 0, 3);
    if (!Array.isArray(state.rx) || state.rx.length !== 3) throw new RangeError('snapshot RX queue size');
    for (const frame of state.rx) stateTrytes(frame, FRAME_SIZE);
    stateTrytes(state.staging, FRAME_SIZE); stateTrytes(state.tx, FRAME_SIZE);
    if (state.due !== Infinity) {
      stateInteger(state.due, time ?? 0);
      if (!state.connected) throw new Error('disconnected snapshot NIC has pending TX');
      if (state.tx[0] !== 1 || state.tx[1]! < 1 || state.tx[1]! > 4 || state.tx[26]! < 0 || state.tx[26]! > FRAME_PAYLOAD ||
          this.identity.some((cell, i) => state.tx[i + 2] !== cell) || state.tx.slice(FRAME_HEADER + state.tx[26]!).some(cell => cell !== 0)) {
        throw new Error('invalid retained snapshot transmission');
      }
    }
    stateInteger(state.result, -5, 0); stateInteger(state.dropped, 0, TRYTE_MAX);
    new DeviceEvents(5).restoreState(state.events);
    stateTrytes(state.clockLatch, 3);
    const latch = decodeWide(state.clockLatch);
    if (time !== undefined && latch > Math.floor(time / NETWORK_TICK_CYCLES)) throw new Error('snapshot NIC clock latch is in the future');
  }

  /** No link event, IRQ flush or delivery occurs during restore. */
  restoreState(state: NetworkDeviceState): void {
    this.validateState(state);
    this.connected = state.connected; this.txCursor = state.txCursor; this.rxCursor = state.rxCursor;
    this.rxHead = state.rxHead; this.rxCount = state.rxCount;
    state.rx.forEach((frame, i) => this.rx[i]!.set(frame));
    this.staging.set(state.staging); this.tx.set(state.tx); this.due = state.due;
    this.result = state.result; this.dropped = state.dropped;
    this.events.restoreState(state.events); this.clockLatch = [...state.clockLatch];
  }

  get link(): boolean { return this.connected; }
  get completionTime(): number { return this.due; }
  setLink(connected: boolean): void {
    if (connected === this.connected) return;
    this.connected = connected;
    if (!connected) this.due = Infinity;
    this.events.raise(3);
  }

  reset(): void {
    this.txCursor = this.rxCursor = this.rxHead = this.rxCount = this.result = this.dropped = 0;
    this.due = Infinity;
    this.staging.fill(0); this.tx.fill(0);
    for (const frame of this.rx) frame.fill(0);
    this.clockLatch = [0, 0, 0];
    this.events.reset();
  }

  inspect(reg: number): number {
    const offset = reg + 13;
    if (offset >= 0 && offset < 3) return this.identity[offset]!;
    switch (offset) {
      case 3: return Number(this.connected);
      case 4: return this.rxCount;
      case 5: return Number(this.due !== Infinity);
      case 6: return this.txCursor;
      case 7: return this.staging[this.txCursor]!;
      case 8: return this.rxCursor;
      case 9: return this.rxCount ? this.rx[this.rxHead]![this.rxCursor]! : 0;
      case 11: return this.events.events;
      case 12: return this.events.enables;
      case 13: return this.result;
      case 14: return this.dropped;
      case 15: return encodeWide(Math.floor(this.worldCycles() / NETWORK_TICK_CYCLES))[0];
      case 16: return this.clockLatch[1];
      case 17: return this.clockLatch[2];
      default: return 0;
    }
  }

  read(reg: number): number {
    const offset = reg + 13;
    if (offset === 15) this.clockLatch = encodeWide(Math.floor(this.worldCycles() / NETWORK_TICK_CYCLES));
    const value = this.inspect(reg);
    if (offset === 7) this.txCursor = (this.txCursor + 1) % FRAME_SIZE;
    else if (offset === 9 && this.rxCount) this.rxCursor = (this.rxCursor + 1) % FRAME_SIZE;
    return value;
  }

  write(reg: number, value: number): boolean {
    const v = norm(value);
    switch (reg + 13) {
      case 6: if (v >= 0 && v < FRAME_SIZE) this.txCursor = v; break;
      case 7: this.staging[this.txCursor] = v; this.txCursor = (this.txCursor + 1) % FRAME_SIZE; break;
      case 8: if (v >= 0 && v < FRAME_SIZE) this.rxCursor = v; break;
      case 10: this.command(v); break;
      case 11: this.events.clear(v); break;
      case 12: this.events.enable(v); break;
    }
    return true;
  }

  private fail(result: number): void { this.result = result; this.events.raise(4); }
  private command(command: number): void {
    if (command === 0) { this.result = 0; return; }
    if (command === 4) { this.reset(); return; }
    if (command === 2) {
      if (!this.rxCount) { this.fail(-4); return; }
      this.rxHead = (this.rxHead + 1) % 3; this.rxCount--; this.rxCursor = 0; this.result = 0; return;
    }
    if (command === 3) { this.staging.fill(0); this.txCursor = 0; this.result = 0; return; }
    if (command !== 1) { this.fail(-5); return; }
    if (!this.connected) { this.fail(-2); return; }
    if (this.due !== Infinity) { this.fail(-1); return; }
    if (this.staging[0] !== 1 || this.staging[1]! < 1 || this.staging[1]! > 4 || this.staging[26]! < 0 || this.staging[26]! > FRAME_PAYLOAD) {
      this.fail(-3); return;
    }
    const due = this.worldCycles() + NETWORK_TICK_CYCLES;
    if (!Number.isSafeInteger(due)) throw new RangeError('world cycle limit reached');
    this.tx.set(this.staging);
    this.tx.set(this.identity, 2);
    this.tx.fill(0, FRAME_HEADER + this.tx[26]!);
    this.due = due; this.result = 0;
  }

  /** Fabric-only completion. Delivery is synchronous and precedes TX-complete. */
  complete(now: number, deliver: (frame: Int16Array) => void): void {
    if (this.due > now) return;
    deliver(this.tx);
    this.due = Infinity;
    this.events.raise(1);
  }

  /** Physical ingress: no protocol decisions beyond the sender NIC's framing. */
  receive(frame: Int16Array): void {
    if (!this.connected) return;
    if (frame.length !== FRAME_SIZE) throw new RangeError('physical frame size');
    if (this.rxCount === 3) {
      this.dropped = Math.min(TRYTE_MAX, this.dropped + 1);
      this.events.raise(2); return;
    }
    this.rx[(this.rxHead + this.rxCount) % 3]!.set(frame);
    if (this.rxCount++ === 0) this.events.raise(0);
  }

  /** Only the shared fabric advances network time; Machine ticks latch IRQs. */
  tick(_cycles: number, irq: (line: number) => void): void { this.events.flush(() => irq(NETWORK_IRQ)); }
}

interface Port { device: NetworkDevice; segment: string; }

/** Bounded link fabric. It never inspects network destinations or forwards LANs. */
export class NetworkFabric {
  private time = 0;
  private readonly ports = new Map<string, Port>();
  private ordered: Port[] = [];
  get cycles(): number { return this.time; }

  add(id: 4 | 5, identity: NetworkIdentity, segment: string): NetworkDevice {
    validateIdentity(identity);
    if (!segment) throw new Error('segment name must be nonempty');
    const key = identityKey(identity);
    if (this.ports.has(key)) throw new Error('duplicate world interface identity');
    const device = new NetworkDevice(id, identity, () => this.time);
    const port = { device, segment };
    this.ports.set(key, port);
    this.ordered = [...this.ports.values()].sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        const order = a.device.identity[i]! - b.device.identity[i]!;
        if (order) return order;
      }
      return 0;
    });
    device.setLink(true);
    device.reset(); // scenario power-on has link but no synthetic link-change event
    return device;
  }

  captureState(): NetworkFabricState {
    return {time: this.time, ports: this.ordered.map(port => ({segment: port.segment, device: port.device.captureState()}))};
  }

  /** Restore into an equivalent configured topology. All ports are validated
   * before any live state changes; completion order remains interface-identity order. */
  validateState(state: NetworkFabricState): void {
    stateInteger(state.time, 0);
    if (!Array.isArray(state.ports) || state.ports.length !== this.ports.size) throw new Error('snapshot fabric topology mismatch');
    const seen = new Set<string>();
    state.ports.forEach(saved => {
      validateIdentity(saved.device.identity);
      const key = identityKey(saved.device.identity), port = this.ports.get(key);
      if (!port || port.segment !== saved.segment || seen.has(key)) throw new Error('snapshot fabric topology mismatch');
      seen.add(key); port.device.validateState(saved.device, state.time);
    });
  }

  restoreState(state: NetworkFabricState): void {
    this.validateState(state);
    for (const saved of state.ports) this.ports.get(identityKey(saved.device.identity))!.device.restoreState(saved.device);
    this.time = state.time;
  }

  get nextEventTime(): number {
    let next = Infinity;
    for (const { device } of this.ordered) next = Math.min(next, device.completionTime);
    return next;
  }

  /** Advance once per world interval, processing all intervening deliveries. */
  advanceTo(target: number): void {
    if (!Number.isSafeInteger(target) || target < this.time) throw new RangeError('invalid world time');
    while (this.nextEventTime <= target) {
      this.time = this.nextEventTime;
      for (const port of this.ordered) port.device.complete(this.time, frame => this.deliver(port, frame));
    }
    this.time = target;
  }

  private deliver(sender: Port, frame: Int16Array): void {
    const destination: NetworkIdentity = [frame[5]!, frame[6]!, frame[7]!];
    if (destination.every(v => v === 0)) {
      for (const port of this.ordered) if (port !== sender && port.segment === sender.segment) port.device.receive(frame);
    } else {
      const port = this.ports.get(identityKey(destination));
      if (port?.segment === sender.segment) port.device.receive(frame);
    }
  }
}
