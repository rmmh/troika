import type { BoardReference } from './simulationSoftwareReference';
export function minesweeperReference():BoardReference & {flag(square:number):void} {
  const mines=new Set([2,9,16,24,29,34]);const board=Array<string>(36).fill('.');
  let status=0,moves=0,selected=0;
  const adjacent=(a:number,b:number)=>a!==b&&Math.abs(Math.floor(a/6)-Math.floor(b/6))<=1&&Math.abs(a%6-b%6)<=1;
  const neighbors=(a:number)=>Array.from({length:36},(_,i)=>i).filter(i=>adjacent(a,i));
  const flag=(square:number)=>{if(!status&&(board[square]==='.'||board[square]==='F'))board[square]=board[square]==='.'?'F':'.';};
  return {
    get board(){return board.join('');},get moves(){return moves;},get status(){return status;},flag,
    step(){flag(selected);},
    play(square:number){
      selected=square;if(status||board[square]!=='.') return;moves++;
      if(mines.has(square)){for(const i of mines)board[i]='*';status=2;return;}
      const pending=[square];
      while(pending.length){const i=pending.pop()!;if(board[i]!=='.'||mines.has(i))continue;
        const around=neighbors(i),count=around.filter(n=>mines.has(n)).length;board[i]=count?String(count):' ';
        if(!count)pending.push(...around);
      }
      if(board.filter(c=>c===' '||/[1-8]/.test(c)).length===30)status=1;
    },
  };
}
