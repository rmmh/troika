import { describe, expect, test } from 'vitest';
import { Machine } from '../src/core/machine';
import {
  APU_CYCLES_PER_SAMPLE,
  APU_SAMPLE_RATE,
  REG_NOISE_CTRL,
  REG_NOISE_PERIOD,
  REG_NOISE_VOL,
  REG_PULSE1_CTRL,
  REG_PULSE1_ENV,
  REG_PULSE1_PERIOD,
  REG_PULSE1_VOL,
  REG_SAMPLE_CTRL,
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
  REG_WAVE_PERIOD,
  REG_WAVE_VOL,
  SOUND_DEVICE_ID,
  SOUND_IRQ_SAMPLE_END,
} from '../src/core/sound';
import { SoundDevice } from '../src/core/soundDevice';
import { fromTribbles, fromTrits, tritsRaw } from '../src/core/tryte';

function fixture(): { m: Machine; s: SoundDevice } {
  const m = new Machine();
  const s = new SoundDevice(
    (addr) => m.peek(addr),
    (addr, v) => m.poke(addr, v),
  );
  m.attach(s);
  return { m, s };
}

function tickSamples(s: SoundDevice, count: number, irq: (line: number) => void = () => {}): number[] {
  for (let i = 0; i < count; i++) s.tick(APU_CYCLES_PER_SAMPLE, irq);
  return s.drainSamples();
}

function out(v: number, master = 13): number {
  return Math.round((v / 52) * 10 ** ((-13 + master) / 20) * 9841);
}

