import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {catalogTdJulianDay,catalogUtJulianDay,eclipseCalendarForDate,eclipseFileChecksum,packEclipseCatalogue,packEclipseCentury,readEclipseYear,unpackEclipseCentury,validateEclipseCatalogue,validateEclipseRecord,ECLIPSE_RECORD_CELLS} from '../src/world/astronomy/eclipsePacking';
const imported:unknown=JSON.parse(readFileSync(new URL('../src/world/astronomy/data/nasa-eclipses.json',import.meta.url),'utf8'));
const catalog=validateEclipseCatalogue(imported),files=packEclipseCatalogue(catalog);
test('pinned NASA import covers every year with consecutive distinct catalog numbers and exact source anchors',()=>{
 expect(catalog.solar).toHaveLength(11898);expect(catalog.lunar).toHaveLength(12064);
 for(const kind of['solar','lunar']as const){const rows=catalog[kind];rows.forEach((r,i)=>expect(r.number).toBe(rows[0]!.number+i));for(let year=-1999;year<=3000;year++)expect(rows.some(r=>r.year===year)).toBe(true);}
 // Independently transcribed NASA century-table facts, not computed by the packer.
 expect(catalog.solar.find(r=>r.number===9561)).toMatchObject({year:2024,month:4,day:8,calendar:'gregorian',td:'18:18:29',deltaTSeconds:74,type:'T',saros:139,gamma1e4:3431,magnitude1e4:10566,pathWidthKm:198,centralDurationSeconds:268});
 expect(catalog.lunar.find(r=>r.number===9706)).toMatchObject({year:2025,month:3,day:14,td:'06:59:56',deltaTSeconds:75,penumbralMagnitude1e4:22595,umbralMagnitude1e4:11784,penumbralDurationTenthsMinutes:3626,partialDurationTenthsMinutes:2183,totalDurationTenthsMinutes:654});
 expect(catalog.solar.find(r=>r.number===7124)).toMatchObject({number:7124,year:1000,month:4,day:7,calendar:'julian',td:'09:21:38',lunation:-12365});expect(catalog.solar.at(-1)).toMatchObject({year:3000,month:10,day:19,type:'H'});
});
test('all23962 source records round-trip losslessly into102 bounded native files and exact year ranges',()=>{
 expect(files).toHaveLength(102);expect(new Set(files.map(f=>f.path)).size).toBe(102);
 for(const file of files){expect(file.cells.length).toBeLessThanOrEqual(9841);expect(file.cells.length).toBe(117+file.count*ECLIPSE_RECORD_CELLS[file.kind]);expect([...file.cells].every(c=>Number.isInteger(c)&&c>=-9841&&c<=9841)).toBe(true);const expected=catalog[file.kind].filter(r=>r.year>=file.startYear&&r.year<=file.endYear);expect(unpackEclipseCentury(file.cells).records).toEqual(expected);
  for(let year=file.startYear;year<=file.endYear;year++){const index=year-file.startYear,first=file.cells[16+index]!,end=file.cells[17+index]!;expect(expected.slice(first,end)).toEqual(expected.filter(r=>r.year===year));}
 }
 for(const year of[-1999,-1901,-1900,-101,-100,-1,0,1,99,100,1000,1099,1100,1499,1500,1582,1599,1600,1999,2000,2099,2100,2999,3000])for(const kind of['solar','lunar']as const){const file=files.find(f=>f.kind===kind&&year>=f.startYear&&year<=f.endYear)!;expect(readEclipseYear(file.cells,year)).toEqual(catalog[kind].filter(r=>r.year===year));}
 console.log(`Eclipse storage: ${files.reduce((n,f)=>n+f.cells.length,0)} cells; largest ${Math.max(...files.map(f=>f.cells.length))};102 files`);
});
test('base729 limbs retain signed oversized values and null differs from real zero',()=>{
 const r=catalog.lunar.find(r=>r.umbralMagnitude1e4 < -9841)!;const file=packEclipseCentury('lunar',Math.floor(r.year/100)*100,[r]);expect(unpackEclipseCentury(file.cells).records[0]).toEqual(r);expect(file.cells[117+21]).toBeGreaterThanOrEqual(0);expect(file.cells[117+22]).toBeLessThan(0);
 const zero=catalog.solar.find(r=>r.centralDurationSeconds===0)!;const partial=catalog.solar.find(r=>r.centralDurationSeconds===null)!;expect(unpackEclipseCentury(packEclipseCentury('solar',Math.floor(zero.year/100)*100,[zero]).cells).records[0]).toMatchObject({centralDurationSeconds:0});expect(unpackEclipseCentury(packEclipseCentury('solar',Math.floor(partial.year/100)*100,[partial]).cells).records[0]).toMatchObject({centralDurationSeconds:null});
});
test('historical calendar cutover and leap rules are explicit; TD minus catalog DeltaT is UT not UTC',()=>{
 const jd=(year:number,month:number,day:number,calendar:'julian'|'gregorian',td='00:00:00')=>catalogTdJulianDay({year,month,day,calendar,td});
 expect(jd(2000,1,1,'gregorian','12:00:00')).toBe(2451545);expect(jd(1582,10,4,'julian')).toBe(2299159.5);expect(jd(1582,10,15,'gregorian')).toBe(2299160.5);expect(jd(1500,3,1,'julian')-jd(1500,3,1,'gregorian')).toBe(10);
 expect(eclipseCalendarForDate(1582,10,4)).toBe('julian');expect(eclipseCalendarForDate(1582,10,15)).toBe('gregorian');expect(()=>eclipseCalendarForDate(1582,10,10)).toThrow(/gap/);
 const prototype=catalog.solar[0]!;expect(()=>validateEclipseRecord('solar',{...prototype,year:1500,month:2,day:29,calendar:'julian'})).not.toThrow();expect(()=>validateEclipseRecord('solar',{...prototype,year:1700,month:2,day:29,calendar:'gregorian'})).toThrow(/day/);
 const eclipse=catalog.solar.find(r=>r.number===9561)!;const expectedUtcLabelOnlyForComparison=Date.UTC(2024,3,8,18,17,15)/86400000+2440587.5;expect(catalogUtJulianDay(eclipse)).toBeCloseTo(expectedUtcLabelOnlyForComparison,8);expect((catalogTdJulianDay(eclipse)-catalogUtJulianDay(eclipse))*86400).toBeCloseTo(74,4);
 // A source DeltaT subtraction may cross midnight; JD retains that carry.
 const nearMidnight={...eclipse,td:'00:00:20',deltaTSeconds:74};expect(catalogUtJulianDay(nearMidnight)).toBeCloseTo(jd(2024,4,7,'gregorian','23:59:06'),8);
 const negative={...eclipse,deltaTSeconds:-6};expect((catalogUtJulianDay(negative)-catalogTdJulianDay(negative))*86400).toBeCloseTo(6,4);
});
test('bad import records reject fractional data, unknown codes, precision loss and incompatible calendar',()=>{
 const r=catalog.solar.find(r=>r.year===1000)!;for(const patch of[{month:13},{day:0},{year:-2000},{calendar:'gregorian'},{td:'24:00:00'},{td:'12:00:60'},{gamma1e4:1.5},{magnitude1e4:NaN},{type:'?'},{classification:'?'},{pathWidthKm:undefined},{extra:1},{deltaTSeconds:50001}])expect(()=>validateEclipseRecord('solar',{...r,...patch})).toThrow();
 expect(()=>packEclipseCentury('solar',1001,[r])).toThrow(/century/);expect(()=>packEclipseCentury('solar',1100,[r])).toThrow(/outside/);expect(()=>packEclipseCentury('solar',1000,[r,r])).toThrow(/duplicated/);expect(()=>packEclipseCentury('solar',1000,[catalog.solar.find(next=>next.number===r.number+1)??{...r,day:r.day+1},r])).toThrow(/unordered/);
 for(const change of[{...catalog,solar:catalog.solar.slice(1)},{...catalog,solar:[...catalog.solar].reverse()},{...catalog,timeScale:'UTC'},{...catalog,sources:catalog.sources.slice(1)}]){expect(()=>validateEclipseCatalogue(change)).toThrow();}
 expect(()=>validateEclipseCatalogue({...catalog,solar:catalog.solar.filter(r=>r.year!==1700)})).toThrow(/incomplete|missing/);
});
test('native file validation rejects checksum changes, illegal limbs, index corruption, truncation and unknown formats',()=>{
 const original=files.find(f=>f.kind==='solar'&&f.startYear===2000)!.cells;
 for(const at of[0,5,13,16,117,original.length-1]){const broken=original.slice();broken[at]=broken[at]!+1;expect(()=>unpackEclipseCentury(broken)).toThrow();}
 expect(()=>unpackEclipseCentury(original.slice(0,-1))).toThrow();expect(()=>unpackEclipseCentury([...original,0])).toThrow();expect(()=>unpackEclipseCentury([...original.slice(0,-1),NaN])).toThrow();
 for(const [at,value]of[[16,1],[117+7,729],[117+6,2],[117+13,90],[117+14,90],[117+3,24],[11,2],[15,1]]){const broken=original.slice();broken[at!]=value!;broken[13]=eclipseFileChecksum(broken);expect(()=>unpackEclipseCentury(broken)).toThrow();}
 expect(()=>readEclipseYear(original,1999)).toThrow(/lookup/);expect(()=>readEclipseYear(files.find(f=>f.startYear===3000)!.cells,3001)).toThrow(/lookup/);
 // Distinct non-trit-divisible multiplier keeps early cells in the checksum.
 const a=new Int16Array(200);const b=a.slice();b[0]=1;expect(eclipseFileChecksum(a)).not.toBe(eclipseFileChecksum(b));
});

test('BCE source anchors retain large DeltaT, negative Saros and astronomical year zero',()=>{
 expect(catalog.solar[0]).toMatchObject({number:1,year:-1999,month:6,day:12,td:'03:14:51',deltaTSeconds:46438,lunation:-49456,saros:5,gamma1e4:-2701,magnitude1e4:10733,centralDurationSeconds:397});
 expect(catalog.lunar[0]).toMatchObject({number:1,year:-1999,month:6,day:26,td:'14:13:28',deltaTSeconds:46437,lunation:-49456,saros:17,umbralMagnitude1e4:-1922});
 expect(catalog.solar.find(r=>r.number===5)).toMatchObject({year:-1997,saros:-13});
 const first=files.find(f=>f.kind==='solar'&&f.startYear===-2000)!;expect(first.cells[16]).toBe(0);expect(first.cells[17]).toBe(0);expect(readEclipseYear(first.cells,-1999)[0]).toEqual(catalog.solar[0]);
 for(const kind of['solar','lunar']as const)expect(catalog[kind].some(r=>r.year===0)).toBe(true);
 expect(catalogTdJulianDay({year:0,month:1,day:1,calendar:'gregorian',td:'00:00:00'})).toBe(1721059.5);
});
