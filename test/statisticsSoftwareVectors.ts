import type { TextSoftware } from '../src/world/software/native';

/** Independent test models, with exact integer/rational expected output. */
export function statisticsSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['sample-summary','quartiles','frequency-table','exact-variance','linear-fit','differences','moving-average','rank-trend'].includes(app.id)) return [];
  const cases:TextSoftware['examples']=[];
  const gcd=(a:number,b:number):number=>b ? gcd(b,a%b) : a;
  const fraction=(n:number,d:number)=>{
    const factor=gcd(Math.abs(n),d); n/=factor;d/=factor;
    return d===1 ? String(n) : `${n}/${d}`;
  };
  const small=app.id==='exact-variance'||app.id==='linear-fit';
  const bound=small ? 9 : 99;
  const lists:number[][]=[];
  for(let n=1;n<=9;n++) {
    lists.push(Array(n).fill(0),Array(n).fill(bound),Array(n).fill(-bound),Array.from({length:n},(_,i)=>i%2 ? -bound : bound),Array.from({length:n},(_,i)=>i%2 ? bound : -bound));
    for(let seed=0;seed<5;seed++) lists.push(Array.from({length:n},(_,i)=>((i*i*13+seed*37+i*seed*19)%(2*bound+1))-bound));
  }
  if(app.id==='linear-fit') {
    // Extremal coefficient signs maximize the absolute intercept numerator.
    for(let split=1;split<9;split++) for(const sign of [-1,1]) lists.push(Array.from({length:9},(_,i)=>(i<split?9:-9)*sign));
  }
  const minimum=['linear-fit','differences','rank-trend'].includes(app.id) ? 2 : app.id==='moving-average' ? 3 : 1;
  for(const values of lists) {
    const input=values.join(' '),n=values.length;
    if(n<minimum) {cases.push({input,error:true});continue;}
    let output='';
    if(app.id==='sample-summary') {
      const sum=values.reduce((a,b)=>a+b,0);
      output=`n=${n} sum=${sum} min=${Math.min(...values)} max=${Math.max(...values)} mean=${fraction(sum,n)}`;
    } else if(app.id==='quartiles') {
      const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(n/2);
      const median=(xs:number[])=>xs.length%2 ? String(xs[Math.floor(xs.length/2)]) : fraction(xs[xs.length/2-1]!+xs[xs.length/2]!,2);
      output=`Q1=${median(n===1?sorted:sorted.slice(0,mid))} median=${median(sorted)} Q3=${median(n===1?sorted:sorted.slice(Math.ceil(n/2)))}`;
    } else if(app.id==='frequency-table') {
      const counts=new Map<number,number>();for(const v of values) counts.set(v,(counts.get(v)??0)+1);
      output=[...counts].sort(([a],[b])=>a-b).map(([v,count])=>`${v}:${count}`).join(' ');
    } else if(app.id==='exact-variance') {
      let squares=0;for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) squares+=(values[i]!-values[j]!)**2;
      output=`population=${fraction(squares,n*n)} sample=${n===1?'NA':fraction(squares,n*(n-1))}`;
    } else if(app.id==='linear-fit') {
      const numerator=6*values.reduce((sum,y,i)=>sum+(2*i-n+1)*y,0),denominator=n*(n*n-1);
      const sum=values.reduce((a,b)=>a+b,0);
      output=`slope=${fraction(numerator,denominator)} intercept=${fraction(2*sum*denominator-numerator*n*(n-1),2*n*denominator)}`;
    } else if(app.id==='differences') {
      const first=values.slice(1).map((v,i)=>v-values[i]!),second=first.slice(1).map((v,i)=>v-first[i]!);
      output=`d1=${first.join(' ')} d2=${second.length?second.join(' '):'NA'}`;
    } else if(app.id==='moving-average') {
      output=values.slice(2).map((v,i)=>fraction(values[i]!+values[i+1]!+v,3)).join(' ');
    } else {
      let score=0,ties=0;for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) {score+=Math.sign(values[j]!-values[i]!);if(values[j]===values[i]) ties++;}
      output=`score=${score} ties=${ties} tau-a=${fraction(score,n*(n-1)/2)}`;
    }
    cases.push({input,output});
  }
  for(const input of ['', ' ', '-', '+', '1 - 2','1+2','1,2','1.0','--1','1 100','-100','1 2 3 4 5 6 7 8 9 0']) cases.push({input,error:true});
  if(small) for(const input of ['-10 0','10 0','99 -99']) cases.push({input,error:true});
  // Whitespace/sign handling has the same mathematical result as the first
  // valid nonempty list, while exercising the native parser independently.
  const valid=cases.find(example=>example.output!==undefined)!;
  cases.push({...valid,input:'  '+valid.input.split(' ').map(v=>v[0]==='-'?v:'+'+v).join('  ')+' '});
  return cases;
}
