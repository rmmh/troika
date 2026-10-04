import type { TextSoftware } from '../src/world/software/native';
const gcd=(a:bigint,b:bigint):bigint=>b?gcd(b,a%b):a;
function decimal(n:number,d:number):string {
  const negative=n*d<0;n=Math.abs(n);d=Math.abs(d);
  let output=(negative?'-':'')+Math.floor(n/d);n%=d;
  if(!n)return output;
  output+='.';const seen=new Map<number,number>();let digits='';
  while(n&&!seen.has(n)){seen.set(n,digits.length);n*=10;digits+=Math.floor(n/d);n%=d;}
  return output+(n?digits.slice(0,seen.get(n))+'('+digits.slice(seen.get(n))+')':digits);
}
function egyptian(n:bigint,d:bigint):string|undefined {
  const parts:string[]=[];
  if(n>=d)parts.push(String(n/d));n%=d;
  while(n) {
    const unit=(d+n-1n)/n;parts.push('1/'+unit);
    n=n*unit-d;d*=unit;const common=gcd(n,d);n/=common;d/=common;
    if(d>9841n)return undefined;
  }
  return parts.join(' + ')||'0';
}
export function rationalFormVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id!=='decimal-cycle'&&app.id!=='egyptian-sum')return cases;
  const add=(n:number,d:number)=>{
    const input=`${n} ${d}`;
    const output=app.id==='decimal-cycle'?decimal(n,d):egyptian(BigInt(n),BigInt(d));
    cases.push(output===undefined?{input,error:true}:{input,output});
  };
  for(let d=1;d<=32;d++)for(let n=0;n<=d;n++)add(n,d);
  for(let d=33;d<=99;d++)for(const n of [1,d-1,99])add(n,d);
  let seed=2468;for(let i=0;i<192;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed%100;seed=(Math.imul(seed,1664525)+1013904223)>>>0;add(n,1+seed%99);}
  if(app.id==='decimal-cycle')for(const n of [0,1,22,98,99])for(const d of [1,3,6,7,11,17,27,81,97,99]){add(-n,d);add(n,-d);add(-n,-d);}
  else for(const input of ['-1 3','1 -3','0 -1'])cases.push({input,error:true});
  for(const input of ['', '1','1 0','1 2 3','100 1','1 100','1.0 3','1/3'])cases.push({input,error:true});
  return cases;
}
