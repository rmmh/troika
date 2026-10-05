import {expect,test} from 'vitest';
import {PERSONAL_WORKBENCH,EXPENSE_JOURNAL,TICKET_QUEUE,ROUTE_NOTEBOOK,RANKED_BALLOT_BOX} from '../src/world/software/personalWorkbench';
import {documentAppFixture} from './documentAppFixture';
import {TEXT_KEYS} from '../src/core/textKeyboard';
const command=(f:ReturnType<typeof documentAppFixture>,s:string)=>f.edit(f.m.peek(2613),s);
test('expense journal filters exact category totals and atomically rejects invalid records',()=>{
 const f=documentAppFixture(EXPENSE_JOURNAL);f.edit(0,'1|A|25');f.edit(1,'2|B|40');f.edit(2,'3|A|15');expect(f.report()).toContain('Tokens:80 Entries:3');expect(f.report()).toContain('A=40 B=40 C=0');command(f,':span 1 2');expect(f.report()).toContain('Tokens:65 Entries:2');
 for(const s of['1000|A|1','1|G|1','1|A|730','1|A|-1','1||2',':span 9 1',':span 0 1000']){command(f,s);expect(f.m.peek(2612),s).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(2)).toBe('3|A|15')}
 f.type('s');const cold=documentAppFixture(EXPENSE_JOURNAL,f.medium.image());expect(cold.report()).toContain('Tokens:80 Entries:3');expect(cold.report()).toContain('Span 0-999');
},60_000);
test('ticket queue dispatches by priority, duration, slot and excludes held/done',()=>{
 const f=documentAppFixture(TICKET_QUEUE);f.edit(0,'Paint|2|30|O');f.edit(1,'Repair|1|20|O');f.edit(2,'Wait parts|1|45|H');f.edit(3,'Quick|1|5|O');expect(f.report()).toContain('Open:3/55 Held:1/45');expect(f.report()).toContain('Next 04 Quick');expect(f.report()).toContain('Queue: 04 02 01');f.type('j');expect(f.m.peek(2613)).toBe(3);f.type('t');expect(f.record(3)).toBe('Quick|1|5|H');expect(f.report()).toContain('Next 02 Repair');f.type('t');expect(f.record(3)).toBe('Quick|1|5|D');f.type('t');expect(f.record(3)).toBe('Quick|1|5|O');
 for(const s of['Bad|0|1|O','Bad|1|0|O','Bad|1|100|O','Bad|1|3|X','ThirteenNames|1|1|O',':foo']){command(f,s);expect(f.m.peek(2612),s).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(3)).toBe('Quick|1|5|O')}
 f.type('s');const cold=documentAppFixture(TICKET_QUEUE,f.medium.image());expect(cold.report()).toContain('Next 04 Quick');
},60_000);
test('route notebook computes weighted directed shortest paths and unreachable/identity routes',()=>{
 const f=documentAppFixture(ROUTE_NOTEBOOK);['A|B|8','A|C|2','C|B|1','B|H|4','A|B|9'].forEach((s,i)=>f.edit(i,s));expect(f.report()).toContain('A->H cost=7');expect(f.report()).toContain('A->C->B->H');command(f,':route H A');expect(f.report()).toContain('H->A UNREACHABLE');command(f,':route D D');expect(f.report()).toContain('D->D cost=0');
 for(const s of['A|B|0','A|I|1','a|B|1','A|B|100',':route A I',':route AA H']){command(f,s);expect(f.m.peek(2612),s).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(4)).toBe('A|B|9')}
 f.type('s');const cold=documentAppFixture(ROUTE_NOTEBOOK,f.medium.image());expect(cold.report()).toContain('A->H cost=7');expect(cold.report()).toContain('A->C->B->H');
},60_000);
test('ranked ballots transfer votes, exhaust subsets and handle complete ties',()=>{
 const f=documentAppFixture(RANKED_BALLOT_BOX);expect(f.report()).toContain('NO BALLOTS');['Ari|AB','Bo|BA','Cy|CB','Dee|BC'].forEach((s,i)=>f.edit(i,s));expect(f.report()).toContain('Round 1 Live:4 Drop:0');expect(f.report()).toContain('Eliminate C');f.type('n');expect(f.report()).toContain('Winner B');f.type('p');expect(f.report()).toContain('Eliminate C');
 for(const s of['Ari|AA','Ari|G','Ari|','|ABC','Ari|ABCDEFG']){command(f,s);expect(f.m.peek(2612),s).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(3)).toBe('Dee|BC')}
 f.edit(2,'');f.edit(3,'');expect(f.report()).toContain('TIE: all remaining equal');f.type('s');const cold=documentAppFixture(RANKED_BALLOT_BOX,f.medium.image());expect(cold.report()).toContain('TIE: all remaining equal');
},60_000);

