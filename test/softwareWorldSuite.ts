import { worldTestStage } from './worldDiagnostics';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createStarterWorld, starterScreen } from '../src/world/starter';
import { canCheckpoint } from '../src/world/checkpoint';
import { TEXT_KEYS } from '../src/core/textKeyboard';
import { SOFTWARE } from '../src/world/software/native';
import { WEB_SITES } from '../src/world/catalog';
import { readNativeDisk } from './nativeDiskReader';

const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');

/** Optional focused integration run; default invocation still covers every program.
 * Example: TROIKA_SOFTWARE_TEST_IDS=regex-lab,study-deck npx vitest run ...
 * Filtering keeps the real catalog, server boot, byte comparisons and guest loader.
 */
export function registerSoftwareWorldTest(server: number) {
  const requested = new Set((process.env.TROIKA_SOFTWARE_TEST_IDS ?? '').split(/[,\s]+/).filter(Boolean));
  for (const id of requested) if (!SOFTWARE.some(app => app.id === id)) throw new Error(`Unknown focused software identity: ${id}`);
  const sites=new Set(WEB_SITES.filter(site=>site.server===server).map(site=>site.slug));
  const assignedApps=SOFTWARE.filter(app=>sites.has(app.site));
  const assigned=assignedApps.map(app=>app.id);
  if(!assigned.length) throw new Error(`No software assigned to web${server}`);
  if (requested.size && !assignedApps.some(app => requested.has(app.id))) {
    test.skip(`web${server} has no requested programs`, () => {});
    return;
  }
  // Each batch cold-boots production media. Saved-document editing and reloads
  // are much heavier than a plain download: cap those at two without weakening
  // either the per-operation guest-cycle budget or the wall-clock guard.
  const batches:{offset:number;ids:string[]}[]=[];
  let ids:string[]=[],offset=0,documents=0;
  for(const app of assignedApps){
    if(ids.length===16 || (app.kind==='document' && documents===2)){
      batches.push({offset,ids});offset+=ids.length;ids=[];documents=0;
    }
    ids.push(app.id);if(app.kind==='document')documents++;
  }
  if(ids.length)batches.push({offset,ids});
  for(const {offset,ids:batchIds} of batches) {
    const ids = requested.size ? batchIds.filter(id => requested.has(id)) : batchIds;
    if (!ids.length) continue;
    const scope = requested.size ? `selected PRGs ${ids.join(',')}` : `PRGs ${offset+1}..${offset+ids.length} of ${assigned.length}`;
    test(`download web${server} ${scope} and execute representatives`, () => {
      worldTestStage(`cold boot web${server} batch ${offset+1}..${offset+ids.length}`);
      const s = createStarterWorld(source, {programs: true, chat: false}), m = s.machines.client, k = s.keyboard;
      const until = (done: () => boolean) => {
        const end = s.world.cycles + 40_000_000;
        while (!done() && s.world.cycles < end) {s.world.runCycles(6561); expect(m.peek(2504), starterScreen(m)).not.toBe(-2);}
        expect(done(), starterScreen(m)).toBe(true);
      };
      const idle = () => canCheckpoint(s);
      const key = (value: number) => {k.queueTrytes([value]); until(idle);};
      const command = (text: string) => {k.queueText(text); until(idle); key(TEXT_KEYS.activate);};
      until(() => s.web!.servers.every(server => server.machine.peek(2198) === 1));
      k.queueText(' '); until(idle); key(TEXT_KEYS.console);
      command('open http://ternary.world/soft');
      expect(starterScreen(m)).toContain('Common divisor');
      key(TEXT_KEYS.console);
      const hosts = new Set(s.web!.catalog.hosts.filter(host=>host.server===server).map(host=>host.name));
      const hosted = s.web!.catalog.software.filter(app=>hosts.has(`${app.site}.world`));
      expect(hosted.map(app=>app.id)).toEqual(assigned);
      const apps=hosted.filter(app=>ids.includes(app.id));
      expect(apps.map(app=>app.id)).toEqual(ids);
      for (const app of apps) {
        worldTestStage(`download ${app.site}.world${app.path} (${app.id})`);
        command(`get http://${app.site}.world${app.path} /tool`);
        expect(starterScreen(m), app.id).toContain('ok');
        expect(readNativeDisk(s.disks.client.image(), '/tool'), app.id).toEqual(app.program.file);
        if (app.kind !== 'board' && app.kind !== 'document' && !(app.kind === 'text' && app.uiModule === 'creativeCanvasUi') && !['eclipse-explorer', 'resistor-stack', 'thin-lens', 'spring-stepper', 'mixing-tanks', 'reaction-balance', 'simpson-bench', 'automaton-lab', 'ternary-codec', 'congruence-pair', 'diophantine-line', 'mod-square-roots', 'primitive-roots', 'mobius-sieve', 'jacobi-symbol', 'dictionary-split', 'sorted-merge', 'parallel-rewrite', 'csv-project', 'boolean-table', 'dice-counts', 'urn-draw', 'run-probability', 'gambler-walk', 'coupon-collector', 'cycle-counts', 'quad-resultant', 'poly-division', 'integral-fit', 'quadratic-roots', 'poly-translate', 'newton-sums', 'weighted-slots', 'two-machine-flow', 'cpu-scheduler', 'cache-lab', 'lattice-polygon', 'rectangle-union', 'convex-clip', 'polygon-point', 'bezier-sampler', 'enclosing-circle', 'chord-finder', 'voice-leading', 'euclidean-beat', 'counterpoint', 'melody-transform', 'tuning-compare', 'suffix-index', 'local-alignment', 'fourier-eight', 'autocorrelation', 'markov-three', 'logistic-cycle', 'isotonic-fit', 'signal-segments', 'group-table', 'ternary-factors', 'bridge-circuit', 'loaded-beam', 'cubic-stability', 'network-reliable', 'petri-reach', 'section-props', 'fisher-table', 'signed-ranks', 'rank-association', 'plane-fit', 'one-way-compare', 'medoid-clusters', 'ternary-matrix', 'ternary-recur', 'grammar-sets', 'predictive-parse', 'logic-cover', 'combinator-bench', 'counter-machine', 'type-unifier', 'route-inspector', 'infix-bench', 'regex-lab', 'cyk-grammar', 'epsilon-nfa', 'dfa-minimize', 'turing-tape', 'hamilton-paths', 'vertex-cover', 'graph-twins', 'scc-groups', 'euler-route', 'exact-coloring', 'fragile-links', 'caesar-analysis', 'keyed-columns', 'vigenere', 'affine-keys', 'discrete-log', 'farey-next', 'pell-explorer', 'aliquot-chain', 'residual-flow', 'spanning-tree', 'cargo-knapsack', 'stable-pairing', 'concordance', 'context-search', 'sentence-format', 'word-columns', 'month-calendar', 'receipt-total', 'portion-shares', 'gcd', 'recipe-scale', 'nim', 'crc8', 'slug', 'brackets', 'weekday', 'coin-change', 'hamming-decode', 'uri-encode', 'json-unquote', 'csv-unquote', 'find-all', 'edit-distance', 'glob-match', 'word-sort', 'pulse-tone', 'interval-tone', 'envelope-lab', 'wave-forge', 'noise-bench', 'path-normalize', 'roman-write', 'roman-read', 'base64-encode', 'base64-decode', 'soundex', 'isbn-check', 'pig-latin', 'sample-summary', 'quartiles', 'frequency-table', 'exact-variance', 'linear-fit', 'differences', 'moving-average', 'rank-trend', 'stack-calc', 'tape-lab', 'best-segment', 'rising-subseq', 'peak-drop', 'turning-points', 'palindrome-span', 'repeat-unit', 'rotation-offset', 'common-span', 'sample-ranks', 'inversion-count', 'majority-value', 'nearest-readings', 'poly-evaluate', 'poly-derivative', 'poly-integral', 'synthetic-divide', 'determinant3', 'linear-solve2', 'matrix-inverse2', 'vector-products', 'polygon-area', 'line-intersect', 'triangle-point', 'rect-overlap', 'interval-union', 'interval-plan', 'subset-target', 'lz-pack', 'lz-unpack', 'graph-hops', 'dependency-order', 'next-permutation', 'permutation-rank', 'permutation-at', 'fraction-cf', 'cf-convergents', 'bwt-write', 'bwt-read', 'huffman-lengths', 'text-diff', 'bin-pack', 'assignment-plan', 'paragraph-wrap', 'tab-preview', 'convolution', 'walsh-transform', 'haar-lifting', 'sequence-next', 'word-ladder', 'letter-rack', 'date-shift', 'date-span', 'shortest-merge', 'pal-subsequence', 'decimal-cycle', 'egyptian-sum', 'closest-points', 'convex-hull'].includes(app.id)) continue;
        worldTestStage(`execute ${app.id}`);
        command('programs');
        k.queueText('4'); until(() => m.peek(2504) === 15);
        k.queueText('/tool'); k.queueTrytes([TEXT_KEYS.activate]);
        until(() => m.peek(2532) === 4 && m.peek(2514) === 1);
        expect(m.peek(2533)).toBe(app.number);
        if (app.kind === 'board') {
          const example = app.examples[0]!, cells = app.columns*app.rows;
          let cursor = 0;
          for (const square of example.moves) {
            k.queueTrytes(Array((square-cursor+cells)%cells).fill(TEXT_KEYS.next));
            k.queueTrytes([TEXT_KEYS.activate]); cursor = square;
          }
          for (let i=0;i<(example.steps??0);i++) k.queueText(app.stepKey!);
          until(() => m.peek(2632)===example.status && m.peek(2631)===example.movesMade && m.peek(2514)===1 &&
            String.fromCharCode(...Array.from({length:cells},(_,i)=>m.peek(2900+i)))===example.board);
        } else if (app.kind === 'document') {
          const settleDocument=()=>until(()=>m.peek(2514)===1 && m.read(68)!==4 && m.peek(6960)===0);
          const records=app.examples[0]!.records;
          for(const [index,value] of records.entries()) {
            const current=m.peek(2613);
            k.queueTrytes(Array(Math.abs(index-current)).fill(index>current?TEXT_KEYS.down:TEXT_KEYS.up));
            k.queueTrytes([TEXT_KEYS.activate,...Array(54).fill(TEXT_KEYS.backspace)]);
            k.queueText(value);k.queueTrytes([TEXT_KEYS.activate]);settleDocument();
            const base=3000+index*55;
            expect(String.fromCharCode(...Array.from({length:m.peek(base)},(_,i)=>m.peek(base+1+i))),app.id).toBe(value);
          }
          worldTestStage(`save and reload ${app.id}`);
          const payload=Array.from({length:660},(_,i)=>m.peek(3000+i));
          k.queueText('s');settleDocument();expect(m.peek(2614),starterScreen(m)).toBe(0);
          const saved=readNativeDisk(s.disks.client.image(),app.dataPath);
          expect(saved.length).toBe(666);expect(saved[2]).toBe(app.number);expect(saved.slice(6)).toEqual(payload);
          k.queueTrytes([TEXT_KEYS.home]);until(()=>m.peek(2504)===11&&m.peek(2514)===1);
          k.queueText('4');until(()=>m.peek(2504)===15);k.queueText('/tool');k.queueTrytes([TEXT_KEYS.activate]);
          until(()=>m.peek(2532)===4&&m.peek(2533)===app.number&&m.peek(2514)===1);
          expect(Array.from({length:660},(_,i)=>m.peek(3000+i)),app.id).toEqual(payload);
        } else if (app.kind === 'text' && app.uiModule === 'creativeCanvasUi') {
          const canvasKeyLoop = app.program.image.image.labels.get('app_key')!;
          const settleCanvas = () => until(() => m.peek(3) === canvasKeyLoop && m.read(68) !== 4);
          k.queueText('n'); settleCanvas();
          expect(starterScreen(m), app.id).toContain('Arrows:aim Enter:edit N:go');
          const pixels = Array.from({length:486}, (_,i) => m.peek(-9760+i));
          expect(pixels.some(value => value > 729), app.id).toBe(true);
          const state = Array.from({length:2525}, (_,i) => m.peek(2700+i));
          k.queueText('h'); settleCanvas();
          expect(m.peek(2602), app.id).toBe(1);
          expect(starterScreen(m)).toContain('H:back (state preserved)');
          k.queueText('h'); settleCanvas();
          expect(m.peek(2602), app.id).toBe(0);
          expect(Array.from({length:2525}, (_,i) => m.peek(2700+i)), app.id).toEqual(state);
          expect(Array.from({length:486}, (_,i) => m.peek(-9760+i)), app.id).toEqual(pixels);
        } else if (app.kind === 'text') {
          expect(starterScreen(m)).toContain(app.inputs[0]+' (max 54)');
          expect(starterScreen(m)).toContain(app.outputs[0]!);
          const example = app.examples[0]!;
          k.queueText(example.input); k.queueTrytes([TEXT_KEYS.activate]);
          until(() => m.peek(2620) === example.output!.length && m.peek(2621) === 0 && m.peek(2514) === 1);
          expect(String.fromCharCode(...Array.from({length:m.peek(2620)},(_,i)=>m.peek(2700+i)))).toBe(example.output);
        } else {
          const example = app.examples[app.id === 'crc8' ? 1 : 0]!;
          example.input.forEach((value, i) => {if (i) k.queueTrytes([TEXT_KEYS.next]); k.queueText(String(value));});
          k.queueTrytes([TEXT_KEYS.activate]);
          until(() => example.output!.every((value, i) => m.peek(2560 + i) === value) && m.peek(2559) === 0 && m.peek(2514) === 1);
        }
        expect(starterScreen(m)).toContain(app.title);
        if ('audio' in app && app.audio) {
          s.sound!.drainSamples();
          // Music workbenches compute silently and audition only on explicit P.
          // Exercise that guest key before checking actual hardware samples.
          if (['chord-finder','voice-leading','euclidean-beat','melody-transform'].includes(app.id)) k.queueText('p');
          s.world.runCycles(200_000);
          expect(s.sound!.drainSamples().some(value=>value!==0), app.id).toBe(true);
        }
        worldTestStage(`return to browser after ${app.id}`);
        k.queueTrytes([TEXT_KEYS.home]); until(() => m.peek(2504) === 11 && m.peek(2514) === 1);
        k.queueText('1'); until(() => idle() && m.peek(2532) === 1);
        expect(starterScreen(m)).toContain('Welcome to Troika World');
        key(TEXT_KEYS.console);
      }
    }, 180_000);
  }
}
