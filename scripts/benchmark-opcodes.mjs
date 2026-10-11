import {build} from 'esbuild';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir, cpus} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';

// Compile variants in a temporary directory; never edit the production CPU.
const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(join(root, 'src/core/machine.ts'), 'utf8');
const directory = await mkdtemp(join(tmpdir(), 'troika-opcode-bench-'));
function replaceOnce(text, before, after) {
  if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw Error('CPU changed; update benchmark transform: ' + before);
  return text.replace(before, after);
}
const reciprocalDecode = `const u = this.fetch() + TRYTE_MAX;
    const q = Math.imul(u, 19419) >>> 19; // floor(u / 27)
    const h = Math.imul(u, 23015) >>> 24; // floor(u / 729)
    const op = h - 13;
    const hi = q - h * 27 - 13;
    const lo = u - q * 27 - 13;`;
function variant(zeroBased, extraction) {
  let result = source;
  if (zeroBased) result = replaceOnce(result, 'A = -13, B, C, D,', 'A = 0, B, C, D,');
  let setup = '', decode = reciprocalDecode;
  if (extraction === 'packed') {
    setup = `const instructionTribbles = new Uint16Array(MEM_SIZE);
for (let i=0;i<MEM_SIZE;i++) {const [op,hi,lo]=tribblesOf(i-TRYTE_MAX);instructionTribbles[i]=((op+13)<<10)|((hi+13)<<5)|(lo+13);}
`;
    decode = `const decoded = instructionTribbles[this.fetch() + TRYTE_MAX]!;
    const op = (decoded >>> 10)${zeroBased ? '' : ' - 13'};
    const hi = ((decoded >>> 5) & 31) - 13;
    const lo = (decoded & 31) - 13;`;
  } else if (extraction === 'interleaved') {
    setup = `const instructionTribbles = new Int8Array(MEM_SIZE * 3);
for (let i=0;i<MEM_SIZE;i++) {const fields=tribblesOf(i-TRYTE_MAX);${zeroBased ? 'fields[0]+=13;' : ''}instructionTribbles.set(fields,i*3);}
`;
    decode = `const decoded = (this.fetch() + TRYTE_MAX) * 3;
    const op = instructionTribbles[decoded]!;
    const hi = instructionTribbles[decoded + 1]!;
    const lo = instructionTribbles[decoded + 2]!;`;
  } else if (zeroBased) decode = replaceOnce(decode, 'const op = h - 13;', 'const op = h;');
  result = replaceOnce(result, reciprocalDecode, decode);
  return replaceOnce(result, '// Numeric opcode dispatch', setup + '// Numeric opcode dispatch');
}
async function compile(name, contents) {
  const outfile = join(directory, name + '.mjs');
  await build({stdin: {contents, loader: 'ts', resolveDir: join(root, 'src/core')}, outfile,
    bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  return import(pathToFileURL(outfile).href);
}
try {
  const variants = [];
  for (const extraction of ['interleaved', 'packed', 'reciprocal']) for (const zeroBased of [false, true]) {
    const name = `${extraction} ${zeroBased ? '0..26' : '-13..13'}`;
    variants.push({name, Machine: (await compile(name, variant(zeroBased, extraction))).Machine});
  }
  const {assemble} = await compile('assembler', `export {assemble} from ${JSON.stringify(join(root,'src/asm/assemble.ts'))};`);
  const machines = variants.map(v => new v.Machine());
  for (const seed of [0,1,2]) for (let word=-9841;word<=9841;word++) {
    for (const machine of machines) {
      machine.reset();
      for(let r=-13;r<=13;r++) machine.poke(r,seed===0?0:seed===1?r+14:13-r);
      machine.poke(3,1000);machine.poke(1000,word);
      for(let i=1;i<=4;i++)machine.poke(1000+i,seed===2?-i:i);
      machine.step();
    }
    const expected = machines[0].captureCpuState();
    for(let i=1;i<machines.length;i++)assert.deepEqual(machines[i].captureCpuState(),expected,`${variants[i].name}, word=${word}, seed=${seed}`);
  }
  console.log(JSON.stringify({node:process.version,v8:process.versions.v8,cpu:cpus()[0]?.model,
    equivalentCasesPerVariant:19683*3, rounds:9}));

  const programs = {
    'copy and predicates': '@500\nM A 1000\nM B 1100\nM C 27\nloop: R D A\nW B D\nI A 1\nI B 1\nI C -1\nN C Z\nJ loop\nM A 1000\nM B 1100\nM C 27\nJ loop',
    'arithmetic and branches': '@500\nloop: I A 1\nM B A\nP B 3\nS B 7\nQ B 2\nL A 999\nM A Z\nE B Z\nI C 1\nJ loop',
    'stack and calls': '@500\nM S 2000\nloop: C S work\nJ loop\nwork: U S A\nI A 1\nM B A\nO S A\nO S P',
  };
  const results=[];
  let orderSeed=1701;
  function shuffle(array) {for(let i=array.length-1;i>0;i--){orderSeed=(Math.imul(orderSeed,1664525)+1013904223)>>>0;const j=orderSeed%(i+1);[array[i],array[j]]=[array[j],array[i]];}return array;}
  for (const [program,text] of Object.entries(programs)) {
    const assembly=assemble(text);assert.deepEqual(assembly.diagnostics,[]);
    function make(Machine) {
      const m=new Machine();for(const chunk of assembly.chunks)chunk.data.forEach((v,i)=>m.poke(chunk.addr+i,v));
      m.poke(3,500);for(let i=0;i<27;i++)m.poke(1000+i,i);return m;
    }
    const expected=make(variants[0].Machine);expected.run(3_000_000);
    const reference=expected.captureCpuState();
    const samples=new Map(variants.map(v=>[v,[]]));
    for(let round=-2;round<9;round++)for(const v of shuffle([...variants])) {
      const m=make(v.Machine),start=performance.now();m.run(3_000_000);const elapsed=performance.now()-start;
      assert.deepEqual(m.captureCpuState(),reference,`${v.name}, ${program}`);
      if(round>=0)samples.get(v).push(elapsed);
    }
    for(const v of variants){const times=samples.get(v).sort((a,b)=>a-b);results.push({program,method:v.name,
      medianMs:+times[4].toFixed(2),minMs:+times[0].toFixed(2),maxMs:+times[8].toFixed(2)});}
  }
  console.table(results);console.log('RESULTS_JSON '+JSON.stringify(results));
} finally {await rm(directory,{recursive:true,force:true});}
