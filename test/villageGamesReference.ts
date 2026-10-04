import type {BoardReference} from './simulationSoftwareReference';
export const JUG_SOLUTION=[0,8,8,16,16,0,8,16,0,8,8,16,16,0];
export const BOX_SOLUTION=[[4],[7],[0,3,6],[1,5],[8],[2]];
export const BADGE_SOLUTION=[0,9,1,11,2,8,3,10,4,12,5,15,6,14,7,13];
export const PANCAKE_SOLUTION=(()=>{const a=[3,6,1,5,2,4],out:number[]=[];const flip=(i:number)=>{if(!i)return;out.push(i*7);a.splice(0,i+1,...a.slice(0,i+1).reverse());};for(let n=6;n>1;n--){const i=a.indexOf(n);if(i===n-1)continue;flip(i);flip(n-1);}return out;})();
export function villageGamesReference(id:string):BoardReference|undefined {
 if(!['pancake-stack','three-jugs','shut-the-box','badge-pairs'].includes(id))return;
 let moves=0,status=0,source=-1,seed=17,first=-1,second=-1,matches=0;
 const pancakes=[3,6,1,5,2,4],jugs=[8,0,0],caps=[8,5,3],tiles=Array.from({length:9},(_,i)=>i+1),chosen=new Set<number>(),cards=Array<string>(16).fill('?'),layout='ACBDEFGHBADCEHGF';
 const die=()=>{seed=(seed*5+1)%97;return seed%6+1;};let dice=[die(),die()];
 return {get board(){
 if(id==='pancake-stack')return pancakes.map(n=>'.'.repeat(Math.floor((7-n)/2))+String(n).repeat(n)+'.'.repeat(Math.ceil((7-n)/2))).join('');
 if(id==='three-jugs')return jugs.map((n,i)=>`${source===i?'abc'[i]:'ABC'[i]}${caps[i]}:${n}....`).join('')+'GOAL4+4.';
 if(id==='shut-the-box')return tiles.map((n,i)=>!n?'.':chosen.has(i)?String.fromCharCode(97+i):String(n)).join('')+`D${dice.join('')}S${String([...chosen].reduce((a,i)=>a+i+1,0)).padStart(2,'0')}`;
 return cards.join('');
 },get moves(){return moves;},get status(){return status;},play(square:number){if(status)return;
 if(id==='pancake-stack'){const row=Math.floor(square/7);if(!row)return;pancakes.splice(0,row+1,...pancakes.slice(0,row+1).reverse());moves++;if(pancakes.every((n,i)=>n===i+1))status=1;return;}
 if(id==='three-jugs'){const jug=Math.floor(square/8);if(jug>=3)return;if(source<0){if(jugs[jug])source=jug;return;}if(source===jug){source=-1;return;}const amount=Math.min(jugs[source]!,caps[jug]!-jugs[jug]!);if(!amount)return;jugs[source]!-=amount;jugs[jug]!+=amount;moves++;source=-1;if(jugs[0]===4&&jugs[1]===4)status=1;return;}
 if(id==='shut-the-box'){if(square>=9||!tiles[square])return;if(chosen.has(square))chosen.delete(square);else chosen.add(square);return;}
 if(cards[square]!=='?')return;if(second>=0){cards[first]='?';cards[second]='?';first=second=-1;}cards[square]=layout[square]!;if(first<0){first=square;return;}moves++;if(cards[first]===cards[square]){first=second=-1;matches++;if(matches===8)status=1;}else second=square;
 },step(){if(status||id!=='shut-the-box')return;const sum=[...chosen].reduce((a,i)=>a+i+1,0);if(sum!==dice[0]!+dice[1]!)return;for(const i of chosen)tiles[i]=0;chosen.clear();moves++;if(tiles.every(n=>!n)){status=1;return;}dice=[die(),die()];const target=dice[0]!+dice[1]!;let possible=false;for(let mask=1;mask<512;mask++){let sum=0,valid=true;for(let i=0;i<9;i++)if(mask>>i&1){if(!tiles[i]){valid=false;break;}sum+=tiles[i]!;}if(valid&&sum===target){possible=true;break;}}if(!possible)status=2;}};
}
