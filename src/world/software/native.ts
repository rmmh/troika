import { linkProgramOverlay, type buildProgramCore } from '../../firmware/programCore';
import { POSITIVE_DIVISION } from './arithmetic';
import { PRACTICAL_SOFTWARE } from './practical';
import { TEXT_SOFTWARE } from './text';
import { MATHEMATICAL_SOFTWARE } from './mathematics';
import { BOARD_SOFTWARE } from './boards';
import { AUDIO_SOFTWARE } from './audio';

export interface NativeSoftware {
  kind?: 'numeric';
  audio?: boolean;
  number: number;
  id: string;
  site: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  algorithm: string;
  examples: {input: number[]; output?: number[]; error?: true}[];
}

export interface TextSoftware extends Omit<NativeSoftware, 'kind' | 'examples'> {
  kind: 'text';
  examples: {input: string; output?: string; error?: true}[];
}
export interface BoardSoftware extends Omit<NativeSoftware, 'kind' | 'examples'> {
  kind: 'board';
  columns: number;
  rows: number;
  stepKey?: 'n';
  controls?: string;
  counterLabel?: string;
  examples: {moves: number[]; steps?: number; board: string; status: number; movesMade: number}[];
}
export type Software = NativeSoftware | TextSoftware | BoardSoftware;

export function buildSoftwareDistribution(core: ReturnType<typeof buildProgramCore>, source: (name: string) => string) {
  if (new Set(SOFTWARE.map(app => app.number)).size !== SOFTWARE.length ||
      new Set(SOFTWARE.map(app => app.id)).size !== SOFTWARE.length) throw new Error('Duplicate software identity');
  return SOFTWARE.map(app => ({
    ...app, path: `/p${String(app.number - 1).padStart(4, '0')}`, sourcePath: `/c${String(app.number - 1).padStart(4, '0')}`,
    pagePath: `/s${String(app.number - 1).padStart(4, '0')}`, program: buildNativeSoftware(core, source, app),
  }));
}

const ascii = (text: string) => [...text].map(c => c.charCodeAt(0)).concat(0).join(' ');

/** Assembly and PRG construction only. UI and algorithms execute on the guest. */
export function buildNativeSoftware(core: ReturnType<typeof buildProgramCore>, source: (name: string) => string, app: Software) {
  if (!Number.isInteger(app.number) || app.number < 1 || app.number > 9841 || !/^[a-z][a-z0-9-]{0,15}$/.test(app.id) || app.inputs.length < 1 || app.inputs.length > 3 || app.outputs.length < 1 || app.outputs.length > 3) {
    throw new Error(`Invalid native software declaration: ${app.id}`);
  }
  if (app.title.length > 27 || [...app.inputs, ...app.outputs].some(label => label.length > 16)) throw new Error(`Software label too long: ${app.id}`);
  if (app.kind === 'board' && (!Number.isInteger(app.columns) || !Number.isInteger(app.rows) || app.columns < 1 || app.columns > 8 || app.rows < 1 || app.rows > 8)) throw new Error(`Invalid board dimensions: ${app.id}`);
  if (app.kind === 'board' && app.controls !== undefined && (app.controls.length < 1 || app.controls.length > 27 || /[^ -~]/.test(app.controls))) throw new Error(`Invalid board controls: ${app.id}`);
  if (app.kind === 'board' && (app.counterLabel?.length ?? 5)>5) throw new Error(`Board counter label too long: ${app.id}`);
  const boardConfig = app.kind === 'board' ? `\n$game_columns: ${app.columns}\n$game_rows: ${app.rows}\n$game_cells: ${app.columns*app.rows}\n$board_origin: ${-9841+5*27+Math.floor((27-app.columns*3)/2)}` : '';
  return linkProgramOverlay(core, [
    {name: 'appConfig', source: `$app_input_count: ${app.inputs.length}\n$app_output_count: ${app.outputs.length}\n$software_id: ${app.number}\n$app_audio: ${app.audio ? 1 : 0}${boardConfig}`},
    {name: 'appUi', source: source(app.kind === 'board' ? 'softwareBoardUi' : app.kind === 'text' ? 'softwareTextUi' : 'softwareUi')},
    ...app.kind === 'text' ? [{name: 'text', source: source('text')}] : [],
    {name: 'appAlgorithm', source: app.algorithm},
    ...app.kind === 'board' && !app.stepKey ? [{name:'boardKeys',source:'game_key: M A Z O S P'}] : [],
    {name: 'appLabels', source: `app_title: ${ascii(app.title)}
${app.kind === 'board' ? `app_board_controls: ${ascii(app.controls ?? (app.stepKey ? 'Enter:edit N:step R:reset' : 'Enter/Space: play  R: reset'))}\napp_board_counter: ${ascii((app.counterLabel ?? (app.stepKey ? 'Steps' : 'Moves'))+': ')}` : ''}
app_inputs: ${app.inputs.map((_, i) => `@app_i${i}`).join(' ')}
app_outputs: ${app.outputs.map((_, i) => `@app_o${i}`).join(' ')}
${app.inputs.map((label, i) => `app_i${i}: ${ascii(label)}`).join('\n')}
${app.outputs.map((label, i) => `app_o${i}: ${ascii(label)}`).join('\n')}`},
  ], 'app_entry');
}


