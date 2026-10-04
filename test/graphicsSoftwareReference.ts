import type { BoardReference } from './simulationSoftwareReference';

/** Test-only drawing models: geometry, sets, DFS and direct Manhattan distance. */
export function graphicsSoftwareReference(id:string):BoardReference|undefined {
  if(!['line-sketch','bucket-fill','mirror-tile','weave-draft','pixel-flipbook','ink-components','distance-field','ink-outline','triangle-paint'].includes(id)) return;
  let cells=Array<string>(64).fill('.'),moves=0,cursor=0,frame=0;
  const pending:number[]=[],prior:string[]=[];
  const frames=Array.from({length:3},()=>Array<string>(64).fill('.'));
  const warp=Array<number>(7).fill(1),weft=Array<number>(7).fill(0),lifts=Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2);
  const sources=new Set<number>();
  const toggle=(i:number)=>{cells[i]=cells[i]==='.'?'#':'.';};
  const neighbors=(i:number)=>Array.from({length:64},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/8)-Math.floor(j/8))+Math.abs(i%8-j%8)===1);
  const region=(start:number,match:string,paint:string)=>{
    const stack=[start];while(stack.length) {const i=stack.pop()!;if(cells[i]!==match) continue;cells[i]=paint;stack.push(...neighbors(i));}
  };
  const weave=()=>{cells=cells.map((_,i)=>i===0?'+':String(i<8?warp[i-1]:i%8===0?weft[Math.floor(i/8)-1]:lifts[i] ? weft[Math.floor(i/8)-1] : warp[i%8-1]));};
  if(id==='weave-draft') weave();
  return {
    get board(){return cells.join('');},get moves(){return moves;},get status(){return 0;},
    play(square:number) {
      cursor=square;
      if(id==='line-sketch' || id==='triangle-paint') {
        const count=id==='line-sketch'?2:3;
        if(pending.length<count-1) {pending.push(square);prior.push(cells[square]!);cells[square]='+';return;}
        for(let i=pending.length-1;i>=0;i--) cells[pending[i]!]=prior[i]!;
        const points=[...pending,square];pending.length=0;prior.length=0;
        if(id==='line-sketch') {
          const [a,b]=points as [number,number],dx=b%8-a%8,dy=Math.floor(b/8)-Math.floor(a/8),steps=Math.max(Math.abs(dx),Math.abs(dy));
          for(let i=0;i<=steps;i++) {
            const x=a%8+(steps?Math.sign(dx)*Math.floor(Math.abs(dx)*i/steps+.5):0);
            const y=Math.floor(a/8)+(steps?Math.sign(dy)*Math.floor(Math.abs(dy)*i/steps+.5):0);
            cells[y*8+x]='*';
          }
        } else {
          const cross=(a:number,b:number,p:number)=>(b%8-a%8)*(Math.floor(p/8)-Math.floor(a/8))-(Math.floor(b/8)-Math.floor(a/8))*(p%8-a%8);
          const [a,b,c]=points as [number,number,number];if(cross(a,b,c)===0) return;
          for(let i=0;i<64;i++) {const signs=[cross(a,b,i),cross(b,c,i),cross(c,a,i)];if(signs.every(s=>s>=0)||signs.every(s=>s<=0)) cells[i]='#';}
        }
        moves++;return;
      }
      if(id==='bucket-fill') {cells[square]=cells[square]==='#'?'.':'#';return;}
      if(id==='ink-components') {cells[square]=cells[square]==='.'?'#':'.';return;}
      if(id==='mirror-tile') {
        const row=Math.floor(square/8),col=square%8;
        for(const r of [row,7-row]) for(const c of [col,7-col]) toggle(r*8+c);moves++;return;
      }
      if(id==='weave-draft') {
        if(square===0) return;
        const r=Math.floor(square/8),c=square%8;
        if(!r) warp[c-1]=1-warp[c-1]!;else if(!c) weft[r-1]=1-weft[r-1]!;else lifts[square]=1-lifts[square]!;
        weave();moves++;return;
      }
      if(id==='pixel-flipbook') {toggle(square);frames[frame]=[...cells];moves++;return;}
      if(id==='distance-field') {if(sources.has(square)) sources.delete(square);else sources.add(square);cells=cells.map((_,i)=>sources.has(i)?'S':'.');return;}
      toggle(square);
    },
    step() {
      if(id==='bucket-fill') {
        if(cells[cursor]==='#') return;region(cursor,cells[cursor]!,cells[cursor]==='.'?'*':'.');moves++;
      } else if(id==='mirror-tile') {cells=cells.map((_,i)=>cells[(7-i%8)*8+Math.floor(i/8)]!);moves++;}
      else if(id==='pixel-flipbook') {frame=(frame+1)%3;cells=[...frames[frame]!];}
      else if(id==='ink-components') {
        cells=cells.map(c=>c==='.'?'.':'#');let next=0;
        for(let i=0;i<64;i++) if(cells[i]==='#') region(i,'#','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'[next++]!);
        moves++;
      } else if(id==='distance-field') {
        cells=cells.map((_,i)=>sources.has(i)?'S':sources.size?'0123456789ABCDE'[Math.min(...[...sources].map(s=>Math.abs(i%8-s%8)+Math.abs(Math.floor(i/8)-Math.floor(s/8))))]!:'.');moves++;
      } else if(id==='ink-outline') {cells=cells.map((c,i)=>c==='#'&&(neighbors(i).length<4||neighbors(i).some(j=>cells[j]==='.'))?'#':'.');moves++;}
    },
  };
}
