import {expect,test} from 'vitest';
import {KITCHEN_PLANNING} from '../src/world/software/kitchenPlanning';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {documentAppFixture} from './documentAppFixture';
import {consumeStock,supperReference,type StockLot} from './kitchenPlanningReference';
const scheduler=KITCHEN_PLANNING[0]!,inventory=KITCHEN_PLANNING[1]!;
const command=(f:ReturnType<typeof documentAppFixture>,s:string)=>f.edit(f.m.peek(2613),s);
test('supper native keyboard computes timings, slack, diagnostics and persisted dependency repairs',()=>{
 const f=documentAppFixture(scheduler);expect(f.core.image.reserved+f.built.image.reserved).toBeLessThanOrEqual(9666);
 expect(f.report()).toContain('Finish all: 52 min');expect(f.report()).toContain('CRITICAL');f.select(1);expect(f.report()).toContain('Slack 25 min');
 f.edit(0,'Soak|40|');expect(f.report()).toContain('Finish all: 62 min');f.select(2);expect(f.report()).toContain('Start 40; finish 60');
 f.edit(0,'Soak|40|4');expect(f.report()).toContain('CYCLE');f.edit(0,'');f.select(2);expect(f.report()).toContain('MISSING');f.edit(0,'Soak|30|');expect(f.report()).toContain('Finish all: 52 min');
 for(const bad of ['|2|','Task|100|','Task|-1|','Task|2|0','Task|2|13','Task|2|1,','Task|2|1 2','Task|2','Task|2||','SeventeenLettersX|2|']){f.edit(0,bad);expect(f.m.peek(2612),bad).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('Soak|30|');}
 f.type('h');expect(f.screen()).toContain('NAME|MINUTES|DEPS');f.type('s');const cold=documentAppFixture(scheduler,f.medium.image());expect(cold.record(2)).toBe('Cook|20|1,2');expect(cold.report()).toContain('Finish all: 52 min');
},60_000);
test('supper model agrees for chains, disconnected tasks, duplicate edges and random dependency graphs',()=>{
 const f=documentAppFixture(scheduler);let seed=224;const rand=(n:number)=>{seed=seed*48271%2147483647;return seed%n;};
 const vectors=[Array.from({length:12},(_,i)=>`T${i}|99|${i===11?'':i+2}`),Array.from({length:12},(_,i)=>`T${i}|0|${(i+1)%12+1}`),['A|4|','B|9|','C|5|1,1','D|2|2,3']];
 for(let n=0;n<48;n++)vectors.push(Array.from({length:12},(_,i)=>rand(5)===0?'':`T${i}|${rand(100)}|${Array.from({length:rand(4)},()=>1+rand(12)).join(',')}`));
 for(let n=0;n<32;n++)vectors.push(Array.from({length:12},(_,i)=>{const candidates=Array.from({length:12},(_,j)=>j).filter(j=>n%2?j<i:j>i);return `T${i}|${rand(100)}|${candidates.length?Array.from({length:rand(4)},()=>1+candidates[rand(candidates.length)]!).join(','):''}`;}));
 for(const records of vectors){for(let i=0;i<12;i++){const s=records[i]??'',base=3000+i*55;f.m.poke(base,s.length);for(let j=0;j<54;j++)f.m.poke(base+1+j,j<s.length?s.charCodeAt(j):0);}f.key(TEXT_KEYS.next);const e=supperReference(records);expect(Array.from({length:12},(_,i)=>f.m.peek(3844+i))).toEqual(e.status);expect(Array.from({length:12},(_,i)=>f.m.peek(3820+i))).toEqual(e.start);expect(Array.from({length:12},(_,i)=>f.m.peek(3832+i))).toEqual(e.end);expect(f.m.peek(3987)).toBe(e.finish);if(!e.error)expect(Array.from({length:12},(_,i)=>f.m.peek(3856+i))).toEqual(e.latest);}
},120_000);
test('inventory consumes across FIFO lots atomically, excludes expiry, and persists the clock',()=>{
 const f=documentAppFixture(inventory);expect(f.core.image.reserved+f.built.image.reserved).toBeLessThanOrEqual(9666);expect(f.report()).toContain('Day 0; usable 27');
 command(f,':use lentil 10');expect(f.record(0)).toBe('lentil|0|4');expect(f.record(1)).toBe('lentil|5|8');
 const before=Array.from({length:12},(_,i)=>f.record(i));command(f,':use lentil 6');expect(f.m.peek(2612)).toBe(1);expect(Array.from({length:12},(_,i)=>f.record(i))).toEqual(before);f.key(TEXT_KEYS.home);
 command(f,':day 9');expect(f.report()).toContain('Day 9; usable 12');expect(f.report()).toContain('Expired lots 1');command(f,':use lentil 1');expect(f.m.peek(2612)).toBe(1);f.key(TEXT_KEYS.home);
 command(f,':day 8');command(f,':use lentil 5');expect(f.record(1)).toBe('lentil|0|8');expect(f.record(11)).toBe('DAY|8');
 for(const bad of ['Lentil|3|5','lentil|730|5','lentil|3|1000','lentil|3|-1','lentil|3|','lentil|3|4|5',':day 1000',':use lentil 0',':use lentil 8020',':use lentil -1',':use lentil 999999999999999',':day 99999']){command(f,bad);expect(f.m.peek(2612),bad).toBe(1);f.key(TEXT_KEYS.home);}
 f.type('s');const cold=documentAppFixture(inventory,f.medium.image());expect(cold.record(11)).toBe('DAY|8');expect(cold.report()).toContain('Day 8; usable 12');expect(cold.record(0)).toBe('lentil|0|4');
},60_000);
test('inventory independent allocation model covers expiry ties, maximum totals and repeated commands',()=>{
 const f=documentAppFixture(inventory);let lots:(StockLot|null)[]=Array.from({length:11},(_,i)=>({item:i%3?'lentil':'pickle',quantity:729,expiry:i%4}));for(let i=0;i<11;i++){const l=lots[i]!;f.edit(i,`${l.item}|${l.quantity}|${l.expiry}`);}
 expect(f.report()).toContain('usable 8019');for(let n=0;n<64;n++){const day=n%5,item=n%3?'lentil':'pickle',quantity=1+(n*137)%1800;command(f,`:day ${day}`);const expected=consumeStock(lots,day,item,quantity),before=Array.from({length:12},(_,i)=>f.record(i));command(f,`:use ${item} ${quantity}`);if(!expected){expect(f.m.peek(2612)).toBe(1);f.key(TEXT_KEYS.home);expect(Array.from({length:12},(_,i)=>f.record(i))).toEqual(before);}else lots=expected;for(let i=0;i<11;i++){const l=lots[i]!;expect(f.record(i)).toBe(`${l.item}|${l.quantity}|${l.expiry}`);}const usable=lots.reduce((n,l)=>n+(l&&l.expiry>=day?l.quantity:0),0);expect(f.m.peek(3961)).toBe(usable);}
 for(let i=0;i<11;i++)f.edit(i,'rice|729|999');command(f,':day 999');command(f,':use rice 8019');for(let i=0;i<11;i++)expect(f.record(i)).toBe('rice|0|999');expect(f.m.peek(3961)).toBe(0);
},120_000);

test('kitchen applications protect adjacent arenas and confirm unsaved exit',()=>{
 for(const app of KITCHEN_PLANNING){const f=documentAppFixture(app);const guards=[2999,3660,4009,4699,4844,4899,4912,4949,5005,5225];for(const n of guards)f.m.poke(n,728);
 if(app===scheduler){f.edit(11,'Max|99|1,2,3,4,5,6,7,8,9,10,11');f.edit(0,'Milestone|0|');}
 else{f.edit(10,'abcdefghijkl|729|999');command(f,':use abcdefghijkl 728');command(f,':day 999');expect(f.record(10)).toBe('abcdefghijkl|1|999');}
 f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);f.type('s');for(const n of guards)expect(f.m.peek(n),app.id+' guard '+n).toBe(728);f.keyboard.queueTrytes([TEXT_KEYS.home]);f.m.run(200_000);expect(f.m.peek(2504)).toBe(11);expect(f.m.stackHighWater).toBeLessThan(243);
 }
},60_000);
