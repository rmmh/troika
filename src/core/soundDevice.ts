import type { Device } from './devices';
import {
  APU_CYCLES_PER_SAMPLE,
  REG_NOISE_ENV,
  REG_NOISE_CTRL,
  REG_NOISE_PERIOD,
  REG_NOISE_VOL,
  REG_PULSE1_CTRL,
  REG_PULSE1_ENV,
  REG_PULSE1_PERIOD,
  REG_PULSE1_VOL,
  REG_PULSE2_CTRL,
  REG_PULSE2_ENV,
  REG_PULSE2_PERIOD,
  REG_PULSE2_VOL,
  REG_SAMPLE_CTRL,
  REG_SAMPLE_ENV,
  REG_SAMPLE_LENGTH,
  REG_SAMPLE_RATE,
  REG_SAMPLE_START,
  REG_SAMPLE_VOL,
  REG_SOUND_ENABLE,
  REG_SOUND_IRQ,
  REG_SOUND_MASTER,
  REG_SOUND_STATUS,
  REG_WAVE_BASE,
  REG_WAVE_CTRL,
  REG_WAVE_ENV,
  REG_WAVE_PERIOD,
  REG_WAVE_VOL,
  SOUND_DEVICE_ID,
  SOUND_IRQ_SAMPLE_END,
} from './sound';
import { norm, tribblesOf, tritsRaw } from './tryte';

type PulseState = {
  phase: number;
  lastCtrl: number;
  env: EnvelopeState;
};

type StepState = {
  phase: number;
  counter: number;
  lastCtrl: number;
  env: EnvelopeState;
};

type EnvelopeStage = 'idle' | 'attack' | 'decay' | 'sustain' | 'release';

type EnvelopeState = {
  gate: boolean;
  level: number;
  stage: EnvelopeStage;
  counter: number;
};

const REG_BASE = SOUND_DEVICE_ID * 27;
const OFF_STATUS = REG_SOUND_STATUS - REG_BASE;

const ENABLE_PULSE1 = 0;
const ENABLE_PULSE2 = 1;
const ENABLE_WAVE = 2;
const ENABLE_NOISE = 3;
const ENABLE_SAMPLE = 4;
const STATUS_SAMPLE_END = 0;
const ENVELOPE_SAMPLES_PER_TICK = 243; // 19683 / 243 = 81 Hz envelope clock
const NOMINAL_OUTPUT_DB = -13;
const MAX_MIX_UNITS = 13 * 4; // pulse1 + pulse2 + wave + noise/sample budget

function clamp13(v: number): number {
  return Math.max(-13, Math.min(13, norm(v)));
}

function absPeriod(v: number): number {
  return Math.max(1, Math.min(9842, Math.abs(norm(v)) + 1));
}

function tritEnabled(v: number, index: number): boolean {
  return tritsRaw(v)[index] !== 1;
}

function setTrit(v: number, index: number, trit: -1 | 0 | 1): number {
  const trits = tritsRaw(v);
  trits[index] = trit + 1;
  let out = 0;
  for (const t of trits) out = out * 3 + t;
  return norm(out - 9841);
}

function makeEnvelope(): EnvelopeState {
  return { gate: false, level: 0, stage: 'idle', counter: 0 };
}

function decodeVolume(v: number): { max: number; sustain: number } {
  v = norm(v);
  if (v >= -13 && v <= 13) return { max: v, sustain: Math.abs(v) };
  const [max, sustain] = tribblesOf(v);
  return { max: clamp13(max), sustain: Math.min(13, Math.abs(sustain)) };
}

function decodeEnvelope(v: number): { attack: number; decay: number; release: number } {
  if (norm(v) === 0) return { attack: 0, decay: 0, release: 0 };
  const [attack, decay, release] = tribblesOf(v);
  return { attack: Math.abs(attack), decay: Math.abs(decay), release: Math.abs(release) };
}

