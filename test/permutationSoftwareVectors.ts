import type { TextSoftware } from '../src/world/software/native';
const arrangements=(s:string):string[]=>s.length ? [...new Set([...s].flatMap((c,i)=>arrangements(s.slice(0,i)+s.slice(i+1)).map(t=>c+t)))].sort() : [''];
export function permutationSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['next-permutation','permutation-rank','permutation-at'].includes(app.id))return [];
  const cases:TextSoftware['examples']=[];
  for(let n=1;n<=7;n++) {
    const all=arrangements('0123456'.slice(0,n));
    for(let rank=0;rank<all.length;rank++) {
      if(n>5&&rank%47!==0&&rank!==all.length-1)continue;
      const text=all[rank]!;
      if(app.id==='next-permutation')cases.push({input:text,output:all[rank+1]??'NONE'});
      if(app.id==='permutation-rank')cases.push({input:text,output:String(rank)});
      if(app.id==='permutation-at')cases.push({input:n+' '+rank,output:text});
    }
  }
  if(app.id==='next-permutation') {
    for(const bag of ['aabb','Aa !','   a','aaaa']) {const all=arrangements(bag);all.forEach((input,i)=>cases.push({input,output:all[i+1]??'NONE'}));}
    cases.push({input:'a'.repeat(53)+'b',output:'a'.repeat(52)+'ba'},{input:'b'+'a'.repeat(53),output:'NONE'},{input:'',output:'NONE'});
  } else {
    const invalid=app.id==='permutation-rank'?['','00','02','01234567','-1','0 1','a','123','012340','01!']:['','1','1 ','0 0','8 0','3 6','7 5040','7 99999','7 -1','7 +1',' 3 0','3 0 ','3  0','3 a','30 0'];
    for(const input of invalid)cases.push({input,error:true});
    if(app.id==='permutation-at')cases.push({input:'3 000005',output:'210'},{input:'1 '+'0'.repeat(52),output:'0'});
  }
  return cases;
}
