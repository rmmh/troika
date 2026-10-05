import {expect,test} from 'vitest';
import {TEA_HOUSE_POET,RECIPE_INDEX} from '../src/world/software/personalWriting';
import {documentAppFixture} from './documentAppFixture';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {norm} from '../src/core/tryte';
const command=(f:ReturnType<typeof documentAppFixture>,s:string)=>f.edit(f.m.peek(2613),s);
const bank=['rain','a blue cup','small birds','warm windows','waits','turns slowly','listens','drifts','at dawn','by the door','under leaves','near home'];
function poem(seed:number,form:number,words=bank){const picks:number[]=[];for(let b=0;b<3;b++){seed=Math.abs(norm(seed*17+43));let at=seed%4;let n=0;while(n<4&&!words[4*b+at]){at=(at+1)%4;n++;}picks.push(n===4?-1:4*b+at);}const[a,b,c]=picks.map(i=>i<0?'(empty)':words[i]!);return{seed,lines:form===0?[a,b,c]:form===1?[a,`${b} ${c}`,a]:[`${a} ${b}`,c,'N next F form H banks']};}
test('poet generates deterministic native forms from editable saved banks',()=>{
 const f=documentAppFixture(TEA_HOUSE_POET);let expected=poem(42,0);command(f,':seed 42');expect(f.m.peek(3808)).toBe(expected.seed);expected.lines.forEach(line=>expect(f.report()).toContain(line));
 f.type('f');expected=poem(42,1);expected.lines.forEach(line=>expect(f.report()).toContain(line));f.type('f');expected=poem(42,2);expected.lines.forEach(line=>expect(f.report()).toContain(line));
 f.type('n');expected=poem(expected.seed,2);expect(f.m.peek(3808)).toBe(expected.seed);expected.lines.forEach(line=>expect(f.report()).toContain(line));
 f.edit(0,'silver rain');f.type('s');const cold=documentAppFixture(TEA_HOUSE_POET,f.medium.image());expect(cold.record(0)).toBe('silver rain');
 for(let i=0;i<4;i++)cold.edit(i,'');command(cold,':seed 42');expect(cold.report()).toContain('(empty)');
 for(const bad of ['thirteen chars! ',':seed 9001',':seed -1',':seed 42x']){command(cold,bad);expect(cold.m.peek(2612)).toBe(1);cold.key(TEXT_KEYS.home);}
},60_000);
test('native poem choices agree with independent ternary recurrence across seeds and forms',()=>{
 const f=documentAppFixture(TEA_HOUSE_POET);
 for(const seed of [0,1,2,42,99,728,729,8999,9000])for(let form=0;form<3;form++){
 command(f,`:seed ${seed}`);while(f.m.peek(3809)!==form)f.type('f');const expected=poem(seed,form);expect(f.m.peek(3808)).toBe(expected.seed);expect(f.report().slice(27).trimEnd()).toBe(expected.lines.map((s,i)=>i===2?s:s!.padEnd(27)).join(''));
 }
},60_000);
const records=['Oat biscuits|sweet|oat flour','Nut oats|sweet,nut|oat almond','Rice bowl|savory|rice pea','apple toast|sweet|apple bread','Oat milk|drink|oat milk','Oat|sweet|oat','Oat|savory|oat'];
function reference(query:string){return records.map((text,i)=>({text,i})).filter(({text})=>{const[,tags,ingredients]=text.split('|');return query.split(' ').filter(Boolean).every(term=>{const prefix=term[0],word=['+','-','!'].includes(prefix!)?term.slice(1):term;const hay=['+','-'].includes(prefix!)?tags!.split(','):ingredients!.split(' ');return ['-','!'].includes(prefix!)?!hay.includes(word):hay.includes(word);});}).sort((a,b)=>{const an=a.text.split('|')[0]!.toLowerCase(),bn=b.text.split('|')[0]!.toLowerCase();return an<bn?-1:an>bn?1:a.i-b.i;}).map(x=>x.i);}
test('recipe index combines whole-word positive and negative terms and alphabetic navigation',()=>{
 const f=documentAppFixture(RECIPE_INDEX);records.forEach((s,i)=>f.edit(i,s));
 for(const query of ['', 'oat','oat +sweet','oat +sweet -nut','oat !milk','+sweet -nut !bread','rice pea','oa','+swe','-nut !milk']){
 command(f,query?`:find ${query}`:':find');const ids=reference(query);expect(f.m.peek(3912),query).toBe(ids.length);expect(ids.map((_,i)=>f.m.peek(3900+i)),query).toEqual(ids);
 if(ids.length){f.type('j');expect(f.m.peek(2613)).toBe(ids[0]);f.type('p');f.type('j');expect(f.m.peek(2613)).toBe(ids.at(-1));f.type('n');f.type('j');expect(f.m.peek(2613)).toBe(ids[0]);}
 }
 command(f,':find oat +sweet -nut');expect(f.report()).toContain('Matches 2');f.type('s');const cold=documentAppFixture(RECIPE_INDEX,f.medium.image());records.forEach((s,i)=>expect(cold.record(i)).toBe(s));expect(cold.m.peek(3912)).toBe(records.length);
 for(const bad of ['Bad|tag,|oat','Bad||','Bad|Sweet|oat','Bad||oat  flour',':find +',':find oat  flour',':find Oat']){command(cold,bad);expect(cold.m.peek(2612),bad).toBe(1);cold.key(TEXT_KEYS.home);}
},60_000);
test('writing tools guard memory, retain dirty edits on cancelled exit, and bound report output',()=>{
 for(const app of [TEA_HOUSE_POET,RECIPE_INDEX]){
 const f=documentAppFixture(app),guards=[2999,3660,4009,4676,5225];guards.forEach(a=>f.m.poke(a,728));
 if(app===TEA_HOUSE_POET){for(let i=0;i<12;i++)f.edit(i,'abcdefghijkl');command(f,':seed 9000');for(let i=0;i<9;i++){f.type('nf');expect(f.m.peek(2616)).toBeLessThanOrEqual(108);}}
 else{for(let i=0;i<12;i++)f.edit(i,`${String.fromCharCode(108-i)}|a,b|oat milk`);command(f,':find '+Array(12).fill('oat').join(' '));expect(f.m.peek(3912)).toBe(12);expect(Array.from({length:12},(_,i)=>f.m.peek(3900+i))).toEqual(Array.from({length:12},(_,i)=>11-i));for(let i=0;i<15;i++)f.type('nj');expect(f.m.peek(2616)).toBeLessThanOrEqual(108);}
 f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);expect(f.m.peek(2614)).toBe(1);f.type('s');guards.forEach(a=>expect(f.m.peek(a),`${app.id} guard ${a}`).toBe(728));
 f.keyboard.queueTrytes([TEXT_KEYS.home]);f.m.run(200_000);expect(f.m.peek(2504)).toBe(11);expect(f.m.stackHighWater).toBeLessThan(243);
 }
},60_000);
