export interface BoardReference {
  readonly board:string;
  readonly moves:number;
  readonly status:number;
  play(square:number):void;
  step?:()=>void;
}

/** Test-only models. Native programs contain no host simulation callbacks. */
export function simulationSoftwareReference(id:string): BoardReference | undefined {
  if (!['life-lab','wireworld','langton-ant','sandpile','heat-grid','maze-route'].includes(id)) return;
  let cells=Array<string>(64).fill('.'), steps=0, status=0, position=36, direction=0;
  const ink=Array<boolean>(64).fill(false);
  if (id==='life-lab') for (const i of [27,28,29]) cells[i]='*';
  if (id==='wireworld') {cells[25]='t'; cells[26]='H'; for (const i of [27,28,29,30]) cells[i]='#';}
  if (id==='sandpile') {cells.fill('0'); cells[27]='4';}
  if (id==='heat-grid') {cells.fill('0'); for (const i of [27,28,35,36]) cells[i]='9';}
  if (id==='maze-route') {cells[0]='S'; cells[63]='G';}
  const antRender=()=>{cells=ink.map(v=>v?'#':'.'); cells[position]='^>v<'[direction]!;};
  if (id==='langton-ant') antRender();
  const neighbors=(i:number,diagonal=false)=>Array.from({length:64},(_,j)=>j).filter(j=>{
    const dr=Math.abs(Math.floor(i/8)-Math.floor(j/8)), dc=Math.abs(i%8-j%8);
    return diagonal ? Math.max(dr,dc)===1 : dr+dc===1;
  });
  return {
    get board(){return cells.join('');}, get moves(){return steps;}, get status(){return status;},
    play(square:number) {
      if (id==='life-lab') cells[square]=cells[square]==='.'?'*':'.';
      if (id==='wireworld') {const states='.#Ht';cells[square]=states[(states.indexOf(cells[square]!)+1)%4]!;}
      if (id==='langton-ant') {ink[square]=!ink[square];antRender();}
      if (id==='sandpile') cells[square]=String(Math.min(9,Number(cells[square])+1));
      if (id==='heat-grid') {const value=Number(cells[square])+3; cells[square]=String(value>9?0:value);}
      if (id==='maze-route' && square!==0 && square!==63) {
        cells=cells.map(c=>c==='*'?'.':c);cells[square]=cells[square]==='#'?'.':'#';status=0;
      }
    },
    step() {
      steps++;
      if (id==='life-lab') cells=cells.map((cell,i)=>{
        const n=neighbors(i,true).filter(j=>cells[j]==='*').length;
        return n===3 || (cell==='*' && n===2) ? '*' : '.';
      });
      if (id==='wireworld') cells=cells.map((cell,i)=>{
        if (cell==='H') return 't'; if (cell==='t') return '#'; if (cell!== '#') return cell;
        const heads=neighbors(i,true).filter(j=>cells[j]==='H').length;return heads===1||heads===2?'H':'#';
      });
      if (id==='langton-ant') {
        direction=(direction+(ink[position]?3:1))%4; ink[position]=!ink[position];
        let row=Math.floor(position/8),col=position%8;
        if (direction===0) row--; if (direction===1) col++; if (direction===2) row++; if (direction===3) col--;
        position=((row+8)%8)*8+(col+8)%8; antRender();
      }
      if (id==='sandpile') {
        const initial=cells.map(Number), next=[...initial];
        initial.forEach((value,i)=>{if(value>=4){next[i]!-=4;neighbors(i).forEach(j=>next[j]!++);}});cells=next.map(String);
      }
      if (id==='heat-grid') cells=cells.map((_,i)=>{const group=[i,...neighbors(i)];return String(Math.floor(group.reduce((sum,j)=>sum+Number(cells[j]),0)/group.length));});
      if (id==='maze-route') {
        cells=cells.map(c=>c==='*'?'.':c);
        const queue=[0], prev=new Map<number,number>([[0,-1]]);
        for (let head=0;head<queue.length;head++) {
          const i=queue[head]!; if(i===63) break;
          const row=Math.floor(i/8),col=i%8;
          for (const [r,c] of [[row-1,col],[row,col+1],[row+1,col],[row,col-1]]) {
            if(r!<0||r!>7||c!<0||c!>7) continue; const j=r!*8+c!;
            if(cells[j]==='#'||prev.has(j)) continue;prev.set(j,i);queue.push(j);
          }
        }
        status=prev.has(63)?1:-1;
        if(status===1) for(let i=prev.get(63)!;i!==0;i=prev.get(i)!) cells[i]='*';
      }
    },
  };
}
