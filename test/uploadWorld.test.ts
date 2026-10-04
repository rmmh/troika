import { readFileSync } from 'node:fs';
import { setTimeout as yieldToRunner } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { encodeWide } from '../src/core/wide';
import { encodeText } from '../src/core/textEncoding';
import { createDiskImage } from '../src/firmware/diskImage';
import { readNativeDisk as readNative } from './nativeDiskReader';
const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
test('console PUT streams binary files, reports rejection, and preserves uploaded media across reboot', async () => {
  const body = Array.from({length:1485},(_,i)=>[-9841,0,9841,54,-54][i%5]!);
  const archiveDisk = createDiskImage({blocks:81,volumeId:[0,0,5],files:{'/net.seq':encodeWide(1),'/public/sample':body,'/public/shared/old':[1],'/public/empty':[]}});
  function boot(archiveDisk:Int16Array) {
    const r = createStarterWorld(source,{archiveDisk}); const {world,machines,keyboard}=r;
    function until(done:()=>boolean) { const end=world.cycles+100_000_000; while(!done()&&world.cycles<end) {world.runCycles(6561); expect(machines.client.peek(2504)).not.toBe(-2);} expect(done()).toBe(true); }
    function command(text:string) {keyboard.queueText(text); until(()=>canCheckpoint(r)); keyboard.queueTrytes([TEXT_KEYS.activate]); until(()=>canCheckpoint(r)); return starterScreen(machines.client);}
    until(()=>machines.server.peek(2381)===80&&machines.archive.peek(2381)===80); keyboard.queueText(' '); until(()=>canCheckpoint(r));
    keyboard.queueTrytes([TEXT_KEYS.console]); until(()=>canCheckpoint(r)); return {...r,command};
  }
  const r=boot(archiveDisk); await yieldToRunner(0);
  for(const cmd of ['put','put /raw','put   ']) expect(r.command(cmd)).toContain('error -137');
  expect(r.command('put /missing http://files.world/shared/new')).toContain('error -12');
  expect(r.command('get http://files.world/sample /raw')).toContain('ok');
  const sourceChecksum = r.command('sum /raw');
  expect(sourceChecksum).toContain('Blocks: 7'); expect(sourceChecksum).toContain('Last used: 27');
  const acceptedOrigin = Array.from({length:61},(_,i)=>r.machines.client.peek(6062+i));
  expect(r.command('put /raw http://files.world/shared/new')).toContain('ok');
  expect(Array.from({length:61},(_,i)=>r.machines.client.peek(6062+i))).toEqual(acceptedOrigin);
  expect(readNative(r.disks.archive.image(),'/public/shared/new')).toEqual(body);
  // A serial-range rollover near renewal must not turn this HTTP rejection into lease loss.
  expect(r.command('put /raw http://bbs.world/shared/new')).toContain('error 405');
  expect(r.command('put /raw http://files.world/index')).toContain('error 404');
  expect(r.command('put /raw http://files.world/shared/a-b')).toContain('error 400');
  expect(r.command('get http://files.world/empty /zero')).toContain('ok');
  expect(r.command('put /zero http://files.world/shared/new')).toContain('ok');
  expect(readNative(r.disks.archive.image(),'/public/shared/new')).toEqual([]);
  expect(r.command('write /note Mixed CASE from the console')).toContain('ok');
  expect(r.command('put /note http://files.world/shared/text')).toContain('ok');
  expect(r.command('get http://files.world/shared/text /verify')).toContain('ok');
  expect(readNative(r.disks.client.image(),'/verify')).toEqual(encodeText('Mixed CASE from the console'));
  expect(r.command('put /raw http://files.world/shared/new')).toContain('ok');
  expect(r.command('get http://files.world/shared/new /roundtrip')).toContain('ok');
  expect(readNative(r.disks.client.image(),'/roundtrip')).toEqual(body);
  expect(readNative(r.disks.client.image(),'/raw')).toEqual(body);
  expect(r.command('sum /roundtrip')).toBe(sourceChecksum);
  await yieldToRunner(0); const rebooted=boot(r.disks.archive.image());
  expect(rebooted.command('get http://files.world/shared/new /saved')).toContain('ok');
  expect(readNative(rebooted.disks.client.image(),'/saved')).toEqual(body);
  expect(rebooted.command('sum /saved')).toBe(sourceChecksum);
  expect(r.images.client.reserved).toBeLessThanOrEqual(12501);
},120_000);
