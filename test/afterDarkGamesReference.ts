import type {BoardReference} from './simulationSoftwareReference';
export const AFTERNOON_SOLUTION=['examine note','go north','examine coat','take key','go south','use key drawer','take wick','go east','take oil','combine wick oil','use lamp stairs','go north','use key clock','take afternoon','go south','go west','give afternoon clerk'];
export function afternoonReference(){
 let room=0,coat=false,key=false,drawer=false,wick=0,oil=0,lamp=false,stairs=false,clock=false,afternoon=0;
 return {get record(){return 'R'+[room,+coat,+key,+drawer,wick,oil,+lamp,+stairs,+clock,afternoon].join('');},get room(){return ['Counter','Cloakroom','Courtyard','Clock Room'][room]!;},get won(){return afternoon===2;},get inventory(){return ['key','wick','oil','lamp','afternoon'].filter((_,i)=>[+key,wick,oil,+lamp,afternoon][i]===1);},command(input:string){
 const command=input.trim().toLowerCase().replace(/ +/g,' ');
 if(command==='new'){room=0;coat=key=drawer=lamp=stairs=clock=false;wick=oil=afternoon=0;return true;}
 if(['look','inventory','help','examine note','examine drawer','examine stairs','examine clock','examine clerk'].includes(command))return true;
 const direction=command.replace(/^go /,'');if(['north','south','east','west'].includes(direction)){
 if(afternoon===2)return true;
 if(room===0&&direction==='north')room=1;else if(room===0&&direction==='east')room=2;else if(room===1&&direction==='south')room=0;else if(room===2&&direction==='west')room=0;else if(room===2&&direction==='north'&&stairs)room=3;else if(room===3&&direction==='south')room=2;return true;
 }
 if(command==='examine coat'){if(room===1)coat=true;return true;}
 if(command==='take key'){if(room===1&&coat)key=true;return true;}
 if(command==='use key drawer'){if(room===0&&key)drawer=true;return true;}
 if(command==='take wick'){if(room===0&&drawer&&wick===0)wick=1;return true;}
 if(command==='take oil'){if(room===2&&oil===0)oil=1;return true;}
 if(command==='combine wick oil'||command==='combine oil wick'){if(wick===1&&oil===1){wick=oil=2;lamp=true;}return true;}
 if(command==='use lamp stairs'){if(room===2&&lamp)stairs=true;return true;}
 if(command==='use key clock'){if(room===3&&key)clock=true;return true;}
 if(command==='take afternoon'){if(room===3&&clock&&afternoon===0)afternoon=1;return true;}
 if(command==='give afternoon clerk'){if(room===0&&afternoon===1)afternoon=2;return true;}
 return false;
 }};
}
export const DINNER_CELLS=[2,4,14,24,22,20,10,0];
export const DINNER_TARGET=[0,1,2,4,6,3,7,5];
export function dinnerConflict(seating:readonly number[]):number {
 const distance=(a:number,b:number)=>{const d=Math.abs(seating.indexOf(a)-seating.indexOf(b));return Math.min(d,8-d);};
 return [distance(0,1)!==1,distance(2,7)!==4,distance(3,4)===1,distance(5,0)!==1||distance(5,7)!==1,distance(1,3)!==4,distance(4,6)!==1].findIndex(Boolean);
}
export function afterDarkGamesReference(id:string):BoardReference|undefined {
 if(id!=='dinner-seating')return;const seats=Array.from({length:8},(_,i)=>i);let selected=-1,moves=0,status=0;
 return {get board(){const b=Array<string>(25).fill('.');b[12]='T';seats.forEach((guest,i)=>{b[DINNER_CELLS[i]!]=String.fromCharCode((selected===i?97:65)+guest);});return b.join('');},get moves(){return moves;},get status(){return status;},play(square:number){if(status)return;const seat=DINNER_CELLS.indexOf(square);if(seat<0)return;if(selected<0){selected=seat;return;}if(selected!==seat){[seats[selected],seats[seat]]=[seats[seat]!,seats[selected]!];moves++;}selected=-1;},step(){if(!status&&dinnerConflict(seats)<0)status=1;}};
}
