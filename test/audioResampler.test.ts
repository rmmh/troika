import { describe, expect, it } from 'vitest';
import { APU_SAMPLE_RATE } from '../src/core/sound';
import { SincResampler } from '../src/web/audioResampler';

describe('streaming audio resampler', () => {
  it.each([0, -1, NaN, Infinity])('rejects invalid sample rate %s', rate => {
    expect(() => new SincResampler(rate)).toThrow(RangeError);
  });

  it.each([8000, 44100, 48000, 96000])('preserves constant level at %i Hz', rate => {
    const output = new SincResampler(rate).process(new Int16Array(512).fill(4920));
    expect(output.length).toBeGreaterThan(0);
    for (const sample of output) expect(sample).toBeCloseTo(4920 / 9841, 6);
  });

  it.each([8000, 44100, 48000, 96000])('is independent of input chunk boundaries at %i Hz', rate => {
    const input = Int16Array.from({ length: 4096 }, (_, i) => Math.round(8000 * Math.sin(i * 0.071)));
    const expected = new SincResampler(rate).process(input);
    const stream = new SincResampler(rate);
    const actual: number[] = [];
    for (let start = 0; start < input.length; start += 37) {
      actual.push(...stream.process(input.subarray(start, start + 37)));
      expect(stream.process([]).length).toBe(0);
    }
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i++) expect(actual[i]).toBeCloseTo(expected[i]!, 6);
  });

  it('rejects frequencies above the output Nyquist limit when downsampling', () => {
    const input = Int16Array.from({ length: 2048 }, (_, i) => i % 2 ? -9841 : 9841);
    const output = new SincResampler(APU_SAMPLE_RATE / 2).process(input);
    expect(output.length).toBeGreaterThan(900);
    expect(Math.max(...output.map(Math.abs))).toBeLessThan(0.001);
  });

  it('preserves an audible tone when downsampling', () => {
    const input = Int16Array.from({ length: 8192 }, (_, i) =>
      Math.round(9841 * Math.sin(2 * Math.PI * 1000 * i / APU_SAMPLE_RATE)));
    const output = new SincResampler(8000).process(input);
    const rms = Math.sqrt(output.reduce((sum, sample) => sum + sample * sample, 0) / output.length);
    expect(rms).toBeCloseTo(Math.SQRT1_2, 2);
  });
});
