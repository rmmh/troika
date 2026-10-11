import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';

// Compare only extraction of canonical CPU words. No production decoder changes.
// Each kernel gets its own inlined loop: no polymorphic decoder calls or tuples
// allocated per word. All three outputs contribute to independent checksums.
const count = 19683, bias = 9841;
const interleaved = new Int8Array(count * 3);
const ops = new Int8Array(count), highs = new Int8Array(count), lows = new Int8Array(count);
const packed = new Uint16Array(count);
for (let op = -13; op <= 13; op++) for (let hi = -13; hi <= 13; hi++) for (let lo = -13; lo <= 13; lo++) {
  const i = op * 729 + hi * 27 + lo + bias;
  interleaved.set([op, hi, lo], i * 3);
  ops[i] = op; highs[i] = hi; lows[i] = lo;
  packed[i] = ((op + 13) << 10) | ((hi + 13) << 5) | (lo + 13);
}

// Find exact reciprocal/shift pairs for this bounded unsigned domain, rather
// than assuming a general-purpose magic divider also works with JS imul.
function reciprocal(divisor) {
  for (let shift = 1; shift <= 31; shift++) {
    const multiplier = Math.ceil(2 ** shift / divisor);
    if ((count - 1) * multiplier >= 2 ** 32) continue;
    let exact = true;
    for (let n = 0; n < count; n++) if ((Math.imul(n, multiplier) >>> shift) !== Math.floor(n / divisor)) { exact = false; break; }
    if (exact) return {multiplier, shift};
  }
  throw Error(`No bounded reciprocal for ${divisor}`);
}
const d27 = reciprocal(27), d729 = reciprocal(729);
const q27 = `Math.imul(u, ${d27.multiplier}) >>> ${d27.shift}`;
const q729 = `Math.imul(u, ${d729.multiplier}) >>> ${d729.shift}`;
const candidates = [
  {name: 'interleaved table', bytes: interleaved.byteLength,
    code: 'const i=(word+9841)*3; const op=interleaved[i], hi=interleaved[i+1], lo=interleaved[i+2];',
    op: 'const op=interleaved[(word+9841)*3];'},
  {name: 'separate tables', bytes: ops.byteLength + highs.byteLength + lows.byteLength, opBytes: ops.byteLength,
    code: 'const i=word+9841; const op=ops[i], hi=highs[i], lo=lows[i];',
    op: 'const op=ops[word+9841];'},
  {name: 'packed 15-bit table', bytes: packed.byteLength,
    code: 'const p=packed[word+9841]; const op=(p>>>10)-13, hi=((p>>>5)&31)-13, lo=(p&31)-13;',
    op: 'const op=(packed[word+9841]>>>10)-13;'},
  {name: 'division/remainder', bytes: 0,
    code: 'let u=word+9841; const l=u%27; u=(u-l)/27; const m=u%27; const op=(u-m)/27-13, hi=m-13, lo=l-13;',
    op: 'const op=Math.floor((word+9841)/729)-13;'},
  {name: 'floor constant division', bytes: 0,
    code: 'const u=word+9841, q=Math.floor(u/27), h=Math.floor(u/729); const op=h-13, hi=q-h*27-13, lo=u-q*27-13;',
    op: 'const op=Math.floor((word+9841)/729)-13;'},
  {name: 'truncate constant division', bytes: 0,
    code: 'const u=word+9841, q=(u/27)|0, h=(u/729)|0; const op=h-13, hi=q-h*27-13, lo=u-q*27-13;',
    op: 'const op=(((word+9841)/729)|0)-13;'},
  {name: 'floating reciprocal', bytes: 0,
    code: 'const u=word+9841, q=(u*(1/27))|0, h=(u*(1/729))|0; const op=h-13, hi=q-h*27-13, lo=u-q*27-13;',
    op: 'const op=(((word+9841)*(1/729))|0)-13;'},
  {name: 'integer reciprocal + shift', bytes: 0,
    code: `const u=word+9841, q=${q27}, h=${q729}; const op=h-13, hi=q-h*27-13, lo=u-q*27-13;`,
    op: `const u=word+9841; const op=(${q729})-13;`},
];
const tables = {interleaved, ops, highs, lows, packed};
function compile(code, tail) {
  return new Function('tables', `const {interleaved,ops,highs,lows,packed}=tables; return ${tail(code)};`)(tables);
}
const valid = candidates.filter(candidate => {
  const decode = compile(candidate.code, code => `word => {${code} return [op,hi,lo];}`);
  const opcode = compile(candidate.op, code => `word => {${code} return op;}`);
  for (let i = 0; i < count; i++) {
    const got = decode(i - bias);
    if (got[0] !== ops[i] || got[1] !== highs[i] || got[2] !== lows[i] || opcode(i - bias) !== ops[i]) {
      console.log(`EXCLUDED ${candidate.name}: mismatch at tryte ${i - bias}: ${got}`);
      return false;
    }
  }
  return true;
});