function advanceEnvelopeLevel(env: EnvelopeState, target: number, stepTicks: number, delta: 1 | -1): boolean {
  if (stepTicks === 0) {
    env.level = target;
    env.counter = 0;
    return true;
  }
  env.counter++;
  if (env.counter < stepTicks) return env.level === target;
  env.counter = 0;
  env.level += delta;
  if ((delta > 0 && env.level >= target) || (delta < 0 && env.level <= target)) {
    env.level = target;
    return true;
  }
  return false;
}

export class SoundDevice implements Device {
  readonly id = SOUND_DEVICE_ID;

  private cycleAcc = 0;
  private envelopeAcc = 0;
  private readonly samples: number[] = [];
  private readonly pulse1: PulseState = { phase: 0, lastCtrl: 0, env: makeEnvelope() };
  private readonly pulse2: PulseState = { phase: 0, lastCtrl: 0, env: makeEnvelope() };
  private readonly wave: StepState = { phase: 0, counter: 0, lastCtrl: 0, env: makeEnvelope() };
  private readonly noise: StepState = { phase: 1, counter: 0, lastCtrl: 0, env: makeEnvelope() };
  private readonly sample: StepState = { phase: 0, counter: 0, lastCtrl: 0, env: makeEnvelope() };
  private status = 0;

  constructor(
    private readonly peek: (addr: number) => number,
    private readonly poke: (addr: number, v: number) => void,
  ) {
  }

  reset(): void {
    this.cycleAcc = 0;
    this.envelopeAcc = 0;
    this.samples.length = 0;
    this.pulse1.phase = 0;
    this.pulse1.lastCtrl = 0;
    Object.assign(this.pulse1.env, makeEnvelope());
    this.pulse2.phase = 0;
    this.pulse2.lastCtrl = 0;
    Object.assign(this.pulse2.env, makeEnvelope());
    this.wave.phase = 0;
    this.wave.counter = 0;
    this.wave.lastCtrl = 0;
    Object.assign(this.wave.env, makeEnvelope());
    this.noise.phase = 1;
    this.noise.counter = 0;
    this.noise.lastCtrl = 0;
    Object.assign(this.noise.env, makeEnvelope());
    this.sample.phase = 0;
    this.sample.counter = 0;
    this.sample.lastCtrl = 0;
    Object.assign(this.sample.env, makeEnvelope());
    this.status = 0;
    this.poke(REG_SOUND_STATUS, 0);
  }

  read(reg: number, backing: number): number {
    if (reg === OFF_STATUS) return this.status;
    return backing;
  }

  write(reg: number, v: number): boolean {
    if (reg === OFF_STATUS) {
      const clear = tritsRaw(v);
      const cur = tritsRaw(this.status);
      for (let i = 0; i < 9; i++) if (clear[i] !== 1) cur[i] = 1;
      let out = 0;
      for (const t of cur) out = out * 3 + t;
      this.status = norm(out - 9841);
      this.poke(REG_SOUND_STATUS, this.status);
      return true;
    }
    return false;
  }

  nextEventCycles(): number {
    return APU_CYCLES_PER_SAMPLE - this.cycleAcc;
  }

  tick(dcycles: number, irq: (line: number) => void): void {
    this.cycleAcc += dcycles;
    while (this.cycleAcc >= APU_CYCLES_PER_SAMPLE) {
      this.cycleAcc -= APU_CYCLES_PER_SAMPLE;
      this.tickEnvelopes();
      this.samples.push(this.generateSample(irq));
    }
  }

  drainSamples(max = this.samples.length): number[] {
    return this.samples.splice(0, max);
  }

  get bufferedSamples(): number {
    return this.samples.length;
  }

