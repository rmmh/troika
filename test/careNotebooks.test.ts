import {expect,test} from 'vitest';
import {MAINTENANCE_LOG,PLANT_JOURNAL} from '../src/world/software/careNotebooks';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {documentAppFixture} from './documentAppFixture';
const command=(f:ReturnType<typeof documentAppFixture>,text:string)=>f.edit(f.m.peek(2613),text);
test('bicycle log computes service margins and stamps maintenance via native keys',()=>{
 const f=documentAppFixture(MAINTENANCE_LOG);f.edit(0,'Chain|500|200');f.edit(1,'Brakes|300|600');f.select(0);command(f,':km 750');expect(f.report()).toContain('Odometer 750 Due:1');expect(f.report()).toContain('Remaining -50 km');
 command(f,':done');expect(f.record(0)).toBe('Chain|750|200');expect(f.report()).toContain('Remaining 200 km');expect(f.report()).toContain('Due:0');
 for(const value of ['Bad|1|0','Bad|9001|2','Bad|9999|2','Bad|-1|5','|2|3','Bad|2|3|4',':km 9001',':done extra']){command(f,value);expect(f.m.peek(2612),value).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('Chain|750|200');}
 command(f,':km 700');command(f,':done');expect(f.m.peek(2612)).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('Chain|750|200');expect(f.report()).toContain('Service mileage is ahead');
 f.type('h');expect(f.screen()).toContain('COMPONENT|LAST|INTERVAL');f.type('?');expect(f.screen()).toContain(':km N / :done');f.type('s');const cold=documentAppFixture(MAINTENANCE_LOG,f.medium.image());expect(cold.record(0)).toBe('Chain|750|200');expect(cold.record(1)).toBe('Brakes|300|600');
},60_000);
test('plant journal derives light-dependent moisture and round-up watering schedules',()=>{
 const f=documentAppFixture(PLANT_JOURNAL);f.edit(0,'Fern|2|11|3');f.edit(1,'Cactus|1|30|1');f.select(0);command(f,':day 6');expect(f.report()).toContain('Day 6 Dry:1');expect(f.report()).toContain('Moisture -1 units');expect(f.report()).toContain('Water by day 6');command(f,':water');expect(f.record(0)).toBe('Fern|6|11|3');expect(f.report()).toContain('Moisture 11 units');expect(f.report()).toContain('Water by day 10');
 for(const value of ['Fern|1000|10|2','Fern|2|0|2','Fern|2|100|2','Fern|2|10|0','Fern|2|10|4','Fern|2|10',':day 1000',':water extra']){command(f,value);expect(f.m.peek(2612),value).toBe(1);f.key(TEXT_KEYS.home);expect(f.record(0)).toBe('Fern|6|11|3');}
 f.type('s');const cold=documentAppFixture(PLANT_JOURNAL,f.medium.image());expect(cold.record(0)).toBe('Fern|6|11|3');command(cold,':day 10');expect(cold.report()).toContain('Moisture -1 units');expect(cold.report()).toContain('WATER TODAY');expect(cold.m.stackHighWater).toBeLessThan(243);
},60_000);
test('native notebook calculations agree with independent mileage and depletion arithmetic',()=>{
 for(const app of [MAINTENANCE_LOG,PLANT_JOURNAL]){
 const f=documentAppFixture(app),plant=app===PLANT_JOURNAL;
 for(let n=0;n<36;n++){
 const last=n*7,now=last+(n*17)%301,interval=plant?1+(n*13)%99:1+(n*137)%9000,sun=1+n%3;
 f.edit(0,`Test|${last}|${interval}${plant?`|${sun}`:''}`);command(f,`${plant?':day':':km'} ${now}`);
 expect(f.m.peek(3847)).toBe(interval-(now-last)*(plant?sun:1));if(plant)expect(f.m.peek(3848)).toBe(last+Math.ceil(interval/sun));
 expect(f.m.peek(2616)).toBeLessThanOrEqual(108);
 }
 }
},60_000);

test('care notebooks keep adjacent arenas intact at maximum inputs and confirm dirty exits',()=>{
 for(const app of [MAINTENANCE_LOG,PLANT_JOURNAL]){
 const f=documentAppFixture(app),plant=app===PLANT_JOURNAL,guards=[2999,3660,4009,4899,4955,5225];guards.forEach(a=>f.m.poke(a,728));
 f.edit(11,plant?'EighteenCharName12|0|99|3':'EighteenCharName12|0|9000');command(f,plant?':day 999':':km 9000');expect(f.m.peek(3847)).toBe(plant?-2898:0);
 command(f,plant?':water':':done');expect(f.record(11)).toBe(plant?'EighteenCharName12|999|99|3':'EighteenCharName12|9000|9000');
 f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(2);f.key(TEXT_KEYS.home);expect(f.m.peek(2612)).toBe(0);
 f.type('s');guards.forEach(a=>expect(f.m.peek(a),`${app.id} guard ${a}`).toBe(728));
 f.keyboard.queueTrytes([TEXT_KEYS.home]);f.m.run(200_000);expect(f.m.peek(2504)).toBe(11);expect(f.m.stackHighWater).toBeLessThan(243);
 }
},60_000);
