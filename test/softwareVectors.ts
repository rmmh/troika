import type { NativeSoftware } from '../src/world/software/native';

/** Mathematical reference vectors only; never used by guest applications. */
export function softwareVectors(app: NativeSoftware): NativeSoftware['examples'] {
  const cases = [...app.examples];
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
  return cases;
}
