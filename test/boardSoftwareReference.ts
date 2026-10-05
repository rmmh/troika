import { mosaicGamesReference } from './mosaicGamesReference';
import { vintageGamesReference } from './vintageGamesReference';
import { strategyCabinetReference } from './strategyCabinetReference';
import { microPuzzlesReference } from './microPuzzlesReference';
import { tabletopPuzzlesReference } from './tabletopPuzzlesReference';
import { parlorArcadeReference } from './parlorArcadeReference';
import { classicPuzzlesReference } from './classicPuzzlesReference';
import { terminalArcadeReference } from './terminalArcadeReference';
import { retroArcadeReference } from './retroArcadeReference';
import { tabletopGamesReference } from './tabletopGamesReference';
import { microcomputerGamesReference } from './microcomputerGamesReference';
import { afterDarkGamesReference } from './afterDarkGamesReference';
import { fieldSimulationsReference } from './fieldSimulationsReference';
import { ruleLoomReference } from './ruleLoomReference';
import { neighborhoodCreativeReference } from './neighborhoodCreativeReference';
import { neighborhoodGamesReference } from './neighborhoodGamesReference';
import { neighborhoodSimulationsReference } from './neighborhoodSimulationsReference';
import { villageCreativeReference } from './villageCreativeReference';
import { villageSimulationsReference } from './villageSimulationsReference';
import { villageGamesReference } from './villageGamesReference';
import { classicSimulations2Reference } from './classicSimulations2Reference';
import { classicGames2Reference } from './classicGames2Reference';
import { basicSimulationsReference } from './basicSimulationsReference';
import { basicGamesReference } from './basicGamesReference';
import { logicGamesReference } from './logicGamesReference';
import { imageToolsReference } from './imageToolsReference';
import { minesweeperReference } from './minesweeperReference';
import { reversiReference } from './reversiReference';
import { graphicsSoftwareReference } from './graphicsSoftwareReference';
import { simulationSoftwareReference, type BoardReference } from './simulationSoftwareReference';

