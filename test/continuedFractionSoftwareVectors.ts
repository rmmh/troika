import type { TextSoftware } from '../src/world/software/native';
export function continuedFractionSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='fraction-cf') {
    for(const n of [...Array.from({length:25},(_,i)=>i-12),-99,99])for(const d of [...Array.from({length:25},(_,i)=>i-12),-99,99]) {
      const input=n+' '+d;if(d===0){cases.push({input,error:true});continue;}
      let a=d<0?-n:n,b=Math.abs(d);const coefficients:number[]=[];
      do {const q=Math.floor(a/b),r=a-q*b;coefficients.push(q);a=b;b=r;}while(b);
      cases.push({input,output:coefficients.join(' ')});
    }
    for(const input of ['', '1','1 2 3','100 1','1 -100','1 x'])cases.push({input,error:true});
  }
  if(app.id==='cf-convergents') {
    const evaluate=(terms:number[])=> {
      // Evaluate each prefix from its tail as a nested rational expression.
      let numerator=BigInt(terms.at(-1)!),denominator=1n;
      for(let i=terms.length-2;i>=0;i--)[numerator,denominator]=[BigInt(terms[i]!)*numerator+denominator,numerator];
      if(denominator<0n){numerator=-numerator;denominator=-denominator;}
      return [numerator,denominator] as const;
    };
    const add=(terms:number[])=> {
      const fractions=terms.map((_,i)=>evaluate(terms.slice(0,i+1)));
      const error=fractions.some(([n,d])=>n < -9841n||n>9841n||d>9841n);
      cases.push(error?{input:terms.join(' '),error:true}:{input:terms.join(' '),output:fractions.map(([n,d])=>n+'/'+d).join(' ')});
    };
    const walk=(xs:number[])=>{add(xs);if(xs.length<4)for(const n of [1,2,9,99])walk([...xs,n]);};
    for(const first of [-99,-9,-1,0,1,9,99])walk([first]);
    for(const first of [-99,-1,0,1,99])for(const tail of [1,2,9,99])add([first,...Array(8).fill(tail)]);
    for(const [numerator,denominator] of [[9841,101],[-9841,101],[9842,101],[-9842,101],[99,9841],[99,9842]]) {
      let n=numerator!,d=denominator!;const terms:number[]=[];
      while(d){const q=Math.floor(n/d);terms.push(q);[n,d]=[d,n-q*d];}
      add(terms);
    }
    for(const input of ['', '1 0','1 -1','0 0','1 100','100','1 x','1 1 1 1 1 1 1 1 1 1'])cases.push({input,error:true});
  }
  return cases;
}
