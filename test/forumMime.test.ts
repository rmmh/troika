import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { REG_P, REG_S } from '../src/core/machine';
import { encodeText } from '../src/core/textEncoding';
import { createStarterWorld } from '../src/world/starter';

const forumPages = ['board','games','build'].flatMap(name => [2,3,4,5].map(n => `/${name}${n}`));
const bbsPages = ['/newtopic','/t_demo','/t_a','/t_0123456789','/t_x_y','/','/index','/lab','/game','/take','/board','/forum','/games','/build','/trust','/files',...forumPages];
const archivePages = ['/','/index','/game','/share'];
const otherPaths = ['/t_','/t_abcdefghijk','/t_UPPER','/t_bad-name','', 'x', '/readme','/sample','/trustnotes','/takerules','/shared/demo','/shared/index','/shared/game',
  '/board1','/board6','/board20','/gamesx','/build0','/index2','/random2','/Board2','/gamex','/game/','/index/','/indexx','/shar'];

test.each(['server','archive'] as const)('production %s MIME policy matches only its immutable page-route allowlist', role => {
  const session = createStarterWorld(name => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8'));
  const machine = session.machines[role], labels = session.images[role].image.labels;
  const pages = new Set(role === 'server' ? bbsPages : archivePages);
  for (const path of new Set([...bbsPages,...archivePages,...otherPaths])) {
    const input = encodeText(path);
    input.forEach((cell, i) => machine.poke(1337 + i, cell));
    machine.poke(-13, 1337); machine.poke(-12, path.length);
    // Return through the image's existing status-and-halt test boundary.
    machine.poke(REG_S, 5709); machine.poke(5709, labels.get('failed')!);
    machine.poke(REG_P, labels.get('http_file_type')!); machine.sleep = null;
    expect(machine.run(100_000)).toBe('sleep-forever');
    expect(machine.peek(2199), path).toBe(pages.has(path) ? 2 : 1);
    expect(Array.from({length:path.length},(_,i)=>machine.peek(1337+i))).toEqual(input);
    expect(machine.peek(REG_S)).toBe(5710);
  }
});
