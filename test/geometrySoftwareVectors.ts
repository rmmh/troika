import type { TextSoftware } from '../src/world/software/native';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const fraction=(n:number,d:number)=>{if(d<0){n=-n;d=-d;}const g=gcd(Math.abs(n),d);return d===g?String(n/g):`${n/g}/${d/g}`;};
const cross=(a:number[],b:number[],c:number[])=>(b[0]!-a[0]!)*(c[1]!-a[1]!)-(b[1]!-a[1]!)*(c[0]!-a[0]!);
export function geometrySoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['polygon-area','line-intersect','triangle-point','rect-overlap'].includes(app.id)) return [];
  const cases:TextSoftware['examples']=[];
  for(const n of app.id==='polygon-area'?[6,8]:[8]) {
    const lists=[Array(n).fill(0)];
    for(let mask=0;mask<2**n;mask++) lists.push(Array.from({length:n},(_,i)=>mask&(1<<i)?9:-9));
    for(let seed=0;seed<100;seed++) lists.push(Array.from({length:n},(_,i)=>(seed*37+i*i*13+Math.floor(seed/19)*i*7)%19-9));
    for(const a of lists) {
      const p=Array.from({length:n/2},(_,i)=>a.slice(i*2,i*2+2));
      const input=a.join(' ');let output='';
      if(app.id==='polygon-area') {
        let twice=0;for(let i=1;i+1<p.length;i++) twice+=cross(p[0]!,p[i]!,p[i+1]!);
        output=fraction(twice,2);
      } else if(app.id==='line-intersect') {
        const r=[a[2]!-a[0]!,a[3]!-a[1]!],s=[a[6]!-a[4]!,a[7]!-a[5]!];
        const den=r[0]!*s[1]!-r[1]!*s[0]!;
        if(!den){cases.push({input,error:true});continue;}
        const t=(a[4]!-a[0]!)*s[1]!-(a[5]!-a[1]!)*s[0]!;
        output=`x=${fraction(a[0]!*den+r[0]!*t,den)} y=${fraction(a[1]!*den+r[1]!*t,den)}`;
      } else if(app.id==='triangle-point') {
        const total=Math.abs(cross(p[0]!,p[1]!,p[2]!));
        if(!total){cases.push({input,error:true});continue;}
        const parts=[Math.abs(cross(p[3]!,p[0]!,p[1]!)),Math.abs(cross(p[3]!,p[1]!,p[2]!)),Math.abs(cross(p[3]!,p[2]!,p[0]!))];
        output=parts.reduce((x,y)=>x+y,0)!==total?'OUTSIDE':parts.includes(0)?'BOUNDARY':'INSIDE';
      } else {
        // Count covered unit squares, independently of the firmware's interval formula.
        let area=0;
        for(let x=-9;x<9;x++) for(let y=-9;y<9;y++) if([0,4].every(i=>x>=Math.min(a[i]!,a[i+2]!)&&x<Math.max(a[i]!,a[i+2]!)&&y>=Math.min(a[i+1]!,a[i+3]!)&&y<Math.max(a[i+1]!,a[i+3]!))) area++;
        output=String(area);
      }
      cases.push({input,output});
    }
  }
  for(let n=0;n<=9;n++) if(n!==8&&(app.id!=='polygon-area'||n!==6)) cases.push({input:Array(n).fill(0).join(' '),error:true});
  for(const value of ['10','-10','100','x','1.5']) cases.push({input:[value,...Array(7).fill(0)].join(' '),error:true});
  return cases;
}
