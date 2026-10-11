import {setTimeout as yieldToRunner} from 'node:timers/promises';
import {expect, test} from 'vitest';
import {starterScreen} from '../src/world/starter';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {boot} from './noticeboardFixture';

test('a full forum page rolls a reply onto page two, links back and retains it across a cold boot', async () => {
  const { createDiskImage } = await import('../src/firmware/diskImage');
  const { encodeText } = await import('../src/core/textEncoding');
  const { encodeWide } = await import('../src/core/wide');
  const records = (...lines: string[]) => `PAGE 1\n${lines.join('\n')}\n`;
  const first = records('T 11:Noticeboard', 'F 9:/app/post', 'I 3:msg 0:', 'S 4:Post',
    'L 4:Home 6:/index', 'L 10:All topics 6:/forum', 'L 9:Next page 7:/board2',
    ...Array.from({ length: 18 }, (_, i) => `T 54:${`Earlier reply ${i}`.padEnd(54)}`));
  expect(first.length).toBeGreaterThan(1200);
  const second = records('T 17:Noticeboard (2/5)', 'F 10:/app/post2', 'I 3:msg 0:', 'S 5:Reply',
    'L 13:Previous page 6:/board', 'L 4:Home 6:/index');
  const image = createDiskImage({ blocks: 81, volumeId: [0,0,2], files: {
    '/net.seq': encodeWide(1),
    '/public/index': encodeText(records('T 23:Welcome to Troika World', 'L 9:Forth lab 4:/lab',
      'L 12:File library 6:/files', 'L 4:News 5:/news', 'L 11:Noticeboard 6:/board')),
    '/public/board': encodeText(first), '/public/board2': encodeText(second),
  } });
  const r = boot(image); await yieldToRunner(0);
  r.type('Rolled onto page two.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Noticeboard (2/5)');
  expect(starterScreen(r.machines.client)).toContain('Rolled onto page two.');
  r.type('Another page two reply.'); r.press(TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Another page two reply.');
  r.press(TEXT_KEYS.next, TEXT_KEYS.next, TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Earlier reply 0');
  expect(starterScreen(r.machines.client)).not.toContain('Rolled onto page two.');
  r.press(...Array(4).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  expect(starterScreen(r.machines.client)).toContain('Rolled onto page two.');
  expect(r.machines.client.peek(6218)).toBe(2); // Explicit native page MIME policy.
  expect(r.machines.server.peek(6960)).toBe(0);
  const retained = r.disks.server.image(); await yieldToRunner(0);
  const cold = boot(retained); await yieldToRunner(0);
  cold.press(...Array(4).fill(TEXT_KEYS.next), TEXT_KEYS.activate);
  expect(starterScreen(cold.machines.client)).toContain('Rolled onto page two.');
  expect(starterScreen(cold.machines.client)).toContain('Another page two reply.');
}, 90_000);
