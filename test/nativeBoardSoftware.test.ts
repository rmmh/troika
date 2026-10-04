import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { buildProgramCore } from '../src/firmware/programCore';
import { buildNativeSoftware } from '../src/world/software/native';
import { BOARD_SOFTWARE } from '../src/world/software/boards';
import { FirmwareProbe } from './firmwareProbe';
import { TextDevice } from '../src/core/textDevice';
import { DisplayDevice } from '../src/core/displayDevice';
import { REG_P } from '../src/core/machine';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { starterScreen } from '../src/world/starter';
import { settleSoftwareUi } from './softwareUiDriver';
import { boardSoftwareReference } from './boardSoftwareReference';

const source = (name:string) => readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
const core = buildProgramCore(source,{name:'menu',source:source('programMenu')});

for (const app of BOARD_SOFTWARE) test(`${app.id} plays, rejects illegal moves and resets through the native keyboard`, () => {
  const built = buildNativeSoftware(core,source,app), cells = app.columns*app.rows;
  expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
  const m = new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);
  for (const image of [core.image,built.image]) for (const chunk of image.image.chunks) chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
  m.poke(REG_P,built.image.image.labels.get('app_entry')!);
  m.poke(2899,733); m.poke(2900+cells,377);
  const keyboard = new TextDevice(); m.attach(keyboard); m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
  const settle = () => settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);
  const key = (value:number) => {keyboard.queueTrytes([value]); settle();};
  const board = () => String.fromCharCode(...Array.from({length:cells},(_,i)=>m.peek(2900+i)));
  settle(); const initial = board();
  expect(starterScreen(m)).toContain(app.title);
  expect(m.peek(2533)).toBe(app.number);
  // Arrow boundaries clamp; Tab and Shift-Tab visit the complete board.
  key(TEXT_KEYS.left); key(TEXT_KEYS.up); expect(m.peek(2630)).toBe(0);
  key(TEXT_KEYS.previous); expect(m.peek(2630)).toBe(cells-1);
  key(TEXT_KEYS.down); key(TEXT_KEYS.right); expect(m.peek(2630)).toBe(cells-1);
  key(TEXT_KEYS.next); expect(m.peek(2630)).toBe(0);
  key(TEXT_KEYS.down); expect(m.peek(2630)).toBe(app.columns);
  key(TEXT_KEYS.right); expect(m.peek(2630)).toBe(app.columns+1);
  key(TEXT_KEYS.up); key(TEXT_KEYS.left); expect(m.peek(2630)).toBe(0);
  let model = boardSoftwareReference(app.id), seed = app.number;
  expect(board()).toBe(model.board);
  // Exercise every rule against a separate model after each physical move.
  for (let turn=0;turn<128;turn++) {
    seed=(seed*48271)%2147483647; const square=seed%cells, current=m.peek(2630);
    const dr=Math.floor(square/app.columns)-Math.floor(current/app.columns), dc=square%app.columns-current%app.columns;
    if (app.stepKey && turn%3===2) {keyboard.queueText(app.stepKey); settle(); model.step!();} else {
      keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0 ? TEXT_KEYS.up : TEXT_KEYS.down));
      keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0 ? TEXT_KEYS.left : TEXT_KEYS.right));
      keyboard.queueTrytes([TEXT_KEYS.activate]); settle(); model.play(square);
    }
    expect(board(),`${app.id}: move ${turn}, square ${square}`).toBe(model.board);
    expect(m.peek(2631)).toBe(model.moves); expect(m.peek(2632)).toBe(model.status);
    if (model.status) {keyboard.queueText('r'); settle(); model=boardSoftwareReference(app.id);}
  }
  const examples = [...app.examples];
  if (app.id==='noughts-crosses') {
    const lines = [0,1,2].flatMap(n=>[[n*3,n*3+1,n*3+2],[n,n+3,n+6]]).concat([[0,4,8],[2,4,6]]);
    for (const line of lines) {
      const others=Array.from({length:9},(_,i)=>i).filter(i=>!line.includes(i));
      const moves=[line[0]!,others[0]!,line[1]!,others[1]!,line[2]!];
      const ref=boardSoftwareReference(app.id); moves.forEach(square=>ref.play(square));
      examples.push({moves,board:ref.board,status:1,movesMade:5});
    }
  }
  if (app.id==='four-in-row') {
    for (const moves of [[0,0,1,1,2,2,3],[0,1,1,2,4,2,2,3,4,3,5,3,3],[6,5,5,4,2,4,4,3,2,3,1,3,3]]) {
      const ref=boardSoftwareReference(app.id); moves.forEach(square=>ref.play(square));
      expect(ref.status).toBe(1);
      examples.push({moves,board:ref.board,status:1,movesMade:ref.moves});
    }
  }
  if (app.id==='domineering') {
    const ref=boardSoftwareReference(app.id), moves:number[]=[];
    while (!ref.status && moves.length<36) {
      const horizontal=ref.moves%2===0, cells=[...ref.board];
      const first=cells.findIndex((cell,i)=>cell==='.' && (horizontal ? i%6<5 && cells[i+1]==='.' : i<30 && cells[i+6]==='.'));
      expect(first).toBeGreaterThanOrEqual(0);
      const second=first+(horizontal ? 1 : 6); moves.push(first,second); ref.play(first); ref.play(second);
    }
    expect(ref.status).toBeGreaterThan(0);
    examples.push({moves,board:ref.board,status:ref.status,movesMade:ref.moves});
  }
  if (app.id==='eight-queens') {
    const moves=[0,12,23,29,34,46,49,59,0], ref=boardSoftwareReference(app.id);
    moves.forEach(square=>ref.play(square));
    examples.push({moves,board:ref.board,status:0,movesMade:9});
  }
  const simulationCase=(moves:number[], steps:number)=>{
    const ref=boardSoftwareReference(app.id); moves.forEach(square=>ref.play(square));
    for (let step=0;step<steps;step++) ref.step!();
    examples.push({moves,steps,board:ref.board,status:ref.status,movesMade:ref.moves});
    return ref;
  };
  if (app.id==='life-lab') simulationCase([0,1,8,9],2);
  if (app.id==='wireworld') {
    expect(simulationCase([0,1,1,8,8],1).board[0]).toBe('H');
    expect(simulationCase([0,1,1,8,8,9,9],1).board[0]).toBe('#');
  }
  if (app.id==='langton-ant') {
    const ref=boardSoftwareReference(app.id); let wrapped=false;
    for (let step=0;step<256;step++) {
      const before=ref.board.search(/[\^>v<]/); ref.step!(); const after=ref.board.search(/[\^>v<]/);
      if (Math.abs(before%8-after%8)===7 || Math.abs(Math.floor(before/8)-Math.floor(after/8))===7) wrapped=true;
    }
    expect(wrapped).toBe(true); examples.push({moves:[],steps:256,board:ref.board,status:0,movesMade:256});
  }
  if (app.id==='sandpile') expect(simulationCase(Array(12).fill(0),2).board[0]).toBe('1');
  if (app.id==='heat-grid') expect(simulationCase([0,0],1).board[0]).toBe('2');
  if (app.id==='maze-route') {
    const snake=simulationCase([...Array.from({length:7},(_,i)=>8+i),...Array.from({length:7},(_,i)=>25+i),...Array.from({length:7},(_,i)=>40+i)],1);
    expect([...snake.board].filter(c=>c==='*').length+1).toBe(28);
    expect(simulationCase(Array.from({length:8},(_,i)=>32+i),1).status).toBe(-1);
  }
  for (const example of examples) {
    keyboard.queueText('R'); settle();
    expect(board()).toBe(initial); expect(m.peek(2631)).toBe(0); expect(m.peek(2632)).toBe(0);
    for (const [move,square] of example.moves.entries()) {
      const distance = (square-m.peek(2630)+cells)%cells;
      keyboard.queueTrytes(Array(distance).fill(TEXT_KEYS.next));
      if (move%2) keyboard.queueText(' '); else keyboard.queueTrytes([TEXT_KEYS.activate]);
      settle();
    }
    for (let step=0;step<(example.steps??0);step++) {keyboard.queueText(step%2 ? 'N' : 'n'); settle();}
    expect(board(),JSON.stringify(example.moves)).toBe(example.board);
    expect(m.peek(2631)).toBe(example.movesMade); expect(m.peek(2632)).toBe(example.status);
    expect(m.peek(2899)).toBe(733); expect(m.peek(2900+cells)).toBe(377);
    expect(m.stackHighWater).toBeLessThan(243);
    const origin=-9841+5*27+Math.floor((27-app.columns*3)/2);
    for (let cell=0;cell<cells;cell++) {
      const address=origin+Math.floor(cell/app.columns)*54+(cell%app.columns)*3;
      expect(m.peek(address+1)).toBe(example.board.charCodeAt(cell));
      expect(m.peek(address)).toBe(cell===m.peek(2630) ? 91 : 32);
      expect(m.peek(address+2)).toBe(cell===m.peek(2630) ? 93 : 32);
    }
  }
  keyboard.queueText('r'); settle(); expect(board()).toBe(initial); expect(m.peek(2630)).toBe(0);
  keyboard.queueTrytes([TEXT_KEYS.home]); m.run(100_000);
  expect(m.peek(2504)).toBe(11); expect(starterScreen(m)).toContain('Troika programs');
});
