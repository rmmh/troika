import { APU_SAMPLE_RATE } from '../core/sound';

function sinc(x: number): number {
  if (Math.abs(x) < 1e-8) return 1;
  const p = Math.PI * x;
  return Math.sin(p) / p;
}

function blackmanWindow(x: number, radius: number): number {
  const t = (x + radius) / (2 * radius);
  return 0.42 - 0.5 * Math.cos(2 * Math.PI * t) + 0.08 * Math.cos(4 * Math.PI * t);
}

/**
 * High-quality mono resampler for the deterministic 3^9 Hz APU stream.
 * Hardware tests should assert the source samples; this is a browser output
 * adapter for AudioContext rates.
 */
export class SincResampler {
  private readonly inputRate = APU_SAMPLE_RATE;
  private readonly radius = 16;
  private readonly history: number[] = [];
  private sourcePos = 0;

  constructor(private readonly outputRate: number) {}

  process(input: ArrayLike<number>): Float32Array {
    for (let i = 0; i < input.length; i++) this.history.push(input[i]! / 9841);
    const ratio = this.inputRate / this.outputRate;
    const outLen = Math.max(0, Math.floor((this.history.length - this.radius * 2 - this.sourcePos) / ratio));
    const out = new Float32Array(outLen);

    for (let i = 0; i < out.length; i++) {
      const center = this.sourcePos + i * ratio + this.radius;
      const lo = Math.max(0, Math.floor(center) - this.radius + 1);
      const hi = Math.min(this.history.length - 1, Math.floor(center) + this.radius);
      let sum = 0;
      let weight = 0;
      for (let j = lo; j <= hi; j++) {
        const x = center - j;
        const w = sinc(x) * blackmanWindow(x, this.radius);
        sum += this.history[j]! * w;
        weight += w;
      }
      out[i] = weight === 0 ? 0 : sum / weight;
    }

    this.sourcePos += out.length * ratio;
    const drop = Math.max(0, Math.floor(this.sourcePos));
    if (drop > 0) {
      this.history.splice(0, drop);
      this.sourcePos -= drop;
    }
    return out;
  }
}
