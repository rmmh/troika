import type { Device } from './devices';
import {
  APU_CYCLES_PER_SAMPLE,
  APU_SAMPLE_RATE,
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
import { stateBoolean, stateInteger, stateTrytes } from './stateValidation';

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
  volumeValue: number;
  envelopeValue: number;
  volume: { max: number; sustain: number };
  shape: { attack: number; decay: number; release: number };
};

type SavedEnvelope = Pick<EnvelopeState, 'gate' | 'level' | 'stage' | 'counter'>;
type SavedPulse = {phase:number; lastCtrl:number; env:SavedEnvelope};
type SavedStep = SavedPulse & {counter:number};
export interface SoundDeviceState {
  cycleAcc:number; envelopeAcc:number; status:number; samples:number[];
  pulse1:SavedPulse; pulse2:SavedPulse; wave:SavedStep; noise:SavedStep; sample:SavedStep;
}

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
const TRIT_PLACES = [6561, 2187, 729, 243, 81, 27, 9, 3, 1];
const DUTY_RATIOS = [0, 1 / 8, 1 / 4, 1 / 2, 3 / 4];
const MASTER_GAINS = Array.from({ length: 27 }, (_, i) => 10 ** ((NOMINAL_OUTPUT_DB + i - 13) / 20));

function clamp13(v: number): number {
  return Math.max(-13, Math.min(13, norm(v)));
}

function absPeriod(v: number): number {
  return Math.max(1, Math.min(9842, Math.abs(norm(v)) + 1));
}

function tritEnabled(v: number, index: number): boolean {
  return Math.floor((norm(v) + 9841) / TRIT_PLACES[index]!) % 3 !== 1;
}

function setTrit(v: number, index: number, trit: -1 | 0 | 1): number {
  const trits = tritsRaw(v);
  trits[index] = trit + 1;
  let out = 0;
  for (const t of trits) out = out * 3 + t;
  return norm(out - 9841);
}

