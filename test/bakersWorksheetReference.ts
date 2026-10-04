export type CellResult={value:number;status:number};
const operand='(?:[+-]?\\d+|[A-Ca-c][1-4])';
const grammar=new RegExp(`^\\s*=?\\s*(${operand})(?:\\s*([+*/-])\\s*(${operand}))?\\s*$`);
export function worksheetReference(records:readonly string[]):CellResult[]{
 const memo=new Map<number,CellResult>(),active=new Set<number>();
 const indexOf=(s:string)=>(Number(s[1])-1)*3+s.toUpperCase().charCodeAt(0)-65;
 const edges=Array.from({length:12},(_,i)=>{const m=(records[i]??'').match(grammar);return m?[m[1],m[3]].filter((s):s is string=>!!s&&/^[a-c]/i.test(s)).map(indexOf):[];});
 const cyclic=(start:number)=>{const seen=new Set<number>();const pending=[...edges[start]!];while(pending.length){const i=pending.pop()!;if(i===start)return true;if(!seen.has(i)){seen.add(i);pending.push(...edges[i]!);}}return false;};
 const circular=Array.from({length:12},(_,i)=>cyclic(i));
 const cycles=Array.from({length:12},(_,start)=>{const seen=new Set<number>(),pending=[start];while(pending.length){const i=pending.pop()!;if(circular[i])return true;if(!seen.has(i)){seen.add(i);pending.push(...edges[i]!);}}return false;});
 const bad=(status:number):CellResult=>({value:0,status});
 const bounded=(n:bigint):CellResult=>n < -9841n || n>9841n?bad(4):{value:Number(n),status:1};
 const evaluate=(index:number):CellResult=>{
  if(memo.has(index))return memo.get(index)!;if(cycles[index]||active.has(index))return bad(5);active.add(index);
  const source=records[index]??'';const match=source.match(grammar);
  const term=(s:string):CellResult=>/^[a-c]/i.test(s)?evaluate((Number(s[1])-1)*3+s.toUpperCase().charCodeAt(0)-65):bounded(BigInt(s));
  let result:CellResult;
  if(!source.trim())result={value:0,status:1};else if(!match)result=bad(2);else{
   const a=term(match[1]!);
   if(a.status!==1)result=a;else if(!match[2])result=a;else{
    const b=term(match[3]!);if(b.status!==1)result=b;else{
     const av=BigInt(a.value),bv=BigInt(b.value);
     result=match[2]==='/'&&bv===0n?bad(3):bounded(match[2]==='+'?av+bv:match[2]==='-'?av-bv:match[2]==='*'?av*bv:av/bv);
    }
   }
  }active.delete(index);memo.set(index,result);return result;
 };
 return Array.from({length:12},(_,i)=>evaluate(i));
}
export function worksheetReport(results:readonly CellResult[]):string{
 return results.map((r,i)=>`${String.fromCharCode(65+i%3)}${Math.floor(i/3)+1}=${r.status===1?r.value:['','', 'SYNTAX','DIV/0','RANGE','CYCLE'][r.status]}`.padEnd(9)).join('');
}
export function worksheetVectors():string[][]{
 const single=(s:string)=>[s,...Array<string>(11).fill('')];
 const cases=['','   ','= ','=','+','-','1+','A0','D1','A5','(1)','1+2+3','1.5','a1x','-A1','1 / 0','9841','-9841','9842','-9842','000000000000000000000000000000000000000000000000000001','  = -7 / +2 ','9--2','+4 * -3','9841+1','-9841-1','9841- -1','-9841+1','9841*1','9841*-1','9841*2','-9841/ -1','999999999999999999999999999999999999999999999999999999'].map(single);
 for(const a of [-9841,-100,-1,0,1,99,100,9841])for(const b of [-9841,-100,-1,0,1,99,100,9841])for(const op of ['+','-','*','/'])cases.push(single(`${a}${op}${b}`));
 const address=(i:number)=>String.fromCharCode(65+i%3)+(Math.floor(i/3)+1);
 cases.push(Array.from({length:12},(_,i)=>i===11?'2':`=${address(i+1)}+1`));
 cases.push(Array.from({length:12},(_,i)=>`=${address((i+1)%12)}`));
 cases.push(['1/0','=A1+2','9','9841*2','=A2','bad','=C2','10','','','','']);
 let seed=213;
 const random=(limit:number)=>{seed=(seed*48271)%2147483647;return seed%limit;};
 for(let sheet=0;sheet<384;sheet++)cases.push(Array.from({length:12},()=>{
  if(random(3)===0)return String(random(201)-100);
  const term=()=>random(3)?address(random(12)):String(random(201)-100);
  return `=${term()}${['+','-','*','/'][random(4)]}${term()}`;
 }));
 return cases;
}
