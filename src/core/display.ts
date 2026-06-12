// Display framebuffer geometry and the software display-enable control.
//
// The framebuffer is the first nine memory pages (0-8), a row-major 81x81
// grid of trytes (see display.txt). The debugger normally shows memory as a
// page-tiled map; software opts the top-left region into a true framebuffer
// view by writing the DISPLAY_ON signature to the control register.

import { fromTribbles } from './tryte';

/** Framebuffer base address (page 0, tribble AAA). */
export const VRAM_BASE = fromTribbles('AAA'); // -9841
export const VRAM_COLS = 81;
export const VRAM_ROWS = 81;
export const VRAM_SIZE = VRAM_COLS * VRAM_ROWS; // 6561

/**
 * Display-enable control register: the '_' register at address 0 (tribble
 * ___). It is otherwise unused (address 0 is an addressing-mode tribble, not
 * a general register), so it doubles as a one-tryte video-mode latch.
 *
 *   W Z DPN   ; enable the framebuffer view  (Z reads 0, so writes to addr 0)
 *   W Z DP_   ; disable it
 */
export const DISPLAY_CTRL = fromTribbles('___'); // 0
export const DISPLAY_ON = fromTribbles('DPN'); // -7208: framebuffer enabled
export const DISPLAY_OFF = fromTribbles('DP_'); // -7209: framebuffer disabled

/** True when software has latched the framebuffer view on. */
export function displayEnabled(read: (addr: number) => number): boolean {
  return read(DISPLAY_CTRL) === DISPLAY_ON;
}
