import {test,expect} from 'vitest';
import {POCKET_PINBALL} from '../src/world/software/playfulWorkshops';
import {pinballStep} from './playfulWorkshopsReference';
import {visualFixture} from './visualCanvasFixture';

test('Pocket Pinball has a complete legal keyboard win with frequent bumper contacts',()=>{
  const f=visualFixture(POCKET_PINBALL);
  f.key(88);f.type(' ');
  let expected=[324,520,-7,-28,1,3,0,-7,0,0,0,0,0,0];
  expect(f.read(2700,14)).toEqual(expected);
  let ticks=0,presses=0,bumpers=0,returns=0;
  while(!expected[13]){
    if(expected[3]!>0&&expected[1]!>410){
      f.type('zx');expected[10]=4;expected[11]=4;presses++;
    }
    const score=expected[6]!;
    expected=pinballStep(expected);f.type('n');
    const gain=expected[6]!-score;
    if(gain>=10)bumpers++;
    if(gain%10)returns++;
    expect(f.read(2700,14),`tick ${ticks}`).toEqual(expected);
    expect(++ticks).toBeLessThan(400);
  }
  expect({ticks,presses,bumpers,returns,score:expected[6],balls:expected[5],ending:expected[13]})
    .toEqual({ticks:328,presses:30,bumpers:19,returns:12,score:202,balls:3,ending:1});
  expect(f.m.peek(2606)).toBe(0);
  const terminal=f.read(2700,14);for(const key of ['z','x','n'])f.type(key);f.key(88);
  expect(f.read(2700,14)).toEqual(terminal);
  f.type('r');expect(f.m.peek(2706)).toBe(0);expect(f.m.peek(2705)).toBe(3);
},120000);
