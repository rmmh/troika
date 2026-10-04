import { posix } from 'node:path';
import type { TextSoftware } from '../src/world/software/native';

/** Independent test-only references, never imported by the native world. */
export function writingSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='path-normalize') for(const input of ['///','//a///b//','/a/../../../../b','/a/..hidden/../x','/a b/../c d','/a/./b/./c','/'+'a/'.repeat(26),'/'+'a'.repeat(53),'/./../.../..','/A/a/../b']) {
    const normalized=posix.normalize(input); cases.push({input,output:normalized==='/' ? '/' : normalized.replace(/\/$/,'')});
  }
  const roman=(n:number)=>'M'.repeat(Math.floor(n/1000))+['','C','CC','CCC','CD','D','DC','DCC','DCCC','CM'][Math.floor(n/100)%10]+['','X','XX','XXX','XL','L','LX','LXX','LXXX','XC'][Math.floor(n/10)%10]+['','I','II','III','IV','V','VI','VII','VIII','IX'][n%10];
  const numbers=[1,2,3,4,5,8,9,10,14,19,39,40,49,50,89,90,99,100,399,400,499,500,899,900,999,1000,3888,3999,...Array.from({length:29},(_,i)=>i*137+1)];
  if(app.id==='roman-write') for(const n of numbers) cases.push({input:String(n),output:roman(n)});
  if(app.id==='roman-read') {
    for(const n of numbers) cases.push({input:n%2 ? roman(n).toLowerCase() : roman(n),output:String(n)});
    for(const input of ['IIV','IIX','IL','LC','DM','VV','DD','MMMM','MCMCM','XXC','X X','1','M'.repeat(54),'i'.repeat(54)]) cases.push({input,error:true});
  }
  const printable=Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).join('');
  if(app.id==='base64-encode') for(const input of [printable.slice(0,54),printable.slice(54),...Array.from({length:25},(_,i)=>printable.slice(i,i+i+1))]) cases.push({input,output:Buffer.from(input,'ascii').toString('base64')});
  if(app.id==='base64-decode') {
    const inputs=[...Array.from({length:39},(_,i)=>Buffer.from(printable.slice(i,i+i+1),'ascii').toString('base64')),
      ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map(c=>'T'+c+'=='),
      'TWE===','TQ== ',' TQ==','!!!!','====','T===','TW=E','TQ=A','TWFu=','fw==','gA==','Cg==','TWFuTQ=='];
    for(const input of inputs) {
      const decoded=Buffer.from(input,'base64');
      const valid=decoded.toString('base64')===input && decoded.every(c=>c>=32&&c<=126);
      cases.push(valid ? {input,output:decoded.toString('ascii')} : {input,error:true});
    }
  }
  if(app.id==='soundex') {
    const code=(c:string)=>['BFPV','CGJKQSXZ','DT','L','MN','R'].findIndex(group=>group.includes(c))+1;
    for(const input of ['Washington','Lee','Jackson','Gutierrez','OBrien','Honeyman','Knuth','Euler','Lloyd','Lukasiewicz','A'.repeat(54),'Robert!','a-b',...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].flatMap(c=>[c+'H'+c,c+'A'+c])]) {
      if(!/^[a-z]+$/i.test(input)) {cases.push({input,error:true});continue;}
      const s=input.toUpperCase(); let output=s[0]!,last=code(s[0]!);
      for(const c of s.slice(1)) {if('HW'.includes(c)) continue;const n=code(c);if(n&&n!==last) output+=n;last=n;}
      cases.push({input,output:output.slice(0,4).padEnd(4,'0')});
    }
  }
  if(app.id==='isbn-check') {
    for(let n=0;n<20;n++) {
      const digits=Array.from({length:9},(_,i)=>(n*(i+1)+i)%10);
      const sum=digits.reduce((sum,digit,i)=>sum+digit*(10-i),0),check=(11-sum%11)%11;
      const isbn=digits.join('')+(check===10?'X':check);
      cases.push({input:isbn,output:'VALID'},{input:isbn.slice(0,9)+(check+1)%10,output:'INVALID'});
      const body=(n%2?'978':'979')+digits.join('');
      const total=[...body].reduce((sum,c,i)=>sum+Number(c)*(i%2?3:1),0),end=(10-total%10)%10;
      cases.push({input:body+end,output:'VALID'},{input:body+(end+1)%10,output:'INVALID'});
    }
    for(const input of ['0306406152-',' 0 3 0 6 4 0 6 1 5 2 ','123','12345678901','12345678901234','978030640615X','030640615?']) cases.push({input,output:input.replace(/[ -]/g,'')==='0306406152'?'VALID':'INVALID'});
  }
  if(app.id==='pig-latin') for(const input of ['SMALL WEB','yellow sky','a e i o u','SCHool quiet','--','abc123','x '.repeat(27),'a'.repeat(54),'bbbbb','  space   ship  ','aeiou bcdfg']) {
    if(!/^[a-z ]*$/i.test(input)) {cases.push({input,error:true});continue;}
    const output=input.toLowerCase().split(/ +/).filter(Boolean).map(word=>{
      const first=word.search(/[aeiou]/);return first===0 ? word+'way' : first<0 ? word+'ay' : word.slice(first)+word.slice(0,first)+'ay';
    }).join(' ');cases.push({input,output});
  }
  return cases;
}
