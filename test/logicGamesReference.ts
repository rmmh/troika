import type { BoardReference } from './simulationSoftwareReference';
export function logicGamesReference(id:string):BoardReference|undefined {
  if(id==='codebreaker') {
    const cells=[...'1111....'+'.'.repeat(56)];let row=0,moves=0,status=0;
    return {get board(){return cells.join('');},get moves(){return moves;},get status(){return status;},
      play(i:number){if(status||Math.floor(i/8)!==row||i%8>=4)return;cells[i]=String(Number(cells[i])%6+1);},
      step(){if(status)return;const guess=cells.slice(row*8,row*8+4),secret=[...'2452'];
        const exact=guess.filter((c,i)=>c===secret[i]).length,remaining=[...secret];let matched=0;
        for(const c of guess){const at=remaining.indexOf(c);if(at>=0){remaining.splice(at,1);matched++;}}
        cells.splice(row*8+4,4,'B',String(exact),'W',String(matched-exact));moves++;
        if(exact===4)status=1;else if(++row===8)status=2;else cells.splice(row*8,4,...'1111');
      },
    };
  }
  if(id==='frog-swap') {
    const cells=[...'#######>>>.<<<#######'];let moves=0,status=0;
    return {get board(){return cells.join('');},get moves(){return moves;},get status(){return status;},
      play(i:number){if(status||!['>','<'].includes(cells[i]!))return;const direction=cells[i]==='>'?1:-1,gap=cells.indexOf('.'),distance=(gap-i)*direction;
        if(distance!==1&&(distance!==2||cells[i+direction]!== (direction===1?'<':'>')))return;
        [cells[i],cells[gap]]=[cells[gap]!,cells[i]!];moves++;if(cells.join('')==='#######<<<.>>>#######')status=1;
      },
    };
  }
}
/** Independent breadth-first search over all possible seven-pad arrangements. */
export function frogSolution():number[] {
  const queue:[string,number[]][]=[['>>>.<<<',[]]],seen=new Set(['>>>.<<<']);
  for(let q=0;q<queue.length;q++) {
    const [state,path]=queue[q]!;if(state==='<<<.>>>')return path;
    const gap=state.indexOf('.');
    for(const delta of [-2,-1,1,2]) {
      const from=gap+delta;if(from<0||from>=7||state[from]!== (delta<0?'>':'<'))continue;
      if(Math.abs(delta)===2&&state[gap+delta/2]!== (delta<0?'<':'>'))continue;
      const next=[...state];[next[from],next[gap]]=[next[gap]!,next[from]!];const key=next.join('');
      if(!seen.has(key)){seen.add(key);queue.push([key,[...path,from+7]]);}
    }
  }
  throw new Error('Frog puzzle has no solution');
}
