import type { SoundDevice } from '../core/soundDevice';
import { SincResampler } from './audioResampler';

type AudioContextCtor = new () => AudioContext;

export class AudioOutput {
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private resampler: SincResampler | null = null;
  private queue: number[] = [];

  start(device: SoundDevice): void {
    const Ctor = window.AudioContext as AudioContextCtor | undefined;
    if (!Ctor) return;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.resampler = new SincResampler(this.ctx.sampleRate);
      this.node = this.ctx.createScriptProcessor(1024, 0, 1);
      this.node.onaudioprocess = (e) => this.fill(e, device);
      this.node.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  pause(): void {
    void this.ctx?.suspend();
  }

  reset(): void {
    this.queue.length = 0;
    this.resampler = this.ctx ? new SincResampler(this.ctx.sampleRate) : null;
  }

  private fill(e: AudioProcessingEvent, device: SoundDevice): void {
    const fresh = this.resampler?.process(device.drainSamples()) ?? new Float32Array();
    for (let i = 0; i < fresh.length; i++) this.queue.push(fresh[i]!);

    const out = e.outputBuffer.getChannelData(0);
    const count = Math.min(out.length, this.queue.length);
    for (let i = 0; i < count; i++) out[i] = this.queue[i]!;
    out.fill(0, count);
    this.queue.splice(0, count);
  }
}
