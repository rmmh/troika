import { numberExplorerVectors } from './numberExplorerVectors';
import type { NativeSoftware } from '../src/world/software/native';

/** Mathematical reference vectors only; never used by guest applications. */
export function softwareVectors(app: NativeSoftware): NativeSoftware['examples'] {
  const cases = [...app.examples,...numberExplorerVectors(app)];
  if (app.id === 'hamming') for (let n = 0; n < 16; n++) {
    const [a,b,c,d] = [0,1,2,3].map(i => (n >> i) & 1) as [number,number,number,number];
    cases.push({input:[n],output:[(a^b^d) | ((a^c^d)<<1) | (a<<2) | ((b^c^d)<<3) | (b<<4) | (c<<5) | (d<<6)]});
  }
  if (app.id === 'nim') for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
    const heaps = [a,b,c], xor = a^b^c, index = heaps.findIndex(heap => (heap^xor) < heap);
    cases.push({input:heaps,output: index < 0 ? [0,0,0] : [1,index+1,heaps[index]!-(heaps[index]!^xor)]});
  }
  if (app.id === 'choose') {
    let row = [1];
    for (let n = 0; n <= 12; n++) {
      row.forEach((value, k) => cases.push({input:[n,k],output:[value]}));
      row = [1,...row.slice(1).map((value, i) => value + row[i]!),1];
    }
  }
  if (app.id === 'recipe-scale') for (const n of [0,1,98,9841]) for (const from of [1,3,99]) for (const to of [1,2,99]) {
    const total = n * to, whole = Math.floor(total / from);
    cases.push(whole > 9841 ? {input:[n,from,to],error:true} : {input:[n,from,to],output:[whole,total%from,from]});
  }
  if (app.id === 'divmod') for (const a of [-9841,-7,-1,0,1,7,9841]) for (const b of [-9841,-3,-1,0,1,3,9841]) {
    cases.push(b === 0 ? {input:[a,b],error:true} : {input:[a,b],output:[Math.trunc(a/b)||0,a%b||0]});
  }
  if (app.id === 'crc8') for (const a of [0,1,127,128,255]) for (const b of [0,1,127,128,255]) for (const c of [0,1,127,128,255]) {
    let crc = 0;
    for (const byte of [a,b,c]) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 128 ? 7 : 0)) & 255;
    }
    cases.push({input:[a,b,c],output:[crc]});
  }
  if (app.id === 'mod-power') for (const a of [0,2,97,9841]) for (const e of [0,1,2,13,9841]) for (const m of [1,7,99]) {
    cases.push({input:[a,e,m],output:[Number(BigInt(a) ** BigInt(e) % BigInt(m))]});
  }
  if (app.id === 'mod-inverse') for (const a of [0,1,2,6,98,9841]) for (const m of [2,7,12,99]) {
    const x = Array.from({length:m-1},(_,i)=>i+1).find(x => a*x % m === 1);
    cases.push(x === undefined ? {input:[a,m],error:true} : {input:[a,m],output:[x]});
  }
  const gcd = (a: number, b: number): number => b ? gcd(b,a%b) : a;
  if (app.id === 'totient') for (const n of [2,3,4,6,12,30,49,64,99,243,729,9841]) {
    cases.push({input:[n],output:[Array.from({length:n},(_,i)=>i+1).filter(k=>gcd(k,n)===1).length]});
  }
  if (app.id === 'prime-sieve') for (const n of [1,3,4,9,27,81,243,729,998]) {
    const primes = Array.from({length:n},(_,i)=>i+1).filter(k => k >= 2 && !Array.from({length:Math.max(0,Math.floor(Math.sqrt(k))-1)},(_,i)=>i+2).some(d=>k%d===0));
    cases.push({input:[n],output:[primes.length,primes.at(-1) ?? 0]});
  }
  if (app.id === 'fibonacci') {
    let a = 0, b = 1;
    for (let n = 0; n <= 20; n++) {cases.push({input:[n],output:[a]}); [a,b] = [b,a+b];}
  }
  if (app.id === 'partitions') {
    const memo = new Map<string,number>();
    const partition = (n:number, max:number):number => {
      if (n===0) return 1;
      if (n<0 || max===0) return 0;
      const key = `${n},${max}`;
      if (!memo.has(key)) memo.set(key,partition(n,max-1)+partition(n-max,max));
      return memo.get(key)!;
    };
    for (let n=0;n<=30;n++) cases.push({input:[n],output:[partition(n,n)]});
  }
  if (app.id === 'catalan') {
    let value = 1;
    for (let n=0;n<=9;n++) {cases.push({input:[n],output:[value]}); value=value*2*(2*n+1)/(n+2);}
  }
  if (app.id === 'triangle') for (const a of [1,3,5,57]) for (const b of [1,3,5,57]) for (const c of [1,3,5,57]) {
    const [x,y,z] = [a,b,c].sort((a,b)=>a-b) as [number,number,number];
    cases.push(x+y<=z ? {input:[a,b,c],error:true} : {input:[a,b,c],output:[Math.sign(z*z-x*x-y*y),a+b+c]});
  }
  if (app.id === 'weekday') for (const year of [2000,2001,2024,2096,2099]) for (const month of [1,2,3,12]) for (const day of [1,29,31]) {
    const date = new Date(Date.UTC(year,month-1,day));
    cases.push(date.getUTCMonth()!==month-1 ? {input:[year,month,day],error:true} : {input:[year,month,day],output:[date.getUTCDay(),(date.getTime()-Date.UTC(year,0,1))/86400000+1]});
  }
  if (app.id === 'coin-change') for (const n of [1,6,17,99,243]) for (const a of [2,7,99]) for (const b of [3,9]) {
    // Breadth-first search in amount space, independent of the guest's recurrence.
    let frontier = new Set([0]), steps = 0; const seen = new Set([0]);
    while (!frontier.has(n)) {
      const next = new Set<number>();
      for (const value of frontier) for (const coin of [1,a,b]) if (value+coin <= n && !seen.has(value+coin)) {next.add(value+coin); seen.add(value+coin);}
      frontier = next; steps++;
    }
    cases.push({input:[n,a,b],output:[steps]});
  }
  if (app.id === 'hamming-decode') for (let data=0; data<16; data++) {
    const [a,b,c,d] = [0,1,2,3].map(i=>(data>>i)&1) as [number,number,number,number];
    const word = (a^b^d) | ((a^c^d)<<1) | (a<<2) | ((b^c^d)<<3) | (b<<4) | (c<<5) | (d<<6);
    for (let bit=0;bit<=7;bit++) cases.push({input:[bit ? word^(1<<(bit-1)) : word],output:[data,word,bit]});
  }
  if (app.id === 'luhn-digit') for (const n of [1,5,9,10,19,99,100,999,9841]) {
    const sum = [...String(n)].reverse().reduce((sum,digit,i)=>{
      const value = Number(digit)*(i%2===0 ? 2 : 1); return sum+Math.floor(value/10)+value%10;
    },0);
    cases.push({input:[n],output:[(10-sum%10)%10]});
  }
  const nearest = (n:number,d:number) => Math.floor(n/d)+(2*(n%d)>d ? 1 : 0);
  if (app.id === 'pulse-tone') for (const hz of [20,21,81,243,439,440,729,1999,2000]) for (const duty of [1,2,3,4]) {
    const period=nearest(19683,hz); cases.push({input:[hz,duty,8],output:[nearest(19683,period),period]});
  }
  if (app.id === 'interval-tone') for (const base of [20,220,440,1000]) for (const n of [1,3,9]) for (const d of [1,2,9]) {
    const second=nearest(base*n,d);
    cases.push(second<20||second>2000 ? {input:[base,n,d],error:true} : {input:[base,n,d],output:[base,second].map(hz=>nearest(19683,nearest(19683,hz)))});
  }
  if (app.id === 'wave-forge') for (const hz of [20,21,220,364,440,486,700]) for (const shape of [1,2,3]) {
    const step=nearest(729,hz); cases.push({input:[hz,shape,8],output:[nearest(19683,27*step),step]});
  }
  if (app.id === 'envelope-lab') for (const a of [0,1,13]) for (const d of [0,1,13]) for (const r of [0,1,13]) cases.push({input:[a,d,r],output:[729*a+27*d+r,437]});
  return cases;
}