function makeEnvelope(): EnvelopeState {
  return {
    gate: false, level: 0, stage: 'idle', counter: 0,
    volumeValue: NaN, envelopeValue: NaN,
    volume: { max: 0, sustain: 0 }, shape: { attack: 0, decay: 0, release: 0 },
  };
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
  // Retain at most one second of recent output if playback is suspended or
  // unavailable. Dropping old output must never stop the emulated APU clock.
  private readonly samples = new Int16Array(APU_SAMPLE_RATE);
  private sampleHead = 0;
  private sampleCount = 0;
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

  captureState(): SoundDeviceState {
    const envelope = (env:EnvelopeState):SavedEnvelope => ({gate:env.gate,level:env.level,stage:env.stage,counter:env.counter});
    const pulse = (value:PulseState):SavedPulse => ({phase:value.phase,lastCtrl:value.lastCtrl,env:envelope(value.env)});
    const step = (value:StepState):SavedStep => ({...pulse(value),counter:value.counter});
    return {cycleAcc:this.cycleAcc,envelopeAcc:this.envelopeAcc,status:this.status,
      samples:Array.from({length:this.sampleCount},(_,i)=>this.samples[(this.sampleHead+i)%this.samples.length]!),
      pulse1:pulse(this.pulse1),pulse2:pulse(this.pulse2),wave:step(this.wave),noise:step(this.noise),sample:step(this.sample)};
  }

  restoreState(state: SoundDeviceState): void {
    stateInteger(state.cycleAcc,0,APU_CYCLES_PER_SAMPLE-1);
    stateInteger(state.envelopeAcc,0,ENVELOPE_SAMPLES_PER_TICK-1);
    stateInteger(state.status,-9841,9841); stateTrytes(state.samples);
    if (state.samples.length>APU_SAMPLE_RATE) throw new RangeError('sound output exceeds buffer');
    const validate = (value:SavedPulse, min:number, max:number) => {
      stateInteger(value.phase,min,max); stateInteger(value.lastCtrl,-9841,9841);
      stateBoolean(value.env.gate); stateInteger(value.env.level,0,13); stateInteger(value.env.counter,0,12);
      if (!['idle','attack','decay','sustain','release'].includes(value.env.stage)) throw new Error('invalid sound envelope stage');
    };
    validate(state.pulse1,0,9841); validate(state.pulse2,0,9841); validate(state.wave,0,26);
    validate(state.noise,1,511); validate(state.sample,0,9840);
    for (const value of [state.wave,state.noise,state.sample]) stateInteger(value.counter,0,9841);
    // Derived register-decode caches are reconstructed at the next APU sample.
    const restore = (target:PulseState, value:SavedPulse) => {
      target.phase=value.phase; target.lastCtrl=value.lastCtrl;
      Object.assign(target.env,makeEnvelope(),{gate:value.env.gate,level:value.env.level,stage:value.env.stage,counter:value.env.counter});
    };
    restore(this.pulse1,state.pulse1); restore(this.pulse2,state.pulse2);
    for (const [target,value] of [[this.wave,state.wave],[this.noise,state.noise],[this.sample,state.sample]] as const) {
      restore(target,value); target.counter=value.counter;
    }
    this.cycleAcc=state.cycleAcc; this.envelopeAcc=state.envelopeAcc; this.status=state.status;
    this.samples.fill(0); this.samples.set(state.samples); this.sampleHead=0; this.sampleCount=state.samples.length;
    this.poke(REG_SOUND_STATUS,this.status);
  }

  reset(): void {
    this.cycleAcc = 0;
    this.envelopeAcc = 0;
    this.sampleHead = 0;
    this.sampleCount = 0;
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

  inspect(reg: number, backing: number): number {
    return this.read(reg, backing);
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
      const index = (this.sampleHead + this.sampleCount) % this.samples.length;
      this.samples[index] = this.generateSample(irq);
      if (this.sampleCount < this.samples.length) this.sampleCount++;
      else this.sampleHead = (this.sampleHead + 1) % this.samples.length;
    }
  }

  /** Drain oldest retained samples first; overflow discards the oldest output. */
  drainSamples(max = this.sampleCount): number[] {
    const count = Math.max(0, Math.min(this.sampleCount, Math.trunc(max) || 0));
    const result = new Array<number>(count);
    for (let i = 0; i < count; i++) result[i] = this.samples[(this.sampleHead + i) % this.samples.length]!;
    this.sampleHead = (this.sampleHead + count) % this.samples.length;
    this.sampleCount -= count;
    return result;
  }

  get bufferedSamples(): number {
    return this.sampleCount;
  }

  private generateSample(irq: (line: number) => void): number {
    const enable = this.peek(REG_SOUND_ENABLE);
    let mixed = 0;
    if (tritEnabled(enable, ENABLE_PULSE1))
      mixed += this.tickPulse(this.pulse1, REG_PULSE1_CTRL, REG_PULSE1_PERIOD);
    if (tritEnabled(enable, ENABLE_PULSE2))
      mixed += this.tickPulse(this.pulse2, REG_PULSE2_CTRL, REG_PULSE2_PERIOD);
    if (tritEnabled(enable, ENABLE_WAVE)) mixed += this.tickWave();
    if (tritEnabled(enable, ENABLE_NOISE)) mixed += this.tickNoise();
    if (tritEnabled(enable, ENABLE_SAMPLE)) mixed += this.tickSample(irq);

    const trimDb = clamp13(this.peek(REG_SOUND_MASTER));
    const gain = MASTER_GAINS[trimDb + 13]!;
    const scaled = Math.round((mixed / MAX_MIX_UNITS) * gain * 9841);
    return Math.max(-9841, Math.min(9841, scaled));
  }

  private tickPulse(state: PulseState, ctrlReg: number, periodReg: number): number {
    const ctrl = norm(this.peek(ctrlReg));
    if (ctrl !== 0) state.lastCtrl = ctrl;
    if (state.lastCtrl === 0 || state.env.level === 0) return 0;
    const period = absPeriod(this.peek(periodReg));
    const vol = this.envelopedVolume(state.env);
    const duty = DUTY_RATIOS[Math.min(4, Math.abs(state.lastCtrl))]!;
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
    const vol = this.envelopedVolume(this.wave.env);
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
    const vol = this.envelopedVolume(this.noise.env);
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
    if (ctrl !== 0) this.sample.lastCtrl = ctrl;
    if (this.sample.lastCtrl === 0 || this.sample.env.level === 0) return 0;
    const period = absPeriod(this.peek(REG_SAMPLE_RATE));
    const vol = this.envelopedVolume(this.sample.env);
    const start = this.peek(REG_SAMPLE_START);
    const length = Math.max(0, norm(this.peek(REG_SAMPLE_LENGTH)));
    if (length <= 0) return 0;

    const out = Math.round((clamp13(this.peek(start + this.sample.phase)) * vol) / 13);
    this.sample.counter++;
    if (this.sample.counter >= period) {
      this.sample.counter = 0;
      this.sample.phase++;
      if (this.sample.phase >= length) {
        if (this.sample.lastCtrl < 0) {
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
    // Registers can change between any two samples. Decode only when a value
    // changes, while checking every sample so modulation remains immediate.
    const volumeValue = this.peek(volReg);
    const envelopeValue = this.peek(envReg);
    if (volumeValue !== env.volumeValue) {
      env.volumeValue = volumeValue;
      env.volume = decodeVolume(volumeValue);
    }
    if (envelopeValue !== env.envelopeValue) {
      env.envelopeValue = envelopeValue;
      env.shape = decodeEnvelope(envelopeValue);
    }
    const vol = env.volume;
    const shape = env.shape;
    const bypass = norm(envelopeValue) === 0;
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

  private envelopedVolume(env: EnvelopeState): number {
    return Math.sign(env.volume.max) * env.level;
  }
}
