import { assemble } from '../src/asm/assemble';
import { Machine, REG_P } from '../src/core/machine';
import { SoundDevice } from '../src/core/soundDevice';
import {
  REG_SOUND_MASTER, REG_SOUND_ENABLE, REG_PULSE1_CTRL, REG_PULSE1_PERIOD, REG_PULSE1_VOL,
  REG_PULSE2_CTRL, REG_PULSE2_PERIOD, REG_PULSE2_VOL, REG_WAVE_CTRL, REG_WAVE_BASE,
  REG_WAVE_VOL, REG_NOISE_CTRL, REG_NOISE_VOL, REG_SAMPLE_CTRL, REG_SAMPLE_START,
  REG_SAMPLE_LENGTH, REG_SAMPLE_VOL, APU_CYCLES_PER_SAMPLE,
} from '../src/core/sound';
import { sampleGameFrame } from '../src/core/gameRenderer';
import {
  REG_HIDE_MASK, REG_BG0_SCX, REG_BG0_SCY, REG_BG1_SCX, REG_BG1_SCY,
  OAM_Y_BASE, OAM_X_BASE, OAM_TILE_BASE, OAM_ATTR_BASE,
} from '../src/core/display';
import { fromTrits } from '../src/core/tryte';

const results: { task: string; batch: string; medianMs: string; perSecond: string; checksum: number }[] = [];

function benchmark(task: string, count: number, unit: string, run: () => number): void {
  const reference = run();
  run();
  const times: number[] = [];
  for (let trial = 0; trial < 7; trial++) {
    const start = performance.now();
    const checksum = run();
    times.push(performance.now() - start);
    if (checksum !== reference) throw new Error(`${task} produced inconsistent output`);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  results.push({ task, batch: `${count} ${unit}`, medianMs: median.toFixed(2),
    perSecond: Math.round(count * 1000 / median).toLocaleString('en-US'), checksum: reference });
}

const macroSource = '$set/1: M A $1 end\n' + 'set 83\n'.repeat(9000);
benchmark('Assembler', 9000, 'macro calls', () => {
  const result = assemble(macroSource);
  if (result.diagnostics.some(d => d.severity === 'error')) throw new Error('benchmark source failed to assemble');
  return result.chunks.reduce((sum, chunk) => sum + chunk.data.reduce((a, b) => a + b, 0), 0);
});

const cpuProgram = assemble('@200\nloop: I A 1\nB A B\nY A C\nF A 9\nQ A B\nJ loop');
benchmark('CPU', 1_000_000, 'cycles', () => {
  const machine = new Machine();
  for (const chunk of cpuProgram.chunks) chunk.data.forEach((value, i) => machine.poke(chunk.addr + i, value));
  machine.poke(REG_P, cpuProgram.entry!);
  machine.poke(-12, 2);
  machine.poke(-11, 3);
  machine.run(1_000_000);
  return machine.cycles + machine.inspect(-13) + machine.inspect(REG_P);
});

benchmark('APU', 100_000, 'samples', () => {
  const machine = new Machine();
  const sound = new SoundDevice(a => machine.peek(a), (a, v) => machine.poke(a, v));
  const registers = [
    [REG_SOUND_MASTER, 13], [REG_SOUND_ENABLE, fromTrits('111110000')],
    [REG_PULSE1_CTRL, 3], [REG_PULSE1_PERIOD, 13], [REG_PULSE1_VOL, 13],
    [REG_PULSE2_CTRL, 2], [REG_PULSE2_PERIOD, 17], [REG_PULSE2_VOL, 9],
    [REG_WAVE_CTRL, 1], [REG_WAVE_BASE, 1000], [REG_WAVE_VOL, 7],
    [REG_NOISE_CTRL, 1], [REG_NOISE_VOL, 3], [REG_SAMPLE_CTRL, -1],
    [REG_SAMPLE_START, 1000], [REG_SAMPLE_LENGTH, 27], [REG_SAMPLE_VOL, 5],
  ];
  for (const [address, value] of registers) machine.poke(address!, value!);
  for (let i = 0; i < 27; i++) machine.poke(1000 + i, i - 13);
  sound.tick(100_000 * APU_CYCLES_PER_SAMPLE, () => {});
  return sound.drainSamples().reduce((sum, value) => sum + value, 0);
});

const scene = new Machine();
let seed = 97;
for (let i = 0; i < scene.mem.length; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  scene.mem[i] = seed % 19683 - 9841;
}
for (const address of [REG_HIDE_MASK, REG_BG0_SCX, REG_BG0_SCY, REG_BG1_SCX, REG_BG1_SCY]) scene.poke(address, 0);
for (let i = 0; i < 81; i++) {
  scene.poke(OAM_Y_BASE + i, i < 27 ? (i * 17) % 153 : -100);
  scene.poke(OAM_X_BASE + i, (i * 29) % 153);
  scene.poke(OAM_TILE_BASE + i, i);
  scene.poke(OAM_ATTR_BASE + i, 0);
}
benchmark('Game renderer', 20, 'frames', () => {
  let checksum = 0;
  for (let i = 0; i < 20; i++) {
    const frame = sampleGameFrame(scene.mem, address => scene.peek(address));
    checksum = (checksum + frame[i * 131]!) | 0;
  }
  return checksum;
});

console.log(`Troika benchmarks — ${process.version}, ${process.platform}/${process.arch}`);
console.log('Median of 7 trials after 2 warmups. Throughput is batch units/second; timings are not CI thresholds.');
console.table(results);
