import type { TextSoftware } from '../src/world/software/native';
type Rational=[number,number];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const rat=(a:number,b=1):Rational=>{if(b<0){a=-a;b=-b;}const d=gcd(Math.abs(a),b);return [a/d,b/d];};
const add=(a:Rational,b:Rational)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const mul=(a:Rational,b:Rational)=>rat(a[0]*b[0],a[1]*b[1]);
const format=([a,b]:Rational)=>b===1?String(a):`${a}/${b}`;
/** Rational row reduction, independently checking native closed-form solutions. */
function reduce(input:number[][]):Rational[][]|null {
  const rows=input.map(row=>row.map(x=>rat(x)));
  for(let col=0;col<2;col++) {
    const pivot=rows.findIndex((row,i)=>i>=col&&row[col]![0]!==0);
    if(pivot<0) return null;
    [rows[col],rows[pivot]]=[rows[pivot]!,rows[col]!];
    const p=rows[col]![col]!;
    rows[col]=rows[col]!.map(x=>mul(x,rat(p[1],p[0])));
    for(let i=0;i<2;i++) if(i!==col) {
      const factor=rows[i]![col]!;
      rows[i]=rows[i]!.map((x,j)=>add(x,mul(rat(-factor[0],factor[1]),rows[col]![j]!)));
    }
  }
  return rows;
}
export function linearSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const lengths:Record<string,number>={'determinant3':9,'linear-solve2':6,'matrix-inverse2':4,'vector-products':6};
  const n=lengths[app.id];if(!n) return [];
  const cases:TextSoftware['examples']=[];
  const lists=[Array(n).fill(0),Array(n).fill(9),Array(n).fill(-9)];
  // Every corner of the permitted input range exercises signed product bounds.
  for(let mask=0;mask<2**n;mask++) lists.push(Array.from({length:n},(_,i)=>mask&(1<<i)?9:-9));
  for(let seed=0;seed<150;seed++) lists.push(Array.from({length:n},(_,i)=>(seed*37+i*i*13+i*seed*19+Math.floor(seed/19)*i*7)%19-9));
  const permutations=[[0,1,2],[1,2,0],[2,0,1],[0,2,1],[2,1,0],[1,0,2]];
  for(const a of lists) {
    const input=a.join(' ');let output='';
    if(app.id==='determinant3') output=String(permutations.reduce((sum,p,i)=>sum+(i<3?1:-1)*p.reduce((prod,col,row)=>prod*a[row*3+col]!,1),0));
    else if(app.id==='linear-solve2') {
      const rows=reduce([a.slice(0,3),a.slice(3,6)]);
      if(!rows){cases.push({input,error:true});continue;}
      output=`x=${format(rows[0]![2]!)} y=${format(rows[1]![2]!)}`;
    } else if(app.id==='matrix-inverse2') {
      const rows=reduce([[a[0]!,a[1]!,1,0],[a[2]!,a[3]!,0,1]]);
      if(!rows){cases.push({input,error:true});continue;}
      output=rows.flatMap(row=>row.slice(2)).map(format).join(' ');
    } else {
      const dot=a.slice(0,3).reduce((sum,v,i)=>sum+v*a[i+3]!,0),cross=[0,0,0];
      permutations.forEach(([i,j,k],p)=>{cross[i!]!+=(p<3?1:-1)*a[j!]!*a[k!+3]!;});
      output=`dot=${dot} cross=${cross.join(' ')}`;
    }
    cases.push({input,output});
  }
  for(let count=0;count<=9;count++) if(count!==n) cases.push({input:Array(count).fill(0).join(' '),error:true});
  for(const value of ['10','-10','100','x','1.5']) cases.push({input:[value,...Array(n-1).fill(0)].join(' '),error:true});
  return cases;
}