let seed = 0x12345678;
function random(n) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; }
const ascending = Int16Array.from({length: count}, (_, i) => i - bias);
const shuffled = ascending.slice();
for (let i = shuffled.length - 1; i > 0; i--) { const j = random(i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
// A hot 64-word working set, not a claim to be a recorded guest trace.
const hotWords = Int16Array.from({length: 64}, () => random(count) - bias);
const hot = Int16Array.from({length: count}, (_, i) => hotWords[i % hotWords.length]);
const patterns = {ascending, shuffled, 'hot 64 words': hot};
const rounds = 9, passes = Math.ceil(8_000_000 / count), words = passes * count;
console.log(JSON.stringify({node: process.version, v8: process.versions.v8, cpu: cpus()[0]?.model,
  wordsPerSample: words, rounds, exactWordsCheckedPerMethod: count, reciprocal27: d27, reciprocal729: d729}));
const kernels = [];
for (const scope of ['three tribbles', 'opcode only']) for (const method of valid) {
  const code = scope === 'three tribbles' ? method.code : method.op;
  const sums = scope === 'three tribbles' ? 'a=(a+op)|0;b=(b+hi)|0;c=(c+lo)|0;' : 'a=(a+op)|0;';
  const run = compile(code, code => `function run(input,passes) {let a=0,b=0,c=0; for(let p=0;p<passes;p++) for(let cursor=0;cursor<input.length;cursor++){const word=input[cursor];${code}${sums}} return [a,b,c];}`);
  kernels.push({scope, method, run});
}
const results = [];
for (const [pattern, input] of Object.entries(patterns)) {
  const checksum = [0,0,0];
  for (const word of input) {const i=word+bias;checksum[0]+=ops[i];checksum[1]+=highs[i];checksum[2]+=lows[i];}
  const expected = checksum.map(sum => (sum * passes) | 0);
  const samples = new Map(kernels.map(kernel => [kernel, []]));
  for (const kernel of kernels) for (let warm = 0; warm < 3; warm++) kernel.run(input, 30);
  for (let round = 0; round < rounds; round++) {
    const order = [...kernels];
    for (let i=order.length-1;i>0;i--) {const j=random(i+1);[order[i],order[j]]=[order[j],order[i]];}
    for (const kernel of order) {
      const start = performance.now(), got = kernel.run(input, passes), elapsed = performance.now() - start;
      const wanted = kernel.scope === 'three tribbles' ? expected : [expected[0],0,0];
      if (got.some((value,i) => value !== wanted[i])) throw Error(`Checksum mismatch: ${kernel.method.name}`);
      samples.get(kernel).push(elapsed);
    }
  }
  for (const kernel of kernels) {
    const times = samples.get(kernel).sort((a,b) => a-b);
    results.push({pattern, scope: kernel.scope, method: kernel.method.name, tableBytes: kernel.scope === 'opcode only' ? (kernel.method.opBytes ?? kernel.method.bytes) : kernel.method.bytes,
      medianMs: +times[4].toFixed(2), nsPerWord: +(times[4]*1e6/words).toFixed(2),
      minMs: +times[0].toFixed(2), maxMs: +times[8].toFixed(2)});
  }
  console.table(results.filter(result => result.pattern === pattern));
}
console.log('RESULTS_JSON ' + JSON.stringify(results));
