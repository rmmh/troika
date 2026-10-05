import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { BlockDevice } from '../src/core/blockDevice';
import { AstronomyMedia } from '../src/web/astronomyMedia';
import type { createStarterWorld } from '../src/world/starter';
vi.mock('../src/web/astronomyAssets', () => ({astronomyAssetUrls: {'de441-3000.bin':'volume-51.bin'}}));
afterEach(() => vi.unstubAllGlobals());
const bytes = () => Uint8Array.from(readFileSync(new URL('../src/world/astronomy/data/de441-3000.bin', import.meta.url))).buffer;
function fixture() {
  const memory = new Map([[2532,4],[2533,319],[3990,51]]);
  const controller = new BlockDevice([]);
  const registerMedium = vi.fn().mockReturnValue(42), queueAction = vi.fn();
  const session = {machines:{client:{peek:(a:number)=>memory.get(a)??0,poke:(a:number,v:number)=>memory.set(a,v)}},controllers:{client:controller},world:{registerMedium,queueAction}} as unknown as ReturnType<typeof createStarterWorld>;
  return {loader:new AstronomyMedia(session),memory,controller,registerMedium,queueAction};
}
test('only a guest astronomy request fetches a cartridge, then queues one physical mount', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(bytes())); vi.stubGlobal('fetch',fetcher);
  const f=fixture(); f.memory.set(2533,317); f.loader.poll(); expect(fetcher).not.toHaveBeenCalled();
  f.memory.set(2533,319); f.memory.set(3990,0); f.loader.poll(); expect(fetcher).not.toHaveBeenCalled();
  f.memory.set(3990,51); f.loader.poll(); f.loader.poll();
  await vi.waitFor(()=>expect(f.queueAction).toHaveBeenCalledOnce());
  expect(fetcher).toHaveBeenCalledOnce();
  expect(f.queueAction).toHaveBeenCalledWith({kind:'mount',host:'client',unit:1,medium:42});
  expect(f.registerMedium.mock.calls[0]![0].readOnly).toBe(true);
});
test('failed transfer reports failure without mounting, and an explicit guest retry can recover', async () => {
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(bytes())); vi.stubGlobal('fetch',fetcher);
  const f=fixture(); f.loader.poll();
  await vi.waitFor(()=>expect(f.memory.get(3990)).toBe(-51));
  f.loader.poll(); expect(fetcher).toHaveBeenCalledOnce(); expect(f.queueAction).not.toHaveBeenCalled();
  f.memory.set(3990,51); f.loader.poll(); await vi.waitFor(()=>expect(f.queueAction).toHaveBeenCalledOnce());
});
test('snapshot or checkpoint cancellation prevents stale asynchronous insertion', async () => {
  let complete!: (response:Response)=>void;
  vi.stubGlobal('fetch',vi.fn().mockReturnValue(new Promise<Response>(resolve=>{complete=resolve;})));
  const f=fixture(); f.loader.poll(); f.loader.cancel(); complete(new Response(bytes()));
  await new Promise(resolve=>setTimeout(resolve,30));
  expect(f.queueAction).not.toHaveBeenCalled(); expect(f.registerMedium).not.toHaveBeenCalled();
});

test('revisiting a century reuses verified media instead of downloading or allocating it again', async () => {
  const fetcher=vi.fn().mockResolvedValue(new Response(bytes())); vi.stubGlobal('fetch',fetcher);
  const f=fixture(); f.loader.poll(); await vi.waitFor(()=>expect(f.queueAction).toHaveBeenCalledOnce());
  const medium=f.registerMedium.mock.calls[0]![0]; f.controller.setMedium(1,medium);
  f.loader.poll(); expect(f.queueAction).toHaveBeenCalledOnce();
  f.controller.setMedium(1,undefined); f.loader.poll();
  await vi.waitFor(()=>expect(f.queueAction).toHaveBeenCalledTimes(2));
  expect(fetcher).toHaveBeenCalledOnce();
  expect(f.registerMedium.mock.calls[1]![0]).toBe(medium);
});

test('changing dates while a transfer is pending discards its stale mount', async () => {
  let complete!: (response:Response)=>void;
  vi.stubGlobal('fetch',vi.fn().mockReturnValue(new Promise<Response>(resolve=>{complete=resolve;})));
  const f=fixture(); f.loader.poll(); f.memory.set(3990,41); complete(new Response(bytes()));
  await new Promise(resolve=>setTimeout(resolve,30));
  expect(f.queueAction).not.toHaveBeenCalled(); expect(f.memory.get(3990)).toBe(41);
});

test('leaving astronomy during a failed transfer cannot overwrite the next program scratch memory', async () => {
  let complete!: (response:Response)=>void;
  vi.stubGlobal('fetch',vi.fn().mockReturnValue(new Promise<Response>(resolve=>{complete=resolve;})));
  const f=fixture(); f.loader.poll(); f.memory.set(2533,317); complete(new Response('',{status:503}));
  await new Promise(resolve=>setTimeout(resolve,30));
  expect(f.memory.get(3990)).toBe(51); expect(f.queueAction).not.toHaveBeenCalled();
});
