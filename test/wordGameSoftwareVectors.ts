import type { TextSoftware } from '../src/world/software/native';
import { WORD_LEXICON } from '../src/world/software/wordGames';
const adjacent=(a:string,b:string)=>[...a].filter((c,i)=>c!==b[i]).length===1;
export function wordGameSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='word-ladder') {
    // All-pairs distances, then greedy lexicographic shortest-path recovery;
    // this does not share the guest's queue or discovery-parent representation.
    const distance=WORD_LEXICON.map((a,i)=>WORD_LEXICON.map((b,j)=>i===j?0:adjacent(a,b)?1:Infinity));
    for(let k=0;k<27;k++)for(let i=0;i<27;i++)for(let j=0;j<27;j++)distance[i]![j]=Math.min(distance[i]![j]!,distance[i]![k]!+distance[k]![j]!);
    for(let from=0;from<27;from++)for(let to=0;to<27;to++) {
      let output='NONE';if(Number.isFinite(distance[from]![to])) {
        const path=[from];while(path.at(-1)!==to){const current=path.at(-1)!;const next=WORD_LEXICON.findIndex((word,i)=>adjacent(WORD_LEXICON[current]!,word)&&distance[i]![to]===distance[current]![to]!-1);if(next<0)throw new Error('Missing ladder');path.push(next);}
        output=path.map(i=>WORD_LEXICON[i]).join(' > ');
      }
      cases.push({input:WORD_LEXICON[from]+'|'+WORD_LEXICON[to],output});
    }
    cases.push({input:'CaT|DOG',output:'cat > cot > cog > dog'});
    for(const input of ['', 'cat','cat|dogs','cat/dog','ca!|dog','cat|d?g','cat||og','zzz|cat','cat|zzz'])cases.push({input,error:true});
  }
  if(app.id==='letter-rack') {
    const canMake=(word:string,rack:string):boolean=>!word.length||[...rack].some((tile,i)=>(tile===word[0]||tile==='?')&&canMake(word.slice(1),rack.slice(0,i)+rack.slice(i+1)));
    const add=(input:string)=>cases.push({input,output:WORD_LEXICON.filter(word=>canMake(word,input.toLowerCase())).join(' ')||'NONE'});
    for(const word of WORD_LEXICON){add(word);add(word.toUpperCase());add(word.slice(0,2)+'?');}
    for(let n=3;n<=4;n++)for(let code=0;code<4**n;code++){let digits=code;add(Array.from({length:n},()=>{const c='al?t'[digits%4]!;digits=Math.floor(digits/4);return c;}).join(''));}
    for(const input of ['????????','catdog??','allEeL??','too?????','zzzzzzzz','AlL','ee?','t?o'])add(input);
    for(const input of ['', 'a','ab','abcdefghi','a!?','a b','123','ca|'])cases.push({input,error:true});
  }
  return cases;
}
