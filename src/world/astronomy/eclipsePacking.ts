/** Build-time lossless packing of NASA catalog facts, never an eclipse solver.
 * File layout and stable enum codes are documented in README.txt. */
export type EclipseKind='solar'|'lunar';
export type EclipseCalendar='julian'|'gregorian';
export interface EclipseBase {number:number;year:number;month:number;day:number;calendar:EclipseCalendar;td:string;deltaTSeconds:number;lunation:number;saros:number;type:string;classification:string;gamma1e4:number;latitudeDegrees:number;longitudeDegrees:number}
export interface SolarEclipse extends EclipseBase {magnitude1e4:number;sunAltitudeDegrees:number|null;pathWidthKm:number|null;centralDurationSeconds:number|null}
export interface LunarEclipse extends EclipseBase {penumbralMagnitude1e4:number;umbralMagnitude1e4:number;penumbralDurationTenthsMinutes:number|null;partialDurationTenthsMinutes:number|null;totalDurationTenthsMinutes:number|null}
export type EclipseRecord=SolarEclipse|LunarEclipse;
export interface EclipseCatalogue {schema:1;yearRange:[1000,3000];timeScale:string;attribution:string;solar:SolarEclipse[];lunar:LunarEclipse[];sources:{url:string;sha256:string}[]}
export const ECLIPSE_TYPES={solar:['P','A','T','H','Pb','Pe','Tm','Am','An','A-','A+','H2','H3','As','T-','Ts','Hm','Tn','T+'],lunar:['P','N','T','T+','T-','Nx','Nb','Ne']} as const;
export const ECLIPSE_CLASSES={solar:['-n','-p','-t','n-','nn','np','p-','pn','t-'],lunar:['-a','-h','-p','-t','a-','h-','p-','pp','pt','t-','tp']} as const;
export const ECLIPSE_HEADER_CELLS=16,ECLIPSE_YEAR_INDEX_CELLS=101,ECLIPSE_DATA_OFFSET=117,ECLIPSE_MAX_FILE_CELLS=9841,ECLIPSE_NULL=-9841;
export const ECLIPSE_RECORD_CELLS={solar:24,lunar:26} as const;
const commonKeys=['number','year','month','day','calendar','td','deltaTSeconds','lunation','saros','type','classification','gamma1e4','latitudeDegrees','longitudeDegrees'];
const specificKeys={solar:['magnitude1e4','sunAltitudeDegrees','pathWidthKm','centralDurationSeconds'],lunar:['penumbralMagnitude1e4','umbralMagnitude1e4','penumbralDurationTenthsMinutes','partialDurationTenthsMinutes','totalDurationTenthsMinutes']};
const fail=(message:string):never=>{throw new Error(`Eclipse data: ${message}`)};
const object=(x:unknown):Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:fail('expected object');
const integer=(x:unknown,lo:number,hi:number,name:string):number=>typeof x==='number'&&Number.isInteger(x)&&x>=lo&&x<=hi?x:fail(`invalid ${name}`);
const nullable=(x:unknown,lo:number,hi:number,name:string)=>x===null?null:integer(x,lo,hi,name);
export function eclipseCalendarForDate(year:number,month:number,day:number):EclipseCalendar{
 if(year===1582&&month===10&&day>=5&&day<=14)fail('date is in Gregorian reform gap');
 return year>1582||(year===1582&&(month>10||(month===10&&day>=15)))?'gregorian':'julian';
}
export function validateEclipseRecord(kind:EclipseKind,value:unknown):EclipseRecord{
 const r=object(value),keys=[...commonKeys,...specificKeys[kind]];
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))fail('unexpected or missing record fields');
 const year=integer(r.year,1000,3000,'year'),month=integer(r.month,1,12,'month'),day=integer(r.day,1,31,'day');
 const calendar=eclipseCalendarForDate(year,month,day);if(r.calendar!==calendar)fail('calendar disagrees with source date');
 const leap=year%4===0&&(calendar==='julian'||year%100!==0||year%400===0);
 if(day>[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1]!)fail('invalid calendar day');
 if(typeof r.td!=='string'||!/^\d{2}:\d{2}:\d{2}$/.test(r.td))fail('invalid TD clock');
 const [hour,minute,second]=(r.td as string).split(':').map(Number);integer(hour,0,23,'TD hour');integer(minute,0,59,'TD minute');integer(second,0,59,'TD second');
 if(!(ECLIPSE_TYPES[kind] as readonly unknown[]).includes(r.type))fail('unknown eclipse type');
 if(!(ECLIPSE_CLASSES[kind] as readonly unknown[]).includes(r.classification))fail('unknown classification');
 integer(r.number,1,20000,'catalog number');integer(r.deltaTSeconds,-9840,9841,'delta T');integer(r.lunation,-20000,20000,'lunation');integer(r.saros,1,999,'Saros');integer(r.gamma1e4,-20000,20000,'gamma');integer(r.latitudeDegrees,-90,90,'latitude');integer(r.longitudeDegrees,-180,180,'longitude');
 if(kind==='solar'){integer(r.magnitude1e4,0,20000,'magnitude');nullable(r.sunAltitudeDegrees,0,90,'sun altitude');nullable(r.pathWidthKm,0,9841,'path width');nullable(r.centralDurationSeconds,0,9841,'central duration');}
 else{integer(r.penumbralMagnitude1e4,0,40000,'penumbral magnitude');integer(r.umbralMagnitude1e4,-20000,30000,'umbral magnitude');nullable(r.penumbralDurationTenthsMinutes,0,9841,'penumbral duration');nullable(r.partialDurationTenthsMinutes,0,9841,'partial duration');nullable(r.totalDurationTenthsMinutes,0,9841,'total duration');}
 return {...r} as unknown as EclipseRecord;
}
export function validateEclipseCatalogue(value:unknown):EclipseCatalogue{
 const c=object(value);if(c.schema!==1||JSON.stringify(c.yearRange)!=='[1000,3000]'||c.timeScale!=='TD (Terrestrial Dynamical Time)'||typeof c.attribution!=='string'||!c.attribution)fail('unsupported catalog metadata');
 for(const kind of ['solar','lunar'] as const){const list=c[kind];if(!Array.isArray(list))fail(`missing ${kind} rows`);const first=kind==='solar'?7124:7216,last=kind==='solar'?11898:12064;if((list as unknown[]).length!==last-first+1)fail(`incomplete ${kind} catalog`);let expectedNumber=first;let previous=-Infinity;const seen=new Set<number>(),years=new Set<number>();for(const value of list as unknown[]){const r=validateEclipseRecord(kind,value),time=catalogTdJulianDay(r);if(r.number!==expectedNumber++)fail(`nonconsecutive ${kind} catalog number`);if(time<=previous)fail(`${kind} rows out of chronological order`);previous=time;if(seen.has(r.number))fail(`duplicate ${kind} number`);seen.add(r.number);years.add(r.year);}if(years.size!==2001)fail(`missing ${kind} year`);}
 if(!Array.isArray(c.sources)||c.sources.length!==42)fail('expected 42 source century pages');const urls=new Set<string>();for(const item of c.sources as unknown[]){const s=object(item);if(typeof s.url!=='string'||!/^https:\/\/eclipse\.gsfc\.nasa\.gov\/(SE|LE)cat5\/\1\d{4}-\d{4}\.html$/.test(s.url)||typeof s.sha256!=='string'||! /^[a-f0-9]{64}$/.test(s.sha256))fail('invalid source provenance');if(urls.has(s.url as string))fail('duplicate source URL');urls.add(s.url as string);}
 for(const prefix of ['SE','LE'])for(let start=901;start<3000;start+=100)if(!urls.has(`https://eclipse.gsfc.nasa.gov/${prefix}cat5/${prefix}${String(start).padStart(4,'0')}-${start+99}.html`))fail('missing source century');
 return c as unknown as EclipseCatalogue;
}
/** Astronomical JD on the catalog TD time scale. Calendar is mandatory. */
export function catalogTdJulianDay(r:Pick<EclipseBase,'year'|'month'|'day'|'calendar'|'td'>):number{
 const a=Math.floor((14-r.month)/12),y=r.year+4800-a,m=r.month+12*a-3;
 const jdn=r.day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)+(r.calendar==='gregorian'?-Math.floor(y/100)+Math.floor(y/400)-32045:-32083);
 const [h,min,s]=r.td.split(':').map(Number);return jdn-0.5+(h!*3600+min!*60+s!)/86400;
}
/** Catalog-derived UT = TD - catalog DeltaT. This is not UTC. */
export function catalogUtJulianDay(r:Pick<EclipseBase,'year'|'month'|'day'|'calendar'|'td'|'deltaTSeconds'>):number{return catalogTdJulianDay(r)-r.deltaTSeconds/86400;}
const limbs=(n:number)=>{const high=Math.floor(n/729);return[n-high*729,high]};
const norm=(n:number)=>((n+9841)%19683+19683)%19683-9841;
export function eclipseFileChecksum(cells:ArrayLike<number>):number{let sum=0;for(let i=0;i<cells.length;i++)sum=norm(sum*2+(i===13?0:cells[i]!));return sum;}
function encodeRecord(kind:EclipseKind,r:EclipseRecord,start:number):number[]{
 const clock=r.td.split(':').map(Number),out=[r.year-start,r.month,r.day,...clock,r.calendar==='julian'?0:1,...limbs(r.number),r.deltaTSeconds,...limbs(r.lunation),r.saros,(ECLIPSE_TYPES[kind] as readonly string[]).indexOf(r.type),(ECLIPSE_CLASSES[kind] as readonly string[]).indexOf(r.classification),...limbs(r.gamma1e4),r.latitudeDegrees,r.longitudeDegrees];
 if(kind==='solar'){const s=r as SolarEclipse;out.push(...limbs(s.magnitude1e4),s.sunAltitudeDegrees??ECLIPSE_NULL,s.pathWidthKm??ECLIPSE_NULL,s.centralDurationSeconds??ECLIPSE_NULL);}else{const l=r as LunarEclipse;out.push(...limbs(l.penumbralMagnitude1e4),...limbs(l.umbralMagnitude1e4),l.penumbralDurationTenthsMinutes??ECLIPSE_NULL,l.partialDurationTenthsMinutes??ECLIPSE_NULL,l.totalDurationTenthsMinutes??ECLIPSE_NULL);}return out;
}
export interface PackedEclipseCentury {kind:EclipseKind;startYear:number;endYear:number;path:string;count:number;cells:Int16Array}
export function packEclipseCentury(kind:EclipseKind,startYear:number,input:readonly EclipseRecord[]):PackedEclipseCentury{
 integer(startYear,1000,3000,'century start');if(startYear%100)fail('century starts must be multiples of 100');const endYear=Math.min(startYear+99,3000),width=ECLIPSE_RECORD_CELLS[kind];
 const records=input.map(r=>validateEclipseRecord(kind,r));let previous=-Infinity;const seen=new Set<number>();for(const r of records){if(r.year<startYear||r.year>endYear)fail('record outside century');const time=catalogTdJulianDay(r);if(time<=previous||seen.has(r.number))fail('century rows unordered or duplicated');previous=time;seen.add(r.number);}
 const length=ECLIPSE_DATA_OFFSET+width*records.length;if(length>ECLIPSE_MAX_FILE_CELLS)fail('century exceeds native file limit');
 const cells=new Int16Array(length);cells.set([69,67,76,1,kind==='solar'?0:1,startYear,endYear,width,records.length,16,117,1,1,0,0,0]);let at=0;for(let y=0;y<=100;y++){while(at<records.length&&records[at]!.year<startYear+y)at++;cells[16+y]=at;}records.forEach((r,i)=>cells.set(encodeRecord(kind,r,startYear),117+i*width));cells[13]=eclipseFileChecksum(cells);
 return{kind,startYear,endYear,path:`/astro/${kind==='solar'?'s':'l'}${startYear/100}`,count:records.length,cells};
}
function decodeRecord(kind:EclipseKind,start:number,cells:ArrayLike<number>,offset:number):EclipseRecord{
 const x=(n:number)=>cells[offset+n]!,wide=(n:number)=>{integer(x(n),0,728,'low limb');return x(n)+729*x(n+1)},nullableCell=(n:number)=>x(n)===ECLIPSE_NULL?null:x(n);
 integer(x(6),0,1,'calendar code');integer(x(13),0,ECLIPSE_TYPES[kind].length-1,'type code');integer(x(14),0,ECLIPSE_CLASSES[kind].length-1,'classification code');
 const r:EclipseBase={year:start+x(0),month:x(1),day:x(2),td:[x(3),x(4),x(5)].map(v=>String(v).padStart(2,'0')).join(':'),calendar:x(6)?'gregorian':'julian',number:wide(7),deltaTSeconds:x(9),lunation:wide(10),saros:x(12),type:ECLIPSE_TYPES[kind][x(13)]!,classification:ECLIPSE_CLASSES[kind][x(14)]!,gamma1e4:wide(15),latitudeDegrees:x(17),longitudeDegrees:x(18)};
 return validateEclipseRecord(kind,kind==='solar'?{...r,magnitude1e4:wide(19),sunAltitudeDegrees:nullableCell(21),pathWidthKm:nullableCell(22),centralDurationSeconds:nullableCell(23)}:{...r,penumbralMagnitude1e4:wide(19),umbralMagnitude1e4:wide(21),penumbralDurationTenthsMinutes:nullableCell(23),partialDurationTenthsMinutes:nullableCell(24),totalDurationTenthsMinutes:nullableCell(25)});
}
export function unpackEclipseCentury(cells:ArrayLike<number>):PackedEclipseCentury & {records:EclipseRecord[]}{
 if(cells.length<117||cells.length>9841)fail('invalid file length');for(let i=0;i<cells.length;i++)integer(cells[i],-9841,9841,'native cell');
 if([69,67,76,1].some((v,i)=>cells[i]!==v)||cells[9]!==16||cells[10]!==117||cells[11]!==1||cells[12]!==1||cells[14]!==0||cells[15]!==0)fail('unsupported file header');integer(cells[4],0,1,'kind code');const kind=cells[4]?'lunar':'solar',start=integer(cells[5],1000,3000,'century start');if(start%100||cells[6]!==Math.min(start+99,3000)||cells[7]!==ECLIPSE_RECORD_CELLS[kind])fail('inconsistent century header');const count=integer(cells[8],0,400,'record count');if(cells.length!==117+count*ECLIPSE_RECORD_CELLS[kind])fail('truncated or trailing data');if(cells[13]!==eclipseFileChecksum(cells))fail('checksum mismatch');
 const records=Array.from({length:count},(_,i)=>decodeRecord(kind,start,cells,117+i*ECLIPSE_RECORD_CELLS[kind]));const expected=packEclipseCentury(kind,start,records);for(let i=16;i<117;i++)if(cells[i]!==expected.cells[i])fail('invalid year index');return{...expected,records};
}
export function packEclipseCatalogue(input:unknown):PackedEclipseCentury[]{const c=validateEclipseCatalogue(input);return(['solar','lunar'] as const).flatMap(kind=>Array.from({length:21},(_,i)=>{const year=1000+i*100;return packEclipseCentury(kind,year,c[kind].filter(r=>r.year>=year&&r.year<year+100));}));}
/** Validates the file before exposing its indexed year span to build-time callers. */
export function readEclipseYear(cells:ArrayLike<number>,year:number):EclipseRecord[]{const file=unpackEclipseCentury(cells);integer(year,file.startYear,file.endYear,'lookup year');const offset=year-file.startYear;return file.records.slice(cells[16+offset],cells[17+offset]);}
