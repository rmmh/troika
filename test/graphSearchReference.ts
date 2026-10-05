import type { TextSoftware } from '../src/world/software/native';
type Edge = readonly [number, number];
export function graphSearchReference(id: string, input: string): string | undefined {
  if (id === 'graph-twins') {
    if (!/^[1-6]\|(?:[0-5]{2})*\|(?:[0-5]{2})*$/.test(input) || input.length > 54) return;
    const [size, left, right] = input.split('|') as [string,string,string];
    const n = Number(size);
    const matrix = (s: string) => {
      const a = Array.from({length:n}, () => Array<boolean>(n).fill(false));
      for (let i = 0; i < s.length; i += 2) {
        const u = Number(s[i]), v = Number(s[i+1]);
        if (u >= n || v >= n) return;
        a[u]![v] = a[v]![u] = true;
      }
      return a;
    };
    const a = matrix(left), b = matrix(right);
    if (!a || !b) return;
    // Complete permutations with a full adjacency comparison at each leaf.
    function permute(p: number[]): number[] | undefined {
      if (p.length === n) return a!.every((row,u) => row.every((e,v) => e === b![p[u]!]![p[v]!])) ? p : undefined;
      for (let v = 0; v < n; v++) if (!p.includes(v)) {
        const found = permute([...p,v]);
        if (found) return found;
      }
    }
    const p = permute([]);
    return p ? 'ISOMORPHIC'.padEnd(27) + p.map((v,u) => `${u}>${v}`).join(' ') : 'NO ISOMORPHISM';
  }
  if (!/^[1-7]\|(?:[0-6]{2}){0,26}$/.test(input)) return;
  const n = Number(input[0]), edges: Edge[] = [];
  for (let i = 2; i < input.length; i += 2) {
    const u = Number(input[i]), v = Number(input[i + 1]);
    if (u >= n || v >= n) return;
    edges.push([u, v]);
  }
  if (id === 'hamilton-paths') {
    // Subset dynamic programming, independent of the guest's depth-first enumeration.
    const adjacency = Array.from({length:n}, (_, u) => new Set(edges.filter(e => e[0] === u).map(e => e[1])));
    const full = (1 << n) - 1, memo = new Map<string, number>();
    const count = (mask: number, v: number): number => {
      if (mask === full) return 1;
      const key = `${mask}:${v}`;
      if (memo.has(key)) return memo.get(key)!;
      let result = 0;
      for (const w of adjacency[v]!) if (!(mask & (1 << w))) result += count(mask | (1 << w), w);
      memo.set(key, result);
      return result;
    };
    let total = 0;
    for (let v = 0; v < n; v++) total += count(1 << v, v);
    if (!total) return 'paths=0'.padEnd(27) + 'first: NONE';
    const path: number[] = [];
    let mask = 0;
    while (mask !== full) for (let v = 0; v < n; v++) {
      if (mask & (1 << v) || path.length && !adjacency[path[path.length - 1]!]!.has(v)) continue;
      if (!count(mask | (1 << v), v)) continue;
      path.push(v); mask |= 1 << v; break;
    }
    return `paths=${total}`.padEnd(27) + `first: ${path.join('')}`;
  }
  if (id === 'vertex-cover') {
    // Lexicographic combinations by cardinality, rather than the guest's binary counter.
    function choose(k: number, start = 0, selected: number[] = []): number[] | undefined {
      if (!k) return edges.every(([u,v]) => selected.includes(u) || selected.includes(v)) ? selected : undefined;
      for (let v = start; v <= n - k; v++) {
        const result = choose(k - 1, v + 1, [...selected, v]);
        if (result) return result;
      }
    }
    for (let k = 0; k <= n; k++) {
      const result = choose(k);
      if (result) return `minimum=${k}`.padEnd(27) + `vertices: ${result.join(' ') || 'NONE'}`;
    }
  }
}
export function graphSearchVectors(app: TextSoftware): TextSoftware['examples'] {
  if (app.id === 'graph-twins') {
    const inputs = ['6||', '6|011220344553|011223344550', '3|000112|112002', '2|0101|10', '1|00|', '1||00'];
    let seed = 12341;
    const rnd = (n:number) => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
    for (let t=0;t<100;t++) {
      const n=1+rnd(6), p=Array.from({length:n},(_,i)=>i);
      for(let i=n-1;i>0;i--){const j=rnd(i+1);[p[i],p[j]]=[p[j]!,p[i]!];}
      let a='',b='';
      for(let u=0;u<n;u++)for(let v=u;v<n;v++)if(rnd(3)===0&&a.length<24){a+=`${u}${v}`;b+=`${p[u]}${p[v]}`;}
      inputs.push(`${n}|${a}|${b}`);
      const cut=b.length ? b.slice(2) : '00';
      inputs.push(`${n}|${a}|${cut}`);
    }
    inputs.push('', '0||', '7||', '3|01', '3|0|12', '3|||', '2|02|01', '2|01|02', '2|0x|01');
    return [...app.examples,...inputs.map(input=>{const output=graphSearchReference(app.id,input);return output===undefined?{input,error:true as const}:{input,output};})];
  }
  if (!['hamilton-paths', 'vertex-cover'].includes(app.id)) return [];
  const inputs = ['1|','7|','7|011223344556','7|01122334455660','2|'+'01'.repeat(26),'1|'+'00'.repeat(26)];
  let seed = 91723;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 100; t++) {
    const n = 1 + random(7), count = random(27);
    let input = `${n}|`;
    for (let e = 0; e < count; e++) input += `${random(n)}${random(n)}`;
    inputs.push(input);
  }
  const pairs: Edge[] = app.id === 'hamilton-paths' ? [[0,1],[0,2],[1,0],[1,2],[2,0],[2,1]] : [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  for (let mask = 0; mask < 64; mask++) inputs.push(`${app.id === 'hamilton-paths' ? 3 : 4}|` + pairs.filter((_,i) => mask & (1 << i)).map(e => e.join('')).join(''));
  // Dense digraphs stress search depth and count, while respecting 54 input cells.
  for (let n = 5; n <= 7; n++) {
    const pairs: string[] = [];
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (u !== v) pairs.push(`${u}${v}`);
    inputs.push(`${n}|` + pairs.slice(0, 26).join(''));
  }
  inputs.push('', '0|', '8|', '2|02', '3|0', '3|01 ', '3|0x', '3:01', '3|7');
  return [...app.examples, ...inputs.map(input => {
    const output = graphSearchReference(app.id, input);
    return output === undefined ? {input, error:true as const} : {input, output};
  })];
}
