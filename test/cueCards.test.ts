import {expect,test} from 'vitest';
import {CUE_CARDS} from '../src/world/software/cueCards';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {documentAppFixture} from './documentAppFixture';

test('cue cards edit, reorder, skip empty cues and save real disk records',()=>{
 const f=documentAppFixture(CUE_CARDS);
 expect(f.record(0)).toBe('FIRST: It only rains here.');
 expect(f.record(1)).toBe('SECOND: Move the chairs now.');
 expect(f.record(2)).toBe('[Pause. Listen to rain.]');
 f.edit(0,'One');f.edit(1,'');f.edit(2,'Three');f.edit(11,'Last');
 f.select(2);f.type('u');expect(f.record(1)).toBe('Three');expect(f.record(2)).toBe('');expect(f.m.peek(2613)).toBe(1);
 f.type('d');expect(f.record(2)).toBe('Three');expect(f.record(1)).toBe('');
 f.select(0);f.type('u');expect(f.m.peek(2613)).toBe(0);expect(f.record(0)).toBe('One');
 f.type('p');expect(f.report()).toContain('Cue 01:');expect(f.report()).toContain('One');
 f.type('n');expect(f.report()).toContain('Cue 03:');expect(f.report()).toContain('Three');
 f.type('n');expect(f.report()).toContain('Cue 12:');expect(f.report()).toContain('Last');
 f.type('n');expect(f.report()).toContain('Cue 12:');
 f.type('b');expect(f.report()).toContain('Cue 03:');
 const before=Array.from({length:12},(_,i)=>f.record(i));f.type('ud');expect(Array.from({length:12},(_,i)=>f.record(i))).toEqual(before);
 f.type('p');expect(f.m.peek(2613)).toBe(2);
 f.edit(7,'A'.repeat(54));expect(f.record(7)).toBe('A'.repeat(54));
 f.type('s');expect(f.m.peek(2614)).toBe(0);
 const saved=f.medium.image();
 const reloaded=documentAppFixture(CUE_CARDS,saved);reloaded.type('l');
 expect(Array.from({length:12},(_,i)=>reloaded.record(i))).toEqual(Array.from({length:12},(_,i)=>f.record(i)));
 reloaded.keyboard.queueTrytes([TEXT_KEYS.home]);reloaded.m.run(200_000);expect(reloaded.m.peek(2504)).toBe(11);
 expect(f.m.stackHighWater).toBeLessThan(243);expect(reloaded.m.stackHighWater).toBeLessThan(243);
},60_000);

test('cue reordering preserves every record across all positions',()=>{
 const f=documentAppFixture(CUE_CARDS),model=Array.from({length:12},(_,i)=>`Card ${i+1}`);
 model.forEach((text,i)=>f.edit(i,text));let seed=214;
 for(let n=0;n<120;n++){
  seed=seed*48271%2147483647;const selected=seed%12,direction=n%2?1:-1,next=selected+direction;
  f.select(selected);f.type(direction===1?'d':'u');
  if(next>=0&&next<12)[model[selected],model[next]]=[model[next]!,model[selected]!];
  expect(Array.from({length:12},(_,i)=>f.record(i))).toEqual(model);
  expect(f.m.peek(2613)).toBe(next>=0&&next<12?next:selected);
 }
},60_000);
