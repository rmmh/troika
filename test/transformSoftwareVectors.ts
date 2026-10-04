import type { TextSoftware } from '../src/world/software/native';
const walsh=(xs:number[])=>xs.map((_,k)=>xs.reduce((sum,x,j)=>sum+x*((k&j).toString(2).replaceAll('0','').length%2?-1:1),0));
const haar=(xs:number[]):number[]=>xs.length===1?xs:[...haar(Array.from({length:xs.length/2},(_,i)=>Math.floor((xs[2*i]!+xs[2*i+1]!)/2))),...Array.from({length:xs.length/2},(_,i)=>xs[2*i]!-xs[2*i+1]!)];
const unhaar=(xs:number[]):number[]=>{if(xs.length===1)return xs;const low=unhaar(xs.slice(0,xs.length/2));return low.flatMap((s,i)=>[s+Math.ceil(xs[xs.length/2+i]!/2),s-Math.floor(xs[xs.length/2+i]!/2)]);};
const choose=(n:number,k:number)=>{let result=1;for(let i=1;i<=k;i++)result=result*(n-i+1)/i;return Math.round(result);};
export function transformSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  const vector=(input:number[],output:number[])=>cases.push({input:input.join(' '),output:output.join(' ')});
  if(app.id==='convolution') {
    const sequences=[[-2],[0],[2],...[-2,0,2].flatMap(a=>[-2,0,2].map(b=>[a,b]))];
    const add=(a:number[],b:number[])=>{const coefficients=Array<number>(a.length+b.length-1).fill(0);a.forEach((x,i)=>b.forEach((y,j)=>{coefficients[i+j]!+=x*y;}));vector([a.length,...a,...b],coefficients);};
    for(const a of sequences)for(const b of sequences)add(a,b);
    for(let split=1;split<=7;split++)for(let mask=0;mask<16;mask++){const values=Array.from({length:8},(_,i)=>mask&(1<<(i%4))?9:-9);add(values.slice(0,split),values.slice(split));}
    for(const input of ['', '1 2','0 1 2','2 1 2','9 1 2','1 10 2','1 2 -10'])cases.push({input,error:true});
  }
  if(app.id==='walsh-transform'||app.id==='haar-lifting') {
    const samples:number[][]=[[0],[-49],[49],[-2,1],[1,-2],[0,0],[1,2,3,4]];
    for(let mask=0;mask<256;mask++)samples.push(Array.from({length:8},(_,i)=>mask&(1<<i)?49:-49));
    for(let code=0;code<81;code++){let n=code;samples.push(Array.from({length:4},()=>{const v=n%3-1;n=Math.floor(n/3);return v;}));}
    for(const values of samples) {
      if(app.id==='walsh-transform'){vector(values,walsh(values));if(values.length===8){const extremes=values.map(x=>Math.sign(x)*99);vector(extremes,walsh(extremes));}}
      else {const transformed=haar(values);vector([1,...values],transformed);vector([-1,...transformed],values);}
    }
    if(app.id==='haar-lifting')for(let mask=0;mask<256;mask++){const coefficients=Array.from({length:8},(_,i)=>mask&(1<<i)?99:-99);vector([-1,...coefficients],unhaar(coefficients));}
    const invalid=app.id==='walsh-transform'?['','1 2 3','1 2 3 4 5','1 2 3 4 5 6','1 2 3 4 5 6 7','1 2 3 4 5 6 7 8 9','100']:['','1','0 1','2 1','1 50','1 -50','-1 100','1 1 2 3','1 1 2 3 4 5','-1 1 2 3'];
    for(const input of invalid)cases.push({input,error:true});
  }
  if(app.id==='sequence-next') {
    const add=(values:number[])=>{const n=values.length,next=values.reduce((sum,value,i)=>sum+value*choose(n,i)*((n-1-i)%2?-1:1),0);let degree=0;
      for(let k=1;k<n;k++)if(values.slice(0,k+1).reduce((sum,value,i)=>sum+value*choose(k,i)*((k-i)%2?-1:1),0)!==0)degree=k;
      cases.push({input:values.join(' '),output:'next='+next+' degree='+degree});};
    for(let mask=0;mask<512;mask++)add(Array.from({length:9},(_,i)=>mask&(1<<i)?9:-9));
    for(let n=1;n<=9;n++){add(Array(n).fill(0));add(Array(n).fill(9));add(Array(n).fill(-9));}
    for(let code=0;code<81;code++){let n=code;add(Array.from({length:4},()=>{const value=n%3-1;n=Math.floor(n/3);return value;}));}
    for(const input of ['', '10','-10','1 x','1 1 1 1 1 1 1 1 1 1'])cases.push({input,error:true});
  }
  return cases;
}