import {expenseReference,ticketReference,routeReference,ballotReference} from './personalWorkbenchReference';
let seed=283;const rand=(n:number)=>{seed=seed*48271%2147483647;return seed%n};
for(const app of [EXPENSE_JOURNAL,TICKET_QUEUE])test(`${app.id} report agrees with independent record arithmetic over edits`,()=>{
 const f=documentAppFixture(app);for(let epoch=0;epoch<18;epoch++){const records=Array.from({length:12},(_,i)=>app===EXPENSE_JOURNAL?`${rand(1000)}|${String.fromCharCode(65+rand(6))}|${rand(730)}`:`Task${i}|${1+rand(9)}|${1+rand(99)}|${'OHD'[rand(3)]}`);records.forEach((r,i)=>f.edit(i,r));if(app===EXPENSE_JOURNAL){const lo=rand(400),hi=600+rand(400);command(f,`:span ${lo} ${hi}`);const e=expenseReference(records,lo,hi);expect(f.m.peek(3851)).toBe(e.total);expect(f.m.peek(3852)).toBe(e.count);expect(Array.from({length:6},(_,i)=>f.m.peek(4700+i))).toEqual(e.categories)}else{const e=ticketReference(records);expect(f.m.peek(3851)).toBe(e.open.length);expect(f.m.peek(3852)).toBe(e.openMinutes);expect(f.m.peek(3853)).toBe(e.held.length);expect(f.m.peek(3854)).toBe(e.heldMinutes);expect(Array.from({length:e.open.length},(_,i)=>f.m.peek(4760+i))).toEqual(e.open)}expect(f.m.peek(2616)).toBeLessThanOrEqual(108)}
},60_000);
test('weighted route distances agree with Bellman-Ford including cycles, duplicates and ties',()=>{
 const f=documentAppFixture(ROUTE_NOTEBOOK);for(let epoch=0;epoch<24;epoch++){const records=Array.from({length:12},()=>`${String.fromCharCode(65+rand(8))}|${String.fromCharCode(65+rand(8))}|${1+rand(99)}`);records.forEach((r,i)=>f.edit(i,r));const source=rand(8);command(f,`:route ${String.fromCharCode(65+source)} ${String.fromCharCode(65+rand(8))}`);expect(Array.from({length:8},(_,i)=>f.m.peek(4700+i))).toEqual(routeReference(records,source).map(n=>Number.isFinite(n)?n:9841))}
 const edges=['A|C|1','A|B|1','C|H|1','B|H|1','A|B|8'];for(let i=0;i<12;i++)f.edit(i,edges[i]??'');command(f,':route A H');expect(f.report()).toContain('A->B->H');
},60_000);
test('ranked ballot native rounds match an independent elimination model',()=>{
 const f=documentAppFixture(RANKED_BALLOT_BOX);for(let epoch=0;epoch<30;epoch++){const records=Array.from({length:12},(_,i)=>{const letters=['A','B','C','D','E','F'];for(let j=letters.length-1;j>0;j--){const k=rand(j+1);[letters[j],letters[k]]=[letters[k]!,letters[j]!]}return rand(5)?`V${i}|${letters.slice(0,1+rand(6)).join('')}`:''});records.forEach((r,i)=>f.edit(i,r));const rounds=ballotReference(records);expect(f.m.peek(3809)).toBe(rounds.length-1);rounds.forEach((r,i)=>{const base=4800+i*16;expect(Array.from({length:6},(_,j)=>f.m.peek(base+j))).toEqual(r.counts);expect([6,7,8,9,10,11].map(j=>f.m.peek(base+j))).toEqual([r.live,r.drop,r.eliminate,r.winner,r.status,r.active])})}
 // A subset exhausts after C leaves; the remaining A/B complete tie must terminate.
 ['V0|A','V1|A','V2|B','V3|B','V4|C'].forEach((r,i)=>f.edit(i,r));for(let i=5;i<12;i++)f.edit(i,'');f.type('n');expect(f.report()).toContain('Live:4 Drop:1');expect(f.report()).toContain('TIE: all remaining equal');
},60_000);
test('all workbench notebooks guard memory, preserve saves, confirm reload/exit and delete records',()=>{
 for(const app of PERSONAL_WORKBENCH){const f=documentAppFixture(app),records=app.examples[0]!.records;records.forEach((r,i)=>f.edit(i,r));const guards=[2999,3660,3831,3848,3858,4009,4699,4712,4732,4759,4772,4799,4896,5225];guards.forEach(a=>f.m.poke(a,728));f.type('s');expect(f.screen()).toContain('Saved to disk');const saved=f.medium.image();f.edit(0,'');expect(f.record(0)).toBe('');f.type('l');expect(f.m.peek(2612)).toBe(3);f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('');f.type('l');f.type('d');expect(f.record(0)).toBe(records[0]);f.edit(0,'');f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);guards.forEach(a=>expect(f.m.peek(a),`${app.id} guard${a}`).toBe(728));const cold=documentAppFixture(app,saved);records.forEach((r,i)=>expect(cold.record(i)).toBe(r));cold.keyboard.queueTrytes([TEXT_KEYS.home]);cold.m.run(200_000);expect(cold.m.peek(2504)).toBe(11);expect(f.m.stackHighWater).toBeLessThan(243)}
},60_000);