  private generateSample(irq: (line: number) => void): number {
    const enable = this.peek(REG_SOUND_ENABLE);
    let mixed = 0;
    if (tritEnabled(enable, ENABLE_PULSE1))
      mixed += this.tickPulse(this.pulse1, REG_PULSE1_CTRL, REG_PULSE1_PERIOD, REG_PULSE1_VOL);
    if (tritEnabled(enable, ENABLE_PULSE2))
      mixed += this.tickPulse(this.pulse2, REG_PULSE2_CTRL, REG_PULSE2_PERIOD, REG_PULSE2_VOL);
    if (tritEnabled(enable, ENABLE_WAVE)) mixed += this.tickWave();
    if (tritEnabled(enable, ENABLE_NOISE)) mixed += this.tickNoise();
    if (tritEnabled(enable, ENABLE_SAMPLE)) mixed += this.tickSample(irq);

    const trimDb = clamp13(this.peek(REG_SOUND_MASTER));
    const gain = 10 ** ((NOMINAL_OUTPUT_DB + trimDb) / 20);
    const scaled = Math.round((mixed / MAX_MIX_UNITS) * gain * 9841);
    return Math.max(-9841, Math.min(9841, scaled));
  }

  private tickPulse(state: PulseState, ctrlReg: number, periodReg: number, volReg: number): number {
    const ctrl = norm(this.peek(ctrlReg));
    if (ctrl !== 0) state.lastCtrl = ctrl;
    if (state.lastCtrl === 0 || state.env.level === 0) return 0;
    const period = absPeriod(this.peek(periodReg));
    const vol = this.envelopedVolume(state.env, volReg);
    const duty = [0, 1 / 8, 1 / 4, 1 / 2, 3 / 4][Math.min(4, Math.abs(state.lastCtrl))]!;
    const threshold = Math.max(1, Math.min(period, Math.round(period * duty)));
    const high = state.phase < threshold;
    state.phase = (state.phase + 1) % period;
    const sign = high ? 1 : -1;
    return state.lastCtrl < 0 ? -sign * vol : sign * vol;
  }

  private tickWave(): number {
    const ctrl = norm(this.peek(REG_WAVE_CTRL));
    if (ctrl !== 0) this.wave.lastCtrl = ctrl;
    if (this.wave.env.level === 0) return 0;
    const period = absPeriod(this.peek(REG_WAVE_PERIOD));
    const vol = this.envelopedVolume(this.wave.env, REG_WAVE_VOL);
    const base = this.peek(REG_WAVE_BASE);
    const raw = clamp13(this.peek(base + this.wave.phase));
    this.wave.counter++;
    if (this.wave.counter >= period) {
      this.wave.counter = 0;
      this.wave.phase = (this.wave.phase + (this.wave.lastCtrl < 0 ? 26 : 1)) % 27;
    }
    return Math.round((raw * vol) / 13);
  }

  private tickNoise(): number {
    const ctrl = norm(this.peek(REG_NOISE_CTRL));
    if (ctrl !== 0) this.noise.lastCtrl = ctrl;
    if (this.noise.lastCtrl === 0 || this.noise.env.level === 0) return 0;
    const period = absPeriod(this.peek(REG_NOISE_PERIOD));
    const vol = this.envelopedVolume(this.noise.env, REG_NOISE_VOL);
    this.noise.counter++;
    if (this.noise.counter >= period) {
      this.noise.counter = 0;
      let x = this.noise.phase & 0x1ff;
      if (x === 0) x = 1;
      const bit = this.noise.lastCtrl > 0 ? ((x >> 0) ^ (x >> 4)) & 1 : ((x >> 0) ^ (x >> 1)) & 1;
      x = ((x >> 1) | (bit << 8)) & 0x1ff;
      this.noise.phase = x || 1;
    }
    return (this.noise.phase & 1 ? 1 : -1) * vol;
  }

