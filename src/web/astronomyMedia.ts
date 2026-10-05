import type { BlockMedium } from '../core/blockDevice';
import type { createStarterWorld } from '../world/starter';
import { decodeAstronomyCartridge, astronomyVolume } from '../world/astronomy/cartridge';
import { astronomyAssetUrls } from './astronomyAssets';

/** Lazy physical media insertion, driven by the guest's missing-cartridge request.
 * There is no calendar, orbital model, or guest result generation in this layer. */
export class AstronomyMedia {
  private pending = new Set<number>();
  private generation = 0;
  private cartridges = new Map<number, BlockMedium>();
  constructor(private session: ReturnType<typeof createStarterWorld>) {}

  cancel(): void { this.generation++; this.pending.clear(); }

  poll(): void {
    const machine = this.session.machines.client;
    if (machine.peek(2532) !== 4 || machine.peek(2533) !== 319) return;
    const archive = machine.peek(3990);
    if (archive < 1 || archive > 51 || this.pending.has(archive)) return;
    const mounted = this.session.controllers.client.attachedMedia()[1];
    if (mounted?.read(0)[2] === (archive - 21) * 100) return;
    this.pending.add(archive);
    const generation = this.generation;
    void this.insert(archive, generation);
  }

  private async insert(archive: number, generation: number): Promise<void> {
    try {
      const entry = astronomyVolume(archive);
      let medium = this.cartridges.get(archive);
      // A snapshot restore can replace the contents of an existing medium.
      if (!medium || medium.blocks !== entry.blocks || medium.read(0)[2] !== entry.firstYear) {
        const response = await fetch(new URL(astronomyAssetUrls[entry.file]!, import.meta.url), {signal: AbortSignal.timeout(30_000)});
        if (!response.ok) throw new Error(`Astronomy cartridge HTTP ${response.status}`);
        medium = await decodeAstronomyCartridge(archive, await response.arrayBuffer());
      }
      const machine = this.session.machines.client;
      if (generation !== this.generation || machine.peek(3990) !== archive || machine.peek(2532) !== 4 || machine.peek(2533) !== 319) return;
      this.cartridges.set(archive, medium);
      const id = this.session.world.registerMedium(medium);
      this.session.world.queueAction({kind: 'mount', host: 'client', unit: 1, medium: id});
    } catch {
      if (generation === this.generation && this.session.machines.client.peek(3990) === archive && this.session.machines.client.peek(2532) === 4 && this.session.machines.client.peek(2533) === 319) {
        // The guest presents an actionable error and retains its date/input.
        this.session.machines.client.poke(3990, -archive);
      }
    } finally {
      if (generation === this.generation) this.pending.delete(archive);
    }
  }
}
