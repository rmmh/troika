import type { Machine } from '../src/core/machine';
import { REG_P } from '../src/core/machine';
import type { buildWorldBrowser } from '../src/world/browserImages';
import { CLIENT_LAYOUT } from '../src/firmware/layout';
import { norm } from '../src/core/tryte';

/** Observations only: never changes guest allocation, execution or protocol state. */
export function auditClientMemory(m: Machine, built: Pick<ReturnType<typeof buildWorldBrowser>, 'base' | 'phases'>, core?: {end: number}) {
  const slot = built.base;
  const phases = new Set<string>(), touched = new Set<string>();
  let deepest = 0, phaseLoads = 0, currentPhase = '';
  const downloadData = built.phases.download!.assembly.labels.get('dd_saved_buffer')!;
  const downloadDataEnd = built.phases.download!.assembly.labels.get('dd_saved_lookup')! + 23;
  const write = m.write.bind(m);
  m.write = (address, value) => {
    const addr = norm(address);
    const region = CLIENT_LAYOUT.find(r => addr >= r.start && addr < r.start + r.size)!;
    if (region.name.startsWith('resident.') || region.name === 'margin') {
      // Only the download phase declares mutable storage inside its image:
      // 243 parked file cells and 23 lookup/handle cells for serial refill.
      const privateData = currentPhase === 'download' && m.peek(2488) === 2 &&
        addr >= downloadData && addr < downloadDataEnd;
      const programLoad = core && m.peek(REG_P) >= -3631 && m.peek(REG_P) < core.end &&
        !(addr >= -3631 && addr < core.end);
      if (!privateData && !programLoad && !(addr >= slot && addr < slot + 1906 && m.peek(2488) === 1)) {
        throw new Error(`client changed immutable code at ${addr}`);
      }
    }
    // Register instructions bypass Machine.write; inspect the live S register
    // at every bus write instead of waiting for a write to register address 6.
    const sp = m.peek(6);
    if (sp < 5468 || sp > 5710) throw new Error(`native stack escaped: ${sp}`);
    deepest = Math.max(deepest, 5710 - sp);
    if (region.name === 'native.stack') deepest = Math.max(deepest, 5710 - addr);
    touched.add(region.name);
    write(addr, value);
    if (addr === 2487 && value === 1) {
      const length = m.peek(2489);
      const match = Object.entries(built.phases).find(([, p]) =>
        p.file.length === length + 4 && p.file.slice(4).every((cell, i) => cell === m.peek(slot + i)));
      if (!match) throw new Error('loaded phase is not one of the production images');
      currentPhase = match[0]; phases.add(currentPhase); phaseLoads++;
    }
  };
  return { phases, touched, get deepest() { return deepest; }, get phaseLoads() { return phaseLoads; } };
}
