import type { TextSoftware } from '../src/world/software/native';

type Example=TextSoftware['examples'][number];
function stackReference(input:string):Example {
  const stack:number[]=[];
  for(const token of input.trim().split(/ +/).filter(Boolean)) {
    if(/^[+-]?\d+$/.test(token)) stack.push(Number(token));
    else if(token==='d') {if(!stack.length)return {input,error:true};stack.push(stack.at(-1)!);}
    else if(token==='s') {if(stack.length<2)return {input,error:true};const b=stack.pop()!,a=stack.pop()!;stack.push(b,a);}
    else if(token==='x') {if(!stack.length)return {input,error:true};stack.pop();}
    else if(token==='n') {if(!stack.length)return {input,error:true};stack.push(-stack.pop()!);}
    else {
      if(stack.length<2||!['+','-','*','/','%'].includes(token))return {input,error:true};
      const b=stack.pop()!,a=stack.pop()!;
      if((token==='/'||token==='%')&&b===0)return {input,error:true};
      stack.push(token==='+'?a+b:token==='-'?a-b:token==='*'?a*b:token==='/'?Math.trunc(a/b):a%b);
    }
    if(stack.length>27 || stack.some(v=>!Number.isInteger(v)||Math.abs(v)>9841))return {input,error:true};
  }
  return stack.length===1 ? {input,output:String(stack[0])} : {input,error:true};
}

function tapeReference(input:string):Example {
  const stack:number[]=[],pairs=new Map<number,number>();
  for(let i=0;i<input.length;i++) {
    if(input[i]==='[')stack.push(i);
    if(input[i]===']') {const open=stack.pop();if(open===undefined)return {input,error:true};pairs.set(open,i);pairs.set(i,open);}
  }
  if(stack.length)return {input,error:true};
  const tape=Array<number>(27).fill(0),out:number[]=[];let pc=0,ptr=0,steps=0;
  const stopped=(reason:string):Example=>({input,output:`${reason} pc=${pc} ptr=${ptr} cell=${tape[ptr]}`});
  while(pc<input.length) {
    if(steps++===2048)return stopped('LIMIT');
    switch(input[pc]) {
      case '+':tape[ptr]=(tape[ptr]!+1)%256;break;
      case '-':tape[ptr]=(tape[ptr]!+255)%256;break;
      case '>':ptr=(ptr+1)%27;break;
      case '<':ptr=(ptr+26)%27;break;
      case ',':tape[ptr]=0;break;
      case '.':if(out.length===32)return stopped('OUTPUT LIMIT');out.push(tape[ptr]!);break;
      case '[':if(tape[ptr]===0)pc=pairs.get(pc)!;break;
      case ']':if(tape[ptr]!==0)pc=pairs.get(pc)!;break;
    }
    pc++;
  }
  return {input,output:out.map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(' ')};
}

export function programmingSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(app.id==='stack-calc') {
    const inputs=['',' ','d','s','x','n','1 +','1 2 3','1 2 ^','+9841','-9841 n','9842','-9842','1.0','+1 -2 +','3 4 d * +','1 2 s x','1 2 3 s x +','00001','1'.repeat(54),'1 '.repeat(27),'1 '.repeat(26)+'d'];
    for(const a of [-9841,-99,-1,0,1,99,9841]) for(const b of [-99,-1,0,1,99]) for(const op of ['+','-','*','/','%'])inputs.push(`${a} ${b} ${op}`);
    return inputs.map(stackReference);
  }
  if(app.id==='tape-lab') {
    const inputs=['++[>+++[>++<-]<-]>>.','-[-].','-[+].','<'.repeat(27)+'+.','>'.repeat(27)+'+.','.>'.repeat(27),'.'.repeat(54),'['.repeat(27)+']'.repeat(27),'abc + hello .','comment only','+[>+<]','+[]','+[.]','[]]','[[[]]','['.repeat(54),'+'.repeat(54),'[[]]','.'];
    for(let n=0;n<8;n++) for(const stride of [1,3,5])inputs.push('+'.repeat(n)+'[>'+'+'.repeat(stride)+'<-]>.');
    let seed=17;
    for(let row=0;row<32;row++) {let program='';for(let i=0;i<54;i++){seed=(seed*48271)%2147483647;program+='+-<>., abc'[seed%9];}inputs.push(program);}
    return inputs.map(tapeReference);
  }
  return [];
}