/** Independent test models. Production games never import or execute these. */
export function boardSoftwareReference(id:string): BoardReference {
  const mosaic = mosaicGamesReference(id); if (mosaic) return mosaic;
  const vintage = vintageGamesReference(id); if (vintage) return vintage;
  const strategy = strategyCabinetReference(id); if (strategy) return strategy;
  const microPuzzles=microPuzzlesReference(id);if(microPuzzles)return microPuzzles;
  const puzzles=tabletopPuzzlesReference(id);if(puzzles)return puzzles;
  const parlor=parlorArcadeReference(id);if(parlor)return parlor;
  const classic=classicPuzzlesReference(id);if(classic)return classic;
  const terminal=terminalArcadeReference(id);if(terminal)return terminal;
  const retro=retroArcadeReference(id);if(retro)return retro;
  const tabletop=tabletopGamesReference(id);if(tabletop)return tabletop;
  const micro=microcomputerGamesReference(id);if(micro)return micro;
  const afterDark=afterDarkGamesReference(id);if(afterDark)return afterDark;
  const field=fieldSimulationsReference(id);if(field)return field;
  if(id==='rule-loom')return ruleLoomReference();
  const neighborhoodGame=neighborhoodGamesReference(id);if(neighborhoodGame)return neighborhoodGame;
  const neighborhoodCreative=neighborhoodCreativeReference(id);if(neighborhoodCreative)return neighborhoodCreative;
  const neighborhoodSimulation=neighborhoodSimulationsReference(id);if(neighborhoodSimulation)return neighborhoodSimulation;
  const villageCreative=villageCreativeReference(id);if(villageCreative)return villageCreative;
  const villageSimulation=villageSimulationsReference(id);if(villageSimulation)return villageSimulation;
  const villageGame=villageGamesReference(id);if(villageGame)return villageGame;
  const classicSimulation=classicSimulations2Reference(id);if(classicSimulation)return classicSimulation;
  const classicGame=classicGames2Reference(id);if(classicGame)return classicGame;
  const basicGame=basicGamesReference(id);if(basicGame)return basicGame;
  const basicSimulation=basicSimulationsReference(id);if(basicSimulation)return basicSimulation;
  const logic=logicGamesReference(id);if(logic)return logic;
  const imageTool=imageToolsReference(id);if(imageTool)return imageTool;
  if(id==='minesweeper') return minesweeperReference();
  if(id==='reversi') return reversiReference();
  const graphics=graphicsSoftwareReference(id); if(graphics) return graphics;
  const simulation=simulationSoftwareReference(id); if (simulation) return simulation;
  const size = ({'four-in-row':42,'knight-tour':25,'triangle-pegs':25,warehouse:25,chomp:20,domineering:36} as Record<string,number>)[id] ?? (id==='eight-queens' ? 64 : id==='lights-out' ? 25 : 9);
  const cells = Array<string>(size).fill('.');
  let moves = 0, status = 0, player = 'X', selected=-1, last=-1, worker=11, box=12;
  const cross = (square:number) => {
    const row = Math.floor(square/5), col = square%5;
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) if (Math.abs(r-row)+Math.abs(c-col)<=1) {
      const i=r*5+c; cells[i]=cells[i]==='.' ? '*' : '.';
    }
  };
  if (id==='lights-out') for (const square of [0,6,12,18,24]) cross(square);
  if (id==='eight-puzzle') cells.splice(0,9,...'1234.8765');
  if (id==='triangle-pegs') cells.forEach((_,i)=>{cells[i]=i%5>Math.floor(i/5) ? ' ' : i===0 ? '.' : 'o';});
  const warehouse = () => {cells.splice(0,25,...('#####'+'#..o#'+'#...#'+'#...#'+'#####')); cells[box]=box===8 ? '*' : '$'; cells[worker]=worker===8 ? '+' : '@';};
  if (id==='warehouse') warehouse();
  if (id==='chomp') {cells.fill('o'); cells[0]='!';}
  return {
    get board() {return cells.join('');},
    get moves() {return moves;},
    get status() {return status;},
    play(square:number) {
      if (status && id!=='eight-queens') return;
      if (id==='four-in-row') {
        const col=square%7, row=[5,4,3,2,1,0].find(row=>cells[row*7+col]==='.');
        if (row===undefined) return;
        cells[row*7+col]=player; moves++;
        const won=cells.some((value,i)=>value===player && [[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc])=>
          [0,1,2,3].every(n=>{const r=Math.floor(i/7)+n*dr!,c=i%7+n*dc!; return r>=0 && r<6 && c>=0 && c<7 && cells[r*7+c]===player;})));
        status=won ? (player==='X' ? 1 : 2) : moves===42 ? 3 : 0;
        player=player==='X' ? 'O' : 'X'; return;
      }
      if (id==='knight-tour') {
        const legal=(a:number,b:number)=>Math.abs(Math.floor(a/5)-Math.floor(b/5))*Math.abs(a%5-b%5)===2;
        if (cells[square]!=='.' || (last>=0 && !legal(last,square))) return;
        if (last>=0) cells[last]='o'; cells[square]='K'; last=square; moves++;
        status=moves===25 ? 1 : cells.some((c,i)=>c==='.' && legal(square,i)) ? 0 : 2; return;
      }
      if (id==='triangle-pegs') {
        if (selected<0) {if (cells[square]==='o') {selected=square; cells[square]='*';} return;}
        if (square===selected) {cells[selected]='o'; selected=-1; return;}
        if (cells[square]!=='.') return;
        const dr=Math.floor(square/5)-Math.floor(selected/5), dc=square%5-selected%5;
        if (!((dr===0 && Math.abs(dc)===2) || (dc===0 && Math.abs(dr)===2) || (dr===dc && Math.abs(dr)===2))) return;
        const middle=(square+selected)/2;
        if (cells[middle]!=='o') return;
        cells[selected]='.'; cells[middle]='.'; cells[square]='o'; selected=-1; moves++;
        status=cells.filter(c=>c==='o').length===1 ? 1 : 0; return;
      }
      if (id==='warehouse') {
        if (Math.abs(Math.floor(square/5)-Math.floor(worker/5))+Math.abs(square%5-worker%5)!==1 || cells[square]==='#') return;
        if (square===box) {const next=box+(square-worker); if (next<0 || next>=25 || cells[next]==='#') return; box=next;}
        worker=square; moves++; status=box===8 ? 1 : 0; warehouse(); return;
      }
      if (id==='chomp') {
        if (cells[square]==='.') return;
        cells.forEach((_,i)=>{if (Math.floor(i/5)>=Math.floor(square/5) && i%5>=square%5) cells[i]='.';});
        moves++; player=player==='X' ? 'O' : 'X'; status=square===0 ? (player==='X' ? 1 : 2) : 0; return;
      }
      if (id==='domineering') {
        if (square===selected) {cells[square]='.'; selected=-1; return;}
        if (cells[square]!=='.') return;
        if (selected<0) {selected=square; cells[square]='*'; return;}
        const dr=Math.abs(Math.floor(square/6)-Math.floor(selected/6)),dc=Math.abs(square%6-selected%6);
        if (player==='X' ? dr!==0 || dc!==1 : dr!==1 || dc!==0) return;
        cells[selected]=player; cells[square]=player; selected=-1; moves++;
        player=player==='X' ? 'O' : 'X';
        const canPlay=cells.some((c,i)=>c==='.' && (player==='X' ? i%6<5 && cells[i+1]==='.' : i<30 && cells[i+6]==='.'));
        status=canPlay ? 0 : player==='X' ? 2 : 1; return;
      }
      if (id==='lights-out') {cross(square); moves++; status=cells.every(c=>c==='.') ? 1 : 0; return;}
      if (id==='noughts-crosses') {
        if (cells[square]!=='.') return;
        cells[square]=player; moves++;
        const lines = [0,1,2].flatMap(n=>[[n*3,n*3+1,n*3+2],[n,n+3,n+6]]).concat([[0,4,8],[2,4,6]]);
        status=lines.some(line=>line.every(i=>cells[i]===player)) ? (player==='X' ? 1 : 2) : (moves===9 ? 3 : 0);
        player=player==='X' ? 'O' : 'X'; return;
      }
      if (id==='eight-puzzle') {
        const empty=cells.indexOf('.');
        if (Math.abs(Math.floor(empty/3)-Math.floor(square/3))+Math.abs(empty%3-square%3)!==1) return;
        [cells[empty],cells[square]]=[cells[square]!,cells[empty]!]; moves++; status=cells.join('')==='12345678.' ? 1 : 0; return;
      }
      if (id==='eight-queens') {
        if (cells[square]==='Q') {cells[square]='.'; moves++; status=0; return;}
        const row=Math.floor(square/8), col=square%8;
        if (cells.some((c,i)=>c==='Q' && (Math.floor(i/8)===row || i%8===col || Math.abs(Math.floor(i/8)-row)===Math.abs(i%8-col)))) return;
        cells[square]='Q'; moves++; status=cells.filter(c=>c==='Q').length===8 ? 1 : 0; return;
      }
      throw new Error(`No board reference for ${id}`);
    },
  };
}
