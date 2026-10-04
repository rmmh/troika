import type { BoardReference } from './simulationSoftwareReference';
const three=(n:number)=>String(Math.abs(n)).padStart(3,'0');
export function basicGamesReference(id:string):BoardReference|undefined {
 if(!['fuel-landing','cannon-range','hurkle-hunt','twenty-one'].includes(id))return;
 let moves=0,status=0,height=40,speed=0,fuel=30,burn=0,x=3,y=3,distance=0;
 const cells=Array<string>(64).fill('?'),player=[7,5],dealer=[10,6],shoe=[9,2,11,5,10,3,8,4];let drawn=0,revealed=false;
 const total=(cards:number[])=>{let sum=cards.reduce((a,b)=>a+b,0),aces=cards.filter(v=>v===11).length;while(sum>21&&aces-->0)sum-=10;return sum;};
 const cards=(hand:number[])=>hand.map(v=>v===11?'A':v===10?'T':String(v)).join('').padEnd(7,'.');
 return {
 get board(){
 if(id==='fuel-landing')return `H${three(height)}${speed<0?'-':'V'}${three(speed)}F${three(fuel)}B${three(burn)}..01234.`;
 if(id==='cannon-range'){const trace=Array<string>(8).fill('.');if(moves)trace[Math.min(7,Math.floor(distance/12))]=distance>=96?'+':'*';return `X${three(x)}Y${three(y)}D${three(distance)}T084${trace.join('')}`;}
 if(id==='hurkle-hunt')return cells.join('');
 return `P${cards(player)}D${revealed?cards(dealer):`${cards(dealer)[0]}?.....`}1234DEALP${three(total(player))}D${revealed?three(total(dealer)):'???'}`;
 },get moves(){return moves;},get status(){return status;},
 play(square:number){if(status)return;
 if(id==='fuel-landing'){if(square>=18&&square<=22)burn=square-18;return;}
 if(id==='cannon-range'){if(square<4)x=x%9+1;else if(square<8)y=y%9+1;return;}
 if(id==='hurkle-hunt'){if(cells[square]!=='?')return;cells[square]='.';moves++;if(square===21){cells[21]='H';status=1;}else if(moves===6){cells[21]='H';status=2;}return;}
 if(!moves&&square>=16&&square<=19){const deals=[[7,5,10,6,0],[11,7,9,7,1],[10,6,10,7,2],[9,9,10,9,3]],deal=deals[square-16]!;player.splice(0,2,deal[0]!,deal[1]!);dealer.splice(0,2,deal[2]!,deal[3]!);drawn=deal[4]!;return;}player.push(shoe[drawn++]!);moves++;if(total(player)>21)status=2;
 },
 step(){if(status)return;
 if(id==='fuel-landing'){const actual=Math.min(fuel,burn);fuel-=actual;speed+=2-actual;height-=speed;moves++;if(height<=0){height=0;status=speed<=3?1:2;}return;}
 if(id==='cannon-range'){distance=2*x*y;moves++;if(distance===84)status=1;else if(moves===6)status=2;return;}
 if(id==='twenty-one'){revealed=true;while(total(dealer)<17)dealer.push(shoe[drawn++]!);moves++;status=total(dealer)>21||total(player)>total(dealer)?1:total(player)===total(dealer)?3:2;}
 },
 };
}