test('maximum workloads and full weighted paths remain exact and visible',()=>{
 const expense=documentAppFixture(EXPENSE_JOURNAL);for(let i=0;i<12;i++)expense.edit(i,'999|F|729');expect(expense.report()).toContain('Tokens:8748 Entries:12');expect(expense.report()).toContain('F=8748');command(expense,':span 999 999');expect(expense.report().length).toBeLessThanOrEqual(108);expect(expense.report()).toContain('Span 999-999 H:help ?:span');
 const ticket=documentAppFixture(TICKET_QUEUE);for(let i=0;i<12;i++)ticket.edit(i,`Long name ${i}|9|99|O`);expect(ticket.report()).toContain('Open:12/1188 Held:0/0');expect(ticket.report()).toContain('Queue: 07 08 09 10 11 12');
 const route=documentAppFixture(ROUTE_NOTEBOOK);for(let i=0;i<7;i++)route.edit(i,`${String.fromCharCode(65+i)}|${String.fromCharCode(66+i)}|99`);expect(route.report()).toContain('A->H cost=693');expect(route.report()).toContain('A->B->C->D->E->F->G->H');
 const ballot=documentAppFixture(RANKED_BALLOT_BOX);for(let i=0;i<12;i++)ballot.edit(i,`Voter ${i}|ABCDEF`);expect(ballot.report()).toContain('Round 1 Live:12 Drop:0');expect(ballot.report()).toContain('A=12');expect(ballot.report()).toContain('Winner A');
},60_000);
