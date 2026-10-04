import type { BoardReference } from './simulationSoftwareReference';

/** Test-only rules: construct all rays geometrically, then capture in one update. */
export function reversiReference():BoardReference & {readonly player:string;readonly legal:number[];readonly passes:number} {
  const board=Array<string>(64).fill('.');board[27]='O';board[28]='X';board[35]='X';board[36]='O';
  let player='X',moves=0,status=0,passes=0;
  function captured(square:number,who:string):number[] {
    if(board[square]!=='.') return [];
    const found:number[]=[];
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) if(dr||dc) {
      const ray:number[]=[];
      for(let n=1;n<8;n++) {
        const row=Math.floor(square/8)+n*dr,col=square%8+n*dc;
        if(row<0||row>=8||col<0||col>=8) break;
        ray.push(row*8+col);
      }
      const end=ray.findIndex(i=>board[i]===who||board[i]==='.');
      if(end>0&&board[ray[end]!]===who) found.push(...ray.slice(0,end));
    }
    return found;
  }
  const legal=(who:string)=>Array.from({length:64},(_,i)=>i).filter(i=>captured(i,who).length);
  return {
    get board(){return board.join('');},get moves(){return moves;},get status(){return status;},
    get player(){return player;},get legal(){return status?[]:legal(player);},get passes(){return passes;},
    play(square:number){
      if(status) return;
      const flip=captured(square,player);if(!flip.length) return;
      for(const i of [square,...flip]) board[i]=player;moves++;
      const opponent=player==='X'?'O':'X';
      if(legal(opponent).length) {player=opponent;return;}
      if(legal(player).length){passes++;return;}
      const x=board.filter(c=>c==='X').length,o=board.filter(c=>c==='O').length;
      status=x>o?1:x<o?2:3;
    },
  };
}
