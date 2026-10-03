import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { createStarterWorld } from '../src/world/starter';

test('production BBS MIME policy recognizes only declared paginated forum paths', () => {
  const session = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const machine = session.machines.server, labels = session.images.server.image.labels;
  for (const path of ['/board2','/board5','/games2','/games5','/build2','/build5','/board1','/board6','/gamesx','/build0','/index2','/random2']) {
    encodeText(path).forEach((cell, i) => machine.poke(1337 + i, cell));
    machine.poke(-13, 1337); machine.poke(-12, path.length);
    // Return through the image's existing status-and-halt test boundary.
    machine.poke(REG_S, 5709); machine.poke(5709, labels.get('failed')!);
    machine.poke(REG_P, labels.get('http_file_type')!); machine.sleep = null;
    expect(machine.run(100_000)).toBe('sleep-forever');
    expect(machine.peek(2199), path).toBe(/^\/(board|games|build)[2-5]$/.test(path) ? 2 : 1);
    expect(machine.peek(REG_S)).toBe(5710);
  }
});
