import type { createStarterWorld } from '../world/starter';
import { decodeAstronomyCartridge } from '../world/astronomy/cartridge';
import { astronomyAssetUrls } from './astronomyAssets';

/** Lazy physical media insertion, driven by the guest's missing-cartridge request.
 * There is no calendar, orbital model, or guest result generation in this layer. */
export class AstronomyMedia {
  private pending = new Set<number>();
  private generation = 0;
  constructor(private session: ReturnType<typeof createStarterWorld>) {}

  cancel(): void { this.generation++; this.pending.clear(); }

  poll(): void {
    const machine = this.session.machines.client;
    if (machine.peek(2532) !== 4 || machine.peek(2533) !== 319) return;
    const unit = machine.peek(3990);
    if (unit < 1 || unit > 21 || this.pending.has(unit)) return;
    if (this.session.controllers.client.attachedMedia()[unit]) return;
    this.pending.add(unit);
    const generation = this.generation;
    void this.insert(unit, generation);
  }

  private async insert(unit: number, generation: number): Promise<void> {
    try {
      const response = await fetch(new URL(astronomyAssetUrls[unit - 1]!, import.meta.url));
      if (!response.ok) throw new Error(`Astronomy cartridge HTTP ${response.status}`);
      const medium = await decodeAstronomyCartridge(unit, await response.arrayBuffer());
      if (generation !== this.generation) return;
      const id = this.session.world.registerMedium(medium);
      this.session.world.queueAction({kind: 'mount', host: 'client', unit, medium: id});
    } catch {
      if (generation === this.generation) {
        // The guest presents an actionable error and retains its date/input.
        this.session.machines.client.poke(3990, -unit);
      }
    } finally {
      if (generation === this.generation) this.pending.delete(unit);
    }
  }
}
