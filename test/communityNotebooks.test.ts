import {expect,test} from 'vitest';
import {COMMUNITY_NOTEBOOKS} from '../src/world/software/communityNotebooks';
import {documentAppFixture} from './documentAppFixture';
test('six saved native notebook starters boot and report',()=>{for(const app of COMMUNITY_NOTEBOOKS){const f=documentAppFixture(app);expect(f.record(0)).toBe(app.examples[0]!.records[0]);expect(f.m.peek(2616)).toBeLessThanOrEqual(108);console.log(app.id,f.built.image.reserved,f.report());}},60_000);
import {STUDY_DECK,DECISION_MATRIX,SETLIST_FLOW,SHARED_TAB,STATEMENT_MATCHER,ADDRESS_CIRCLE} from '../src/world/software/communityNotebooks';
import {studyGrade,matrixReference,setlistReference,sharedTabReference,statementReference,addressReference} from './communityNotebooksReference';
import {TEXT_KEYS} from '../src/core/textKeyboard';
const records=(f:ReturnType<typeof documentAppFixture>)=>Array.from({length:12},(_,i)=>f.record(i));
// Differential corpus seeds valid documents directly; native H revalidates/recomputes.
// Editing, mutation and persistence use the real keyboard in separate scenarios.
const fill=(f:ReturnType<typeof documentAppFixture>,rows:string[])=>{for(let i=0;i<12;i++){const row=rows[i]??'';f.m.poke(3000+i*55,row.length);for(let j=0;j<54;j++)f.m.poke(3001+i*55+j,j<row.length?row.charCodeAt(j):0);}f.type('h');};
const command=(f:ReturnType<typeof documentAppFixture>,s:string,valid=true)=>{f.key(TEXT_KEYS.activate);f.keyboard.queueTrytes(Array(54).fill(TEXT_KEYS.backspace));f.type(s);f.key(TEXT_KEYS.activate);expect(f.m.peek(2612),s).toBe(valid?0:1);};
let seed=331;const random=(n:number)=>{seed=seed*48271%2147483647;return seed%n};
test('study deck keeps answers private, requires reveal and schedules all boxes with bounded saved dates',()=>{
 const f=documentAppFixture(STUDY_DECK);expect(f.screen()).not.toContain('packets');f.type('g');expect(f.record(0)).toBe('NIC sends?|packets|0|001');expect(f.screen()).toContain('Press R before grading');f.type('r');expect(f.screen()).toContain('A: packets');f.type('g');expect(f.record(0)).toBe('NIC sends?|packets|1|003');expect(f.screen()).not.toContain('packets');f.type('j');expect(f.m.peek(2613)).toBe(2);f.key(TEXT_KEYS.activate);expect(f.screen()).toContain('243');f.key(TEXT_KEYS.home);f.select(0);f.type('r');f.edit(0,'New question?|NEWSECRET|0|001');expect(f.screen()).not.toContain('NEWSECRET');f.type('g');expect(f.record(0)).toBe('New question?|NEWSECRET|0|001');
 for(const day of[0,1,998,999])for(let box=0;box<6;box++)for(const good of[false,true]){f.edit(0,`Question?|SECRET|${box}|000`);f.m.poke(3808,day);f.type('r');f.type(good?'g':'a');const e=studyGrade(box,day,good);expect(f.record(0)).toBe(`Question?|SECRET|${e.box}|${String(e.due).padStart(3,'0')}`);expect(f.screen()).not.toContain('SECRET');}
 command(f,':day 999');f.type('n');expect(f.m.peek(3808)).toBe(999);f.m.poke(3808,0);f.type('p');expect(f.m.peek(3808)).toBe(0);
},60_000);
test('decision matrix weighted ranking and Pareto comparisons agree with independent arrays',()=>{
 const f=documentAppFixture(DECISION_MATRIX);for(let epoch=0;epoch<12;epoch++){const rows=Array.from({length:12},(_,i)=>i%5===epoch%5?'':`Choice${i}|${random(10)}|${random(10)}|${random(10)}`);fill(f,rows);const w=[1+random(9),1+random(9),1+random(9)];command(f,':weights '+w.join(''));for(let selected=0;selected<12;selected++){f.select(selected);const e=matrixReference(rows,w,selected);expect(f.m.peek(3870)).toBe(e.scores[selected]);expect(f.m.peek(3871)).toBe(e.rank);expect(Array.from({length:f.m.peek(3872)},(_,i)=>f.m.peek(4820+i))).toEqual(e.dominators);expect(f.m.peek(2616)).toBeLessThanOrEqual(108);}}
 fill(f,Array.from({length:12},(_,i)=>i?'Better|9|9|9':'Worse|0|0|0'));f.select(0);expect(f.m.peek(3872)).toBe(11);expect(f.report()).toContain('12');
},60_000);
test('setlist tries every insertion and preserves other order and blank slots',()=>{
 const f=documentAppFixture(SETLIST_FLOW);for(let count=2;count<=9;count++){const rows=Array(12).fill('')as string[];const slots=Array.from({length:count},(_,i)=>count<=6?i*2:i);slots.forEach(i=>rows[i]=`Tune${i}|${1+random(600)}|${random(12)}`);for(const selected of slots){fill(f,rows);f.select(selected);const e=setlistReference(rows,selected);expect([3870,3871,3872].map(a=>f.m.peek(a))).toEqual([e.total,e.cost,e.start]);f.type('o');expect(records(f)).toEqual(e.reordered);expect(f.m.peek(2613)).toBe(e.bestSlot);expect(f.m.peek(3871)).toBeLessThanOrEqual(e.cost);}}
 fill(f,Array(12).fill('Tune|600|11'));expect(f.report()).toContain('125:30');
},60_000);
test('shared tabs conserve every token and settle deterministic debts with sparse names',()=>{
 const f=documentAppFixture(SHARED_TAB);for(let count=1;count<=12;count++)for(let epoch=0;epoch<3;epoch++){const rows=Array.from({length:12},(_,i)=>i<count?`Guest${i}|${epoch===0?0:epoch===1?729:random(730)}`:'');fill(f,rows);const e=sharedTabReference(rows);expect(f.m.peek(3870)).toBe(e.total);expect(Array.from({length:12},(_,i)=>f.m.peek(4800+i))).toEqual(e.net);expect(Array.from({length:f.m.peek(3874)},(_,i)=>[f.m.peek(4840+i),f.m.peek(4860+i),f.m.peek(4880+i)])).toEqual(e.steps);expect(e.net.reduce((a,b)=>a+b,0)).toBe(0);expect(f.m.peek(3874)).toBeLessThanOrEqual(11);for(const step of e.steps){expect(step[2]).toBeGreaterThan(0);f.type('n');}expect(f.m.peek(2616)).toBeLessThanOrEqual(108);}
 fill(f,['A|5','','B|0','','C|0']);expect(f.m.peek(3874)).toBe(2);
},60_000);
test('statement matcher uses signed amounts, nearest day, stable ties and single-use partners',()=>{
 const f=documentAppFixture(STATEMENT_MATCHER);for(let epoch=0;epoch<20;epoch++){const rows=Array.from({length:12},(_,i)=>`Line${i}|${random(40)}|${random(5)-2}|${random(2)?'B':'S'}`);fill(f,rows);for(const window of[0,2,30]){f.m.poke(3808,window);f.type('h');const e=statementReference(rows,window);expect(Array.from({length:12},(_,i)=>f.m.peek(4800+i))).toEqual(e.partners);expect([3870,3871,3872,3873,3874].map(a=>f.m.peek(a))).toEqual([e.pairs,e.book.length,e.statement.length,e.book.reduce((a,b)=>a+b,0),e.statement.reduce((a,b)=>a+b,0)]);}}
 fill(f,['B|10|-20|B','Late|12|-20|S','Early|8|-20|S']);f.m.poke(3808,2);f.type('h');expect(f.m.peek(4800)).toBe(1);f.type('p');expect(f.m.peek(4800)).toBe(-1);
},60_000);
test('address handles normalize and cluster natively, combined prefix/group filters navigate actual matches',()=>{
 const f=documentAppFixture(ADDRESS_CIRCLE);const rows=['A|AB.cd|A','B|ab.CD|B','C|a.b|A','D|Other|C','','E|AB.cd|F'];fill(f,rows);for(const prefix of['','a','AB','a.','missing'])for(const group of['','A','B','F']){command(f,':all');if(prefix)command(f,':find '+prefix);if(group)command(f,':group '+group);for(let selected=0;selected<rows.length;selected++){f.select(selected);const e=addressReference(rows,selected,prefix,group);expect(Array.from({length:f.m.peek(3870)},(_,i)=>f.m.peek(4820+i))).toEqual(e.matches);expect(f.m.peek(3871),JSON.stringify({prefix,group,selected,actualSelected:f.m.peek(2613),lens:Array.from({length:6},(_,i)=>f.m.peek(4740+i)),rows,native:records(f)})).toBe(e.same.length);expect(f.m.peek(3872)).toBe(e.same[0]??-1);}}
 command(f,':all');command(f,':find AB');f.select(2);f.type('j');expect(f.m.peek(2613)).toBe(5);f.type('j');expect(f.m.peek(2613)).toBe(0);command(f,':find z z',false);expect(f.m.peek(2612)).toBe(1);f.key(TEXT_KEYS.home);expect(f.m.peek(3870)).toBe(3);
},60_000);
const invalid:Record<string,string[]>={
 'study-deck':['Q|A|6|001','Q|A|0|1','Q|A|0|1000','Q||0|001',':bad'],
 'decision-matrix':['Name|10|0|0','Name|0|-1|0','Name|1|2',' |1|2|3',':weights 019'],
 'setlist-flow':['Name|0|0','Name|601|0','Name|1|12','Name|1|-1',':bad'],
 'shared-tab':['Name|-1','Name|730','Name|9999','Name|','   |1'],
 'statement-match':['Name|1000|1|B','Name|1|730|S','Name|1|-730|S','Name|1|+1|B','Name|1|1|X'],
 'address-circle':['Name|a b|A','Name|abc|G','Name||A','Name|abc|AA',':group Z'],
};
test('all six notebooks persist, reload atomically, reject invalid drafts and protect framework RAM',()=>{
 for(const app of COMMUNITY_NOTEBOOKS){const f=documentAppFixture(app),initial=records(f);const guards=[2999,3660,4009,4699,4712,4732,4752,4772,4799,4812,4832,4852,4872,4892,4999,5055,5199,5225];for(const a of guards)f.m.poke(a,713);for(const bad of invalid[app.id]!){f.edit(0,bad);expect(f.m.peek(2612),app.id+bad).toBe(1);f.key(TEXT_KEYS.home);expect(records(f)).toEqual(initial);}f.type('s');expect(f.screen()).toContain('Saved to disk');const saved=f.medium.image();f.edit(0,'');f.type('l');expect(f.m.peek(2612)).toBe(3);f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('');f.type('l');f.type('d');expect(records(f)).toEqual(initial);f.edit(0,'');f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);for(const a of guards)expect(f.m.peek(a),app.id+':'+a).toBe(713);const cold=documentAppFixture(app,saved);expect(records(cold)).toEqual(initial);cold.keyboard.queueTrytes([TEXT_KEYS.home]);cold.m.run(200_000);expect(cold.m.peek(2504)).toBe(11);expect(f.m.stackHighWater).toBeLessThan(243);}
},60_000);
