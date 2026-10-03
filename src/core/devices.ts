// MMIO devices occupy the windows _xA.._xZ: addresses with a zero high
// tribble, where the middle tribble x is the device id and the low tribble
// selects one of its 27 registers. Device id 0 is the CPU register file
// itself; id 1 is the interrupt controller. Both are native to the Machine.

export interface Device {
  /** Middle tribble of the device's MMIO window, -13..13 (not 0 or 1). */
  id: number;
  /** Intercept a read of device register reg (-13..13). `backing` is the RAM value. */
  read?(reg: number, backing: number): number;
  /** Read live state for debugging without consuming input or changing state.
   * Devices without this hook expose backing RAM to inspection. */
  inspect?(reg: number, backing: number): number;
  /** Intercept a write. Return true if handled; false also stores to backing RAM. */
  write?(reg: number, v: number): boolean;
  /** Called as emulated time advances; the callback latches an interrupt event.
   * All devices tick before pending-line priority is resolved at the boundary. */
  tick?(dcycles: number, irq: (line: number) => void): void;
  /**
   * Cycles until this device's next tick boundary that could raise an
   * interrupt (e.g. the next scanline). The machine caps a sleep advance to
   * the smallest such value so an interrupt raised at one boundary returns
   * control to the CPU before the next boundary is reached — this is what
   * makes per-scanline (hblank) interrupts deliverable during a single sleep.
   * Must be >= 1. Omit if the device has no scheduled events.
   */
  nextEventCycles?(): number;
}

/** CORE memory-mapper device 'M': reserved in the spec, semantics TBD. */
export function memoryMapperStub(): Device {
  return { id: -1 }; // 'M' tribble; plain RAM behavior until specified
}
