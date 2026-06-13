// MMIO device O (id=2, tribble O, addresses _OA.._OZ = 41..67).
// Handles: scanline counter, scroll registers, backdrop, hide mask,
// gamepad inputs, and raises vblank / scanline-compare / gamepad-edge IRQs.

import type { Device } from './devices';
import type { ScanlineScroll } from './gameRenderer';
import { norm, tritsRaw } from './tryte';
import {
  REG_BACKDROP,
  REG_BG0_SCX,
  REG_BG0_SCY,
  REG_BG1_SCX,
  REG_BG1_SCY,
  REG_HIDE_MASK,
  REG_PAD1,
  REG_PAD2,
  REG_SCANLINE,
  REG_SCANLINE_CMP,
} from './display';

// Device O register offsets (addr - 2*27 = addr - 54):
const OFF_BG0_SCX = REG_BG0_SCX - 54; // -13 (_OA)
const OFF_BG0_SCY = REG_BG0_SCY - 54; // -12 (_OB)
const OFF_BG1_SCX = REG_BG1_SCX - 54; // -11 (_OC)
const OFF_BG1_SCY = REG_BG1_SCY - 54; // -10 (_OD)
const OFF_SCANLINE = REG_SCANLINE - 54; // -9  (_OE) read-only
const OFF_SCANLINE_CMP = REG_SCANLINE_CMP - 54; // -8  (_OF) read/write
const OFF_BACKDROP = REG_BACKDROP - 54; // -7  (_OG) read/write
const OFF_HIDE_MASK = REG_HIDE_MASK - 54; // -6  (_OH) read/write
const OFF_PAD1 = REG_PAD1 - 54; // -3  (_OK) read-only
const OFF_PAD2 = REG_PAD2 - 54; // -2  (_OL) read-only

export class DisplayDevice implements Device {
  readonly id = 2; // tribble O

  private scanline = 0;
  // 729 cycles per 10 scanlines; track fractional scanlines as cycleAcc*10
  private cycleAcc = 0;

  // Per-scanline scroll latch (HDMA-style line buffer). The scroll registers
  // are sampled into the entry for each scanline as it begins, so a CPU hblank
  // handler that rewrites them per line produces a visible raster effect even
  // though the renderer composites a single end-of-frame snapshot.
  readonly scroll: ScanlineScroll = {
    bg0x: new Int16Array(243),
    bg0y: new Int16Array(243),
    bg1x: new Int16Array(243),
    bg1y: new Int16Array(243),
  };

  private padState: [number, number] = [0, 0];
  private prevPadState: [number, number] = [0, 0];
  private padEdgePending = false;

  constructor(
    private readonly peek: (addr: number) => number,
    private readonly poke: (addr: number, v: number) => void,
  ) {}

  /**
   * Called from the keyboard handler to update gamepad state.
   * Computes an edge (any bit going from 0 to non-zero).
   */
  setGamepadState(pad: 0 | 1, state: number): void {
    const s = norm(state);
    this.prevPadState[pad] = this.padState[pad]!;
    this.padState[pad] = s;
    // Edge: any trit that was 0 (unbalanced 1) and is now non-zero
    const prev = tritsRaw(this.prevPadState[pad]!);
    const curr = tritsRaw(s);
    for (let i = 0; i < 9; i++) {
      if (prev[i] === 1 && curr[i] !== 1) {
        this.padEdgePending = true;
        break;
      }
    }
  }

  reset(): void {
    this.scanline = 0;
    this.cycleAcc = 0;
    this.padState = [0, 0];
    this.prevPadState = [0, 0];
    this.padEdgePending = false;
    this.scroll.bg0x.fill(0);
    this.scroll.bg0y.fill(0);
    this.scroll.bg1x.fill(0);
    this.scroll.bg1y.fill(0);
  }

  read(reg: number, backing: number): number {
    if (reg === OFF_SCANLINE) return this.scanline; // _OE: always live
    if (reg === OFF_PAD1) return this.padState[0]!; // _OK
    if (reg === OFF_PAD2) return this.padState[1]!; // _OL
    return backing;
  }

  write(reg: number, _v: number): boolean {
    // _OE, _OK, _OL are read-only; swallow writes without storing to backing RAM
    if (reg === OFF_SCANLINE || reg === OFF_PAD1 || reg === OFF_PAD2) return true;
    return false; // scroll regs, backdrop, hide mask etc. stored in backing RAM
  }

  /** Cycles until the next scanline boundary (cycleAcc reaches 729). Always >= 1. */
  nextEventCycles(): number {
    return Math.ceil((729 - this.cycleAcc) / 10);
  }

  tick(dcycles: number, irq: (line: number) => void): void {
    // 729 cycles = 10 scanlines (integer arithmetic via *10)
    this.cycleAcc += dcycles * 10;
    while (this.cycleAcc >= 729) {
      this.cycleAcc -= 729;
      this.scanline = (this.scanline + 1) % 243;
      this.poke(REG_SCANLINE, this.scanline); // keep backing RAM in sync for Inspector

      // Latch the scroll registers for the line now beginning, before any
      // interrupt handler for this scanline runs (it prepares the next line).
      const s = this.scanline;
      this.scroll.bg0x[s] = norm(this.peek(REG_BG0_SCX));
      this.scroll.bg0y[s] = norm(this.peek(REG_BG0_SCY));
      this.scroll.bg1x[s] = norm(this.peek(REG_BG1_SCX));
      this.scroll.bg1y[s] = norm(this.peek(REG_BG1_SCY));

      if (this.padEdgePending) {
        this.padEdgePending = false;
        irq(2); // gamepad edge → line 2
      }
      if (this.scanline === 162) irq(0); // vblank → line 0
      const cmp = this.peek(REG_SCANLINE_CMP);
      if (this.scanline === cmp) irq(1); // scanline compare → line 1
    }
  }
}

// Re-export register constants that assembly demos / tests may reference by name.
export {
  OFF_BG0_SCX,
  OFF_BG0_SCY,
  OFF_BG1_SCX,
  OFF_BG1_SCY,
  OFF_BACKDROP,
  OFF_HIDE_MASK,
};
