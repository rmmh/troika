import type { TextSoftware } from '../src/world/software/native';

export function polynomialSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['poly-evaluate','poly-derivative','poly-integral','synthetic-divide'].includes(app.id)) return [];
  const cases:TextSoftware['examples']=[];
  const rooted=['poly-evaluate','synthetic-divide'].includes(app.id);
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const fraction=(a:number,b:number)=>{const d=gcd(Math.abs(a),b);return b===d?String(a/d):`${a/d}/${b/d}`;};
  for(let n=1;n<=(rooted?7:9);n++) {
    const bound=rooted?9:99;
    const lists=[Array(n).fill(0),Array(n).fill(bound),Array(n).fill(-bound),Array.from({length:n},(_,i)=>i%2?-bound:bound)];
    for(let seed=0;seed<4;seed++) lists.push(Array.from({length:n},(_,i)=>(seed*37+i*i*13+i*seed*19)%(bound*2+1)-bound));
    for(const a of lists) for(const r of rooted?[-3,-2,-1,0,1,2,3]:[0]) {
      const input=(rooted?[r,...a]:a).join(' ');let output='';
      const value=a.reduce((sum,c,i)=>sum+c*r**i,0);
      if(app.id==='poly-evaluate') output=String(value);
      else if(app.id==='poly-derivative') output=a.length===1?'0':a.slice(1).map((c,i)=>c*(i+1)).join(' ');
      else if(app.id==='poly-integral') output='0 '+a.map((c,i)=>fraction(c,i+1)).join(' ');
      else {
        const q=a.slice(1).map((_,j)=>a.reduce((sum,c,i)=>sum+(i>j?c*r**(i-j-1):0),0));
        output=`q=${q.length?q.join(' '):'0'} r=${value}`;
      }
      cases.push({input,output});
    }
  }
  for(const input of ['', ' ', '+', '-', '100', '-100', '1.5', '1,2', '1 2 3 4 5 6 7 8 9 0']) cases.push({input,error:true});
  if(rooted) for(const input of ['1','4 1','-4 1','0 10','0 -10','1 1 1 1 1 1 1 1 1']) cases.push({input,error:true});
  return cases;
}