export const NUMERIC_SOFTWARE: NativeSoftware[] = [
  {
    number: 1, id: 'gcd', site: 'ternary', title: 'Common divisor',
    description: 'Euclid finds the greatest common divisor of two signed trytes. Signs are ignored; gcd(0,0) is zero.',
    inputs: ['First integer', 'Second integer'], outputs: ['GCD'],
    algorithm: `app_compute: R A 2552 F A A R B 2553 F B A
app_gcd: E B Z W 2560 A E B Z M A Z E B Z O S P
 C S app_div M A B M B C J app_gcd
${POSITIVE_DIVISION}`,
    examples: [{input: [84,30], output:[6]}, {input:[-9841,2],output:[1]}, {input:[0,0],output:[0]}, {input:[0,-72],output:[72]}],
  },
  {
    number: 2, id: 'isqrt', site: 'ternary', title: 'Integer square root',
    description: 'Subtracts successive odd numbers to find floor(sqrt(n)) and the remainder n-root*root. Input must be nonnegative.',
    inputs: ['Nonnegative n'], outputs: ['Root', 'Remainder'],
    algorithm: `app_compute: R A 2552 ifl A Z M A -1 O S P end
 M B 1 M C Z
app_root: ifl A B W 2560 C W 2561 A M A Z O S P end
 S A B I B 2 I C 1 J app_root`,
    examples: [{input:[0],output:[0,0]}, {input:[81],output:[9,0]}, {input:[9841],output:[99,40]}, {input:[-1],error:true}],
  },
  {
    number: 3, id: 'digits', site: 'ternary', title: 'Radix digit census',
    description: 'Counts digits and sums their values in a chosen base from 2 to 27. Ignores the sign of n; zero has one digit.',
    inputs: ['Integer n', 'Base (2..27)'], outputs: ['Digits', 'Digit sum'],
    algorithm: `app_compute: R A 2552 F A A R B 2553
 ifl B 2 M A -1 O S P end ifg B 27 M A -1 O S P end
 M G Z M H Z
app_digits_loop: C S app_div I G 1 A H C N A Z J app_digits_loop
 W 2560 G W 2561 H M A Z O S P
${POSITIVE_DIVISION}`,
    examples: [{input:[255,16],output:[2,30]}, {input:[-9841,10],output:[4,22]}, {input:[0,3],output:[1,0]}, {input:[7,1],error:true}],
  },
  {
    number: 4, id: 'factors', site: 'ternary', title: 'Prime factor census',
    description: 'Trial division reports the number of prime factors with multiplicity, the number of distinct primes, and the largest. n must be at least 2.',
    inputs: ['Integer n >= 2'], outputs: ['Factors', 'Distinct primes', 'Largest prime'],
    algorithm: `app_compute: R G 2552 ifl G 2 M A -1 O S P end
 M B 2 M H Z M I Z M J Z M K Z
app_trial: M A G C S app_div
 ife C Z M G A I H 1 M J B ifn K B I I 1 M K B end
   E G 1 J app_factor_done J app_trial
 end
 ifg B A I H 1 I I 1 M J G J app_factor_done end
 I B 1 J app_trial
app_factor_done: W 2560 H W 2561 I W 2562 J M A Z O S P
${POSITIVE_DIVISION}`,
    examples: [{input:[360],output:[6,3,5]}, {input:[97],output:[1,1,97]}, {input:[8192],output:[13,1,2]}, {input:[1],error:true}],
  },
  ...PRACTICAL_SOFTWARE,
  ...MATHEMATICAL_SOFTWARE,
  ...AUDIO_SOFTWARE,
];

export const SOFTWARE: Software[] = [...NUMERIC_SOFTWARE, ...TEXT_SOFTWARE, ...BOARD_SOFTWARE];
