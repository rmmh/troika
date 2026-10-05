export interface ScheduleResult {start:number[];end:number[];latest:number[];status:number[];finish:number;error:boolean;}
export function supperReference(records:readonly string[]):ScheduleResult{
 const tasks=Array.from({length:12},(_,i)=>{const s=records[i]??'';if(!s)return null;const [name,duration,deps]=s.split('|');return{name,duration:Number(duration),deps:deps?deps.split(',').map(n=>Number(n)-1):[]};});
 const status:number[]=tasks.map(t=>t?0:-1);const start=Array<number>(12).fill(0),end=Array<number>(12).fill(0),active=new Set<number>();
 // Missing prerequisites take precedence, including through a cycle; repairing
 // the missing slot then exposes any remaining circular dependency.
 for(let start=0;start<12;start++){if(!tasks[start])continue;const seen=new Set<number>(),queue=[start];while(queue.length){const i=queue.pop()!;if(!tasks[i]){status[start]=2;break;}if(!seen.has(i)){seen.add(i);queue.push(...tasks[i]!.deps);}}}
 const visit=(i:number):number=>{if(status[i]!==0)return status[i]!;if(active.has(i))return 3;active.add(i);let result=1,time=0;for(const j of tasks[i]!.deps){const state=visit(j);if(state===-1||state===2)result=2;else if(state===3&&result!==2)result=3;if(state===1)time=Math.max(time,end[j]!);}active.delete(i);status[i]=result;if(result===1){start[i]=time;end[i]=time+tasks[i]!.duration;}return result;};
 for(let i=0;i<12;i++)visit(i);const finish=Math.max(...end),error=status.some(n=>n>=2),latest=tasks.map(t=>finish-(t?.duration??0));
 if(!error){const seen=new Set<number>();const backwards=(i:number):number=>{if(seen.has(i))return latest[i]!;const successors=tasks.map((t,j)=>t?.deps.includes(i)?j:-1).filter(j=>j>=0);latest[i]=Math.min(finish,...successors.map(j=>backwards(j)))-tasks[i]!.duration;seen.add(i);return latest[i]!;};tasks.forEach((t,i)=>{if(t)backwards(i);});}
 return{start,end,latest,status,finish,error};
}
export interface StockLot {item:string;quantity:number;expiry:number;}
export function consumeStock(lots:readonly (StockLot|null)[],day:number,item:string,quantity:number):(StockLot|null)[]|undefined{
 if(lots.reduce((n,l)=>n+(l&&l.item===item&&l.expiry>=day?l.quantity:0),0)<quantity)return;
 let remaining=quantity;return lots.map(l=>{if(!l)return null;const copy={...l};if(l.item===item&&l.expiry>=day){const amount=Math.min(remaining,l.quantity);remaining-=amount;copy.quantity-=amount;}return copy;});
}