describe('SoundDevice', () => {
  test('retains recent samples in order when playback falls behind', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('100000000'));
    m.write(REG_PULSE1_CTRL, 3);
    m.write(REG_PULSE1_PERIOD, 3);
    m.write(REG_PULSE1_VOL, 5);
    const generated = APU_SAMPLE_RATE * 2 + 7;
    s.tick(generated * APU_CYCLES_PER_SAMPLE, () => {});
    expect(s.bufferedSamples).toBe(APU_SAMPLE_RATE);
    const prefix = s.drainSamples(17);
    expect(s.bufferedSamples).toBe(APU_SAMPLE_RATE - 17);
    const retained = [...prefix, ...s.drainSamples()];
    const expected = Array.from({ length: APU_SAMPLE_RATE }, (_, i) =>
      out((generated - APU_SAMPLE_RATE + i) % 4 < 2 ? 5 : -5));
    expect(retained).toEqual(expected);
    expect(s.bufferedSamples).toBe(0);
    expect(s.drainSamples()).toEqual([]);
    expect(tickSamples(s, 4)).toEqual(Array.from({ length: 4 }, (_, i) => out((generated + i) % 4 < 2 ? 5 : -5)));
  });

  test('reset clears retained samples and restarts oscillator phase', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('100000000'));
    m.write(REG_PULSE1_CTRL, 3);
    m.write(REG_PULSE1_PERIOD, 3);
    m.write(REG_PULSE1_VOL, 5);
    s.tick(APU_CYCLES_PER_SAMPLE * 3, () => {});
    s.drainSamples(1);
    s.reset();
    expect(s.bufferedSamples).toBe(0);
    expect(s.drainSamples()).toEqual([]);
    expect(tickSamples(s, 4)).toEqual([out(5), out(5), out(-5), out(-5)]);
  });

  test('constants map device S to _SA.._SZ and 3^9 Hz output', () => {
    expect(SOUND_DEVICE_ID).toBe(6);
    expect(REG_SOUND_MASTER).toBe(149);
    expect(REG_SOUND_STATUS).toBe(152);
    expect(APU_SAMPLE_RATE).toBe(19683);
    expect(APU_CYCLES_PER_SAMPLE).toBe(27);
  });

  test('pulse channel uses duty, period, volume, and master volume', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('100000000'));
    m.write(REG_PULSE1_CTRL, 3); // 50%
    m.write(REG_PULSE1_PERIOD, 3); // 4 APU samples per wave
    m.write(REG_PULSE1_VOL, 5);

    expect(tickSamples(s, 8)).toEqual([out(5), out(5), out(-5), out(-5), out(5), out(5), out(-5), out(-5)]);
  });

  test('master volume maps to -13 + register LUFS target', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_ENABLE, fromTrits('100000000'));
    m.write(REG_PULSE1_CTRL, 3);
    m.write(REG_PULSE1_PERIOD, 3);
    m.write(REG_PULSE1_VOL, 13);

    m.write(REG_SOUND_MASTER, 0);
    expect(tickSamples(s, 1)[0]).toBe(out(13, 0));

    m.write(REG_SOUND_MASTER, -5);
    expect(tickSamples(s, 1)[0]).toBe(out(13, -5));

    m.write(REG_SOUND_MASTER, 13);
    expect(tickSamples(s, 1)[0]).toBe(out(-13, 13));
  });

  test('wave channel reads a 27-tryte table and advances by period', () => {
    const { m, s } = fixture();
    const base = 1000;
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('001000000'));
    m.write(REG_WAVE_CTRL, 1);
    m.write(REG_WAVE_PERIOD, 1); // two output samples per table entry
    m.write(REG_WAVE_VOL, 13);
    m.write(REG_WAVE_BASE, base);
    m.poke(base, -3);
    m.poke(base + 1, 7);
    m.poke(base + 2, 13);

    expect(tickSamples(s, 6)).toEqual([out(-3), out(-3), out(7), out(7), out(13), out(13)]);
  });

  test('noise channel uses deterministic LFSR state', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('000100000'));
    m.write(REG_NOISE_CTRL, 1);
    m.write(REG_NOISE_PERIOD, 0);
    m.write(REG_NOISE_VOL, 4);

    const first = tickSamples(s, 6);
    s.reset();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('000100000'));
    m.write(REG_NOISE_CTRL, 1);
    m.write(REG_NOISE_PERIOD, 0);
    m.write(REG_NOISE_VOL, 4);
    const second = tickSamples(s, 6);

    expect(second).toEqual(first);
  });

  test('packed ADSR envelope ramps attack, decays to sustain, and releases', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('100000000'));
    m.write(REG_PULSE1_CTRL, 3);
    m.write(REG_PULSE1_PERIOD, 3);
    m.write(REG_PULSE1_VOL, fromTribbles('ZS_')); // max 13, sustain 6
    m.write(REG_PULSE1_ENV, fromTribbles('NNN')); // A/D/R: one 81 Hz tick per level

    expect(tickSamples(s, 242).some((v) => v !== 0)).toBe(false);
    const attack1 = tickSamples(s, 1)[0]!;
    expect(Math.abs(attack1)).toBe(out(1));

    tickSamples(s, 12 * 243);
    expect(Math.max(...tickSamples(s, 4).map(Math.abs))).toBe(out(13));

    tickSamples(s, 7 * 243);
    expect(Math.max(...tickSamples(s, 8).map(Math.abs))).toBe(out(6));

    m.write(REG_PULSE1_CTRL, 0);
    tickSamples(s, 243);
    expect(Math.max(...tickSamples(s, 8).map(Math.abs))).toBe(out(5));
  });

  test('volume zero is silent but does not force the envelope gate off', () => {
    const { m, s } = fixture();
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_ENABLE, fromTrits('100000000'));
    m.write(REG_PULSE1_CTRL, 3);
    m.write(REG_PULSE1_PERIOD, 3);
    m.write(REG_PULSE1_VOL, 0);
    m.write(REG_PULSE1_ENV, 0);

    expect(tickSamples(s, 16).every((v) => v === 0)).toBe(true);
    m.write(REG_PULSE1_VOL, 13);
    expect(tickSamples(s, 4).some((v) => Math.abs(v) === out(13))).toBe(true);
  });

  test('one-shot sample sets status, clears enable, and raises line 3', () => {
    const { m, s } = fixture();
    const irqs: number[] = [];
    const sample = 1200;
    m.write(REG_SOUND_MASTER, 13);
    m.write(REG_SOUND_IRQ, fromTrits('100000000'));
    m.write(REG_SOUND_ENABLE, fromTrits('000010000'));
    m.write(REG_SAMPLE_CTRL, 1);
    m.write(REG_SAMPLE_RATE, 0);
    m.write(REG_SAMPLE_VOL, 13);
    m.write(REG_SAMPLE_START, sample);
    m.write(REG_SAMPLE_LENGTH, 1);
    m.poke(sample, 9);

    expect(tickSamples(s, 1, (line) => irqs.push(line))).toEqual([out(9)]);
    expect(irqs).toEqual([SOUND_IRQ_SAMPLE_END]);
    expect(m.read(REG_SAMPLE_CTRL)).toBe(0);
    expect(tritsRaw(m.read(REG_SOUND_ENABLE))[4]).toBe(1);
    expect(tritsRaw(m.read(REG_SOUND_STATUS))[0]).toBe(2);

    m.write(REG_SOUND_STATUS, fromTrits('100000000'));
    expect(m.read(REG_SOUND_STATUS)).toBe(0);
  });
});
