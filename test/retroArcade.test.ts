import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {RETRO_ARCADE} from '../src/world/software/retroArcade';
import {retroArcadeReference,robotsReference,robotsSolution,snakeReference,morrisReference,bowlingReference,MORRIS_CELLS,type ArcadeReference} from './retroArcadeReference';
import {buildNativeSoftware} from '../src/world/software/native';
import {buildProgramCore} from '../src/firmware/programCore';
import {FirmwareProbe} from './firmwareProbe';
import {TextDevice} from '../src/core/textDevice';
import {DisplayDevice} from '../src/core/displayDevice';
import {REG_P} from '../src/core/machine';
import {TEXT_KEYS} from '../src/core/textKeyboard';
import {settleSoftwareUi} from './softwareUiDriver';
import {starterScreen} from '../src/world/starter';
const source=(name:string)=>readFileSync(new URL(`../firmware/include/${name}.asm`,import.meta.url),'utf8');
function fixture(index:number){
 const app=RETRO_ARCADE[index]!,core=buildProgramCore(source,{name:'menu',source:source('programMenu')}),built=buildNativeSoftware(core,source,app);
 expect(core.image.reserved+built.image.reserved).toBeLessThanOrEqual(9666);
 const m=new FirmwareProbe(['mmio','screen','palette','native.stack','page.text','scratch','network.state']);for(const unit of[core.image,built.image])for(const c of unit.image.chunks)c.data.forEach((v,i)=>m.poke(c.addr+i,v));m.poke(REG_P,built.image.image.labels.get('app_entry')!);
 const guards=[[2899,2964,3199,3206,3299,3364,3399,3406,3499,3564],[2899,2964,3199,3207,3299,3364],[2899,2949,3199,3208,3213,3219,3222,3299,3324,3499,3521],[2899,2949,3199,3209,3299,3310,3499,3527]][index]!;guards.forEach(a=>m.poke(a,719));const keyboard=new TextDevice();m.attach(keyboard);m.attach(new DisplayDevice(a=>m.peek(a),(a,v)=>m.poke(a,v)));
 const settle=()=>settleSoftwareUi(m,keyboard,built.image.image.labels.get('app_key')!);const key=(v:number)=>{keyboard.queueTrytes([v]);settle();};let model:ArcadeReference=retroArcadeReference(app.id)!;
 const check=()=>{expect(String.fromCharCode(...Array.from({length:app.columns*app.rows},(_,i)=>m.peek(2900+i)))).toBe(model.board);expect(m.peek(2631)).toBe(model.moves);expect(m.peek(2632)).toBe(model.status);const message=m.peek(2633);let length=0;while(length<128&&m.peek(message+length)!==0)length++;expect(length,'status message columns').toBeLessThanOrEqual(27);for(const a of guards)expect(m.peek(a),`guard ${a}`).toBe(719);};
 const play=(square:number)=>{const current=m.peek(2630),dr=Math.floor(square/app.columns)-Math.floor(current/app.columns),dc=square%app.columns-current%app.columns;keyboard.queueTrytes(Array(Math.abs(dr)).fill(dr<0?TEXT_KEYS.up:TEXT_KEYS.down));keyboard.queueTrytes(Array(Math.abs(dc)).fill(dc<0?TEXT_KEYS.left:TEXT_KEYS.right));key(TEXT_KEYS.activate);model.play(square);check();};
 const letter=(s:string)=>{keyboard.queueText(s);settle();if(s.toLowerCase()==='n')model.step!();else model.key(s.toLowerCase());check();};
 const reset=()=>{keyboard.queueText('r');settle();model=retroArcadeReference(app.id)!;check();};settle();check();
 return {m,play,letter,reset,check,get model(){return model;},screen:()=>starterScreen(m),inject(next:ArcadeReference,cells:Record<number,number>,renderKey?:string,renderSquare?:number){model=next;for(const[a,v]of Object.entries(cells))m.poke(Number(a),v);if(renderKey)letter(renderKey);else if(renderSquare!==undefined)play(renderSquare);},exit(){keyboard.queueTrytes([TEXT_KEYS.home]);m.run(100_000);expect(m.peek(2504)).toBe(11);expect(m.stackHighWater).toBeLessThan(243);}};
}
test('Robots resolves simultaneous scrap, finite safe teleport, invalid steps and a complete escape',()=>{
 const f=fixture(0);f.play(63);expect(f.model.moves).toBe(0);f.letter('n');expect(f.model.board.split('R').length-1).toBe(6);f.letter('t');const turn=f.model.moves;f.letter('T');expect(f.model.moves).toBe(turn);expect(f.screen()).toContain('Teleport already used');
 f.reset();for(const square of robotsSolution())if(square===64)f.letter('t');else f.play(square);expect(f.model.status).toBe(1);expect(f.screen()).toContain('All robots became scrap!');f.play(0);f.letter('n');f.reset();for(let i=0;i<8&&!f.model.status;i++)f.letter('n');expect(f.model.status).toBe(2);
 f.reset();let seed=241;for(let i=0;i<256;i++){if(i%32===0)f.reset();seed=seed*48271%2147483647;if(i%9===0)f.letter('t');else if(i%5===0)f.letter('n');else f.play(seed%64);}f.exit();
},60_000);
test('Snake rejects reversals, grows, crashes, permits vacating tails and fills the full board',()=>{
 const f=fixture(1);f.letter('a');expect(f.screen()).toContain('Cannot reverse');f.letter('w');f.letter('a');expect(f.screen()).toContain('Cannot reverse');f.letter('d');f.letter('n');f.letter('n');expect((f.model as ReturnType<typeof snakeReference>).body.length).toBe(4);for(let i=0;i<8&&!f.model.status;i++)f.letter('n');expect(f.model.status).toBe(2);f.letter('w');f.play(0);
 const inject=(body:number[],direction:number,fruit:number)=>{f.reset();const cells:Record<number,number>={3200:body.length,3201:direction,3202:direction,3203:body.length-3,3204:fruit};body.forEach((p,i)=>cells[3300+i]=p);f.inject(snakeReference({body,direction,fruit}),cells,'wdsa'[direction]!);};
 inject([9,8,16,17],2,63);f.letter('n');expect(f.model.status).toBe(0);expect((f.model as ReturnType<typeof snakeReference>).body).toEqual([17,9,8,16]);
 inject([9,8,16,17],3,63);f.letter('n');expect(f.model.status).toBe(2);
 // Follow a Hamiltonian circuit from the ordinary starting position: all fruit
 // and every growth operation are handled by the guest until 64 cells fill.
 f.reset();const cycle=[0];for(let r=0;r<8;r++)for(let j=0;j<7;j++)cycle.push(r*8+(r%2?7-j:1+j));for(let r=7;r>0;r--)cycle.push(r*8);cycle.reverse();
 for(let tick=0;tick<4096&&!f.model.status;tick++){const model=f.model as ReturnType<typeof snakeReference>,head=model.body[0]!,next=cycle[(cycle.indexOf(head)+1)%64]!,delta=next-head,heading=delta===-8?'w':delta===1?'d':delta===8?'s':'a';f.letter(heading);f.letter('n');}
 expect(f.model.status).toBe(1);expect(f.screen()).toContain('All 64 squares filled!');f.letter('n');f.reset();let seed=242;for(let i=0;i<256;i++){if(i%32===0)f.reset();seed=seed*48271%2147483647;f.letter('wdsa'[seed%4]!);f.letter('n');}f.exit();
},120_000);
test('Morris implements protected mills, flying, blocked losses, draws and complete two-player games',()=>{
 const f=fixture(2),point=(p:number)=>f.play(MORRIS_CELLS[p]!);
 const setup=(a:number[],b:number[],placed=[9,9],quiet=0,turn=1)=>{f.reset();const pieces=Array<number>(24).fill(0);a.forEach(p=>pieces[p]=1);b.forEach(p=>pieces[p]=2);const cells:Record<number,number>={3200:turn,3201:placed[0]!,3202:placed[1]!,3203:a.length,3204:b.length,3205:-1,3206:0,3207:quiet};pieces.forEach((p,i)=>cells[3300+i]=p);f.inject(morrisReference({pieces,placed,turn,quiet}),cells,undefined,MORRIS_CELLS[(turn===1?a:b)[0]!]!);};
 f.play(24);expect(f.model.moves).toBe(0);setup([0,1],[3,4,5,6],[2,4]);point(2);expect((f.model as ReturnType<typeof morrisReference>).pendingRemoval).toBe(true);point(3);expect(f.screen()).toContain('Remove outside a mill first');point(6);expect((f.model as ReturnType<typeof morrisReference>).pendingRemoval).toBe(false);
 setup([0,1],[3,4,5],[2,3]);point(2);point(3);expect((f.model as ReturnType<typeof morrisReference>).pendingRemoval).toBe(false);
 setup([4,5,6],[0,1,3],[9,9],0,2);point(3);point(2);point(4);expect(f.model.status).toBe(2);
 setup([0,1,9],[3,4,5,6]);point(0);point(23);expect(f.model.moves).toBe(1);setup([0,1,9,21],[3,4,5,6]);point(0);point(23);expect(f.model.moves).toBe(0);expect(f.screen()).toContain('Move along one board edge');
 setup([0,1,3],[4,5,6]);point(3);point(2);point(4);expect(f.model.status).toBe(1);point(10);
 setup([1,10,14,22],[0,2,21,23]);point(10);point(9);expect(f.model.status).toBe(1);
 setup([0,3,6,9],[2,5,8,14],[9,9],49);point(3);point(4);expect(f.model.status).toBe(3);
 for(const seed0 of[31,75]){f.reset();let seed=seed0;for(let i=0;i<900&&!f.model.status;i++){const options=(f.model as ReturnType<typeof morrisReference>).options();expect(options.length).toBeGreaterThan(0);seed=seed*48271%2147483647;for(const p of options[seed%options.length]!)point(p);}expect(f.model.status).not.toBe(0);}
 f.reset();let seed=243;for(let i=0;i<256;i++){seed=seed*48271%2147483647;f.play(seed%49);}f.exit();
},120_000);
test('Bowling models direct and secondary pinfall, aim/spin, rack scoring and full good/bad games',()=>{
 const f=fixture(3);f.play(0);expect(f.model.moves).toBe(0);expect(f.screen()).toContain('Bottom:aim');
 for(let aim=0;aim<7;aim++)for(const spin of[-1,0,1]){f.reset();f.play(42+aim);f.play(spin<0?35:spin>0?41:38);f.letter('n');f.letter('n');expect((f.model as ReturnType<typeof bowlingReference>).frame).toBe(2);}
 // Brute-force an independent best two-ball plan for each known lane drift.
 const actions:{aim:number;spin:number}[]=[];for(let frame=0;frame<5;frame++){let best=-1,bestPair:{aim:number;spin:number}[]=[];for(let a=0;a<21;a++)for(let b=0;b<21;b++){const pair=[a,b].map(v=>({aim:Math.floor(v/3),spin:v%3-1})),m=bowlingReference();for(const shot of [...actions,...pair]){m.play(42+shot.aim);m.play(shot.spin<0?35:shot.spin>0?41:38);m.step();}if(m.score>best){best=m.score;bestPair=pair;}}actions.push(...bestPair);}
 f.reset();for(const shot of actions){f.play(42+shot.aim);f.play(shot.spin<0?35:shot.spin>0?41:38);f.letter('n');}expect(f.model.status).toBe(1);expect(f.screen()).toContain('Win! score:');for(let i=0;i<49;i++)f.play(i);f.letter('n');
 f.reset();f.play(42);f.play(35);for(let i=0;i<10;i++)f.letter('n');expect(f.model.status).toBe(2);expect(f.screen()).toContain('End: score:');f.reset();let seed=244;for(let i=0;i<256;i++){if(i%64===0)f.reset();seed=seed*48271%2147483647;if(i%4===0)f.letter('n');else f.play(seed%49);}f.exit();
},60_000);
