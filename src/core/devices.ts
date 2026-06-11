// MMIO devices occupy the windows _xA.._xZ: addresses with a zero high
// tribble, where the middle tribble x is the device id and the low tribble
// selects one of its 27 registers. Device id 0 is the CPU register file
// itself and is handled natively by the Machine.

export interface Device {
  /** Middle tribble of the device's MMIO window, -13..13 (not 0). */
  id: number;
  /** Intercept a read of device register reg (-13..13). `backing` is the RAM value. */
  read?(reg: number, backing: number): number;
  /** Intercept a write. Return true if handled; false also stores to backing RAM. */
  write?(reg: number, v: number): boolean;
  /** Called as emulated time advances, with an interrupt-raising callback. */
  tick?(dcycles: number, irq: (line: number) => void): void;
}

/** CORE memory-mapper device 'M': reserved in the spec, semantics TBD. */
export function memoryMapperStub(): Device {
  return { id: -1 }; // 'M' tribble; plain RAM behavior until specified
}
