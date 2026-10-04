import type { BoardReference } from './simulationSoftwareReference';
export function imageToolsReference(id:string):BoardReference|undefined {
  if(!['voronoi-mosaic','ordered-dither','ink-gap-close'].includes(id))return;
  let cells=Array<string>(64).fill(id==='ordered-dither'?'0':'.'),values=Array<number>(64).fill(0),proof=false,moves=0;
  const gray=()=>{cells=values.map(String);};
  const seeds=()=>{cells=values.map(v=>v?'ABC'[v-1]!:'.');};
  return {
    get board(){return cells.join('');},get moves(){return moves;},get status(){return 0;},
    play(i:number) {
      if(id==='voronoi-mosaic'){values[i]=(values[i]!+1)%4;seeds();}
      else if(id==='ordered-dither'){values[i]=(values[i]!+1)%5;proof=false;gray();}
      else cells[i]=cells[i]==='.'?'#':'.';
    },
    step() {
      moves++;
      if(id==='voronoi-mosaic')cells=values.map((v,i)=>{
        if(v)return 'ABC'[v-1]!;
        const distances=values.flatMap((value,j)=>value?[{value,distance:Math.abs(i%8-j%8)+Math.abs(Math.floor(i/8)-Math.floor(j/8))}]:[]);
        if(!distances.length)return '.';
        const distance=Math.min(...distances.map(s=>s.distance)),colors=new Set(distances.filter(s=>s.distance===distance).map(s=>s.value));
        return colors.size>1?'+':'abc'[[...colors][0]!-1]!;
      });
      else if(id==='ordered-dither') {
        proof=!proof;
        cells=values.map((v,i)=>proof?(v>[0,2,3,1][(Math.floor(i/8)%2)*2+i%2]!? '#':'.'):String(v));
      } else {
        const dilation=new Set<number>();
        for(let i=0;i<64;i++)if(cells[i]==='#')for(let j=0;j<64;j++)if(Math.abs(i%8-j%8)<=1&&Math.abs(Math.floor(i/8)-Math.floor(j/8))<=1)dilation.add(j);
        cells=cells.map((_,i)=>i<8||i>=56||i%8===0||i%8===7?'.':[-9,-8,-7,-1,0,1,7,8,9].every(d=>dilation.has(i+d))?'#':'.');
      }
    },
  };
}