  private tickSample(irq: (line: number) => void): number {
    const ctrl = norm(this.peek(REG_SAMPLE_CTRL));
    if (ctrl === 0 || this.sample.env.level === 0) return 0;
    const period = absPeriod(this.peek(REG_SAMPLE_RATE));
    const vol = this.envelopedVolume(this.sample.env, REG_SAMPLE_VOL);
    const start = this.peek(REG_SAMPLE_START);
    const length = Math.max(0, norm(this.peek(REG_SAMPLE_LENGTH)));
    if (length <= 0) return 0;

    const out = Math.round((clamp13(this.peek(start + this.sample.phase)) * vol) / 13);
    this.sample.counter++;
    if (this.sample.counter >= period) {
      this.sample.counter = 0;
      this.sample.phase++;
      if (this.sample.phase >= length) {
        if (ctrl < 0) {
          this.sample.phase = 0;
        } else {
          this.sample.phase = 0;
          this.poke(REG_SAMPLE_CTRL, 0);
          this.poke(REG_SOUND_ENABLE, setTrit(this.peek(REG_SOUND_ENABLE), ENABLE_SAMPLE, 0));
          this.setStatus(STATUS_SAMPLE_END, irq);
        }
      }
    }
    return out;
  }

  private setStatus(index: number, irq: (line: number) => void): void {
    this.status = setTrit(this.status, index, 1);
    this.poke(REG_SOUND_STATUS, this.status);
    if (index === STATUS_SAMPLE_END && tritEnabled(this.peek(REG_SOUND_IRQ), 0)) {
      irq(SOUND_IRQ_SAMPLE_END);
    }
  }

  private tickEnvelopes(): void {
    this.envelopeAcc++;
    if (this.envelopeAcc < ENVELOPE_SAMPLES_PER_TICK) {
      this.syncEnvelopeGates(false);
      return;
    }
    this.envelopeAcc = 0;
    this.syncEnvelopeGates(true);
  }

  private syncEnvelopeGates(advance: boolean): void {
    this.tickEnvelope(this.pulse1.env, REG_PULSE1_ENV, REG_PULSE1_VOL, norm(this.peek(REG_PULSE1_CTRL)) !== 0, advance);
    this.tickEnvelope(this.pulse2.env, REG_PULSE2_ENV, REG_PULSE2_VOL, norm(this.peek(REG_PULSE2_CTRL)) !== 0, advance);
    this.tickEnvelope(this.wave.env, REG_WAVE_ENV, REG_WAVE_VOL, norm(this.peek(REG_WAVE_CTRL)) !== 0, advance);
    this.tickEnvelope(this.noise.env, REG_NOISE_ENV, REG_NOISE_VOL, norm(this.peek(REG_NOISE_CTRL)) !== 0, advance);
    this.tickEnvelope(this.sample.env, REG_SAMPLE_ENV, REG_SAMPLE_VOL, norm(this.peek(REG_SAMPLE_CTRL)) !== 0, advance);
  }

  private tickEnvelope(env: EnvelopeState, envReg: number, volReg: number, gate: boolean, advance: boolean): void {
    const vol = decodeVolume(this.peek(volReg));
    const shape = decodeEnvelope(this.peek(envReg));
    const bypass = norm(this.peek(envReg)) === 0;
    if (bypass) {
      env.gate = gate;
      env.stage = gate ? 'sustain' : 'idle';
      env.level = gate ? Math.abs(vol.max) : 0;
      env.counter = 0;
      return;
    }

    if (gate !== env.gate) {
      env.gate = gate;
      env.counter = 0;
      if (gate) {
        env.stage = shape.attack === 0 ? 'decay' : 'attack';
        if (shape.attack === 0) env.level = Math.abs(vol.max);
      } else {
        env.stage = shape.release === 0 ? 'idle' : 'release';
        if (shape.release === 0) env.level = 0;
      }
    }

    if (!advance) return;
    const max = Math.abs(vol.max);
    switch (env.stage) {
      case 'attack':
        if (advanceEnvelopeLevel(env, max, shape.attack, 1)) env.stage = 'decay';
        break;
      case 'decay':
        if (advanceEnvelopeLevel(env, vol.sustain, shape.decay, -1)) env.stage = 'sustain';
        break;
      case 'release':
        if (advanceEnvelopeLevel(env, 0, shape.release, -1)) env.stage = 'idle';
        break;
    }
  }

  private envelopedVolume(env: EnvelopeState, volReg: number): number {
    const { max } = decodeVolume(this.peek(volReg));
    return Math.sign(max) * env.level;
  }
}
