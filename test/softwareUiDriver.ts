import { REG_P, type Machine } from '../src/core/machine';
import { OFF_STATUS, type TextDevice } from '../src/core/textDevice';

/** Observe the real guest input loop after every queued key and redraw finishes.
 * Breakpoints avoid burning a fixed cycle allowance in the idle polling loop.
 * The allowance still bounds a wedged algorithm or missing return to the UI. */
export function settleSoftwareUi(m: Machine, keyboard: TextDevice, keyLoop: number, budget = 800_000): void {
  const end = m.cycles + budget, stops = new Set([keyLoop]);
  while (m.cycles < end) {
    const result = m.run(end-m.cycles,stops);
    if (result !== 'breakpoint') break;
    // app_key starts by publishing readiness. It is reached after computation
    // and drawing, but also between keys, so the physical queue must be empty.
    m.step();
    if (keyboard.inspect(OFF_STATUS,0) === 3 && m.peek(2514) === 1) return;
  }
  throw new Error(`Native software did not settle: PC=${m.peek(REG_P)}, app=${m.peek(2533)}, input status=${keyboard.inspect(OFF_STATUS,0)}, ready=${m.peek(2514)}, budget=${budget}`);
}
