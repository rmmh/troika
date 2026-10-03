import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundDevice } from '../src/core/soundDevice';
import { APU_SAMPLE_RATE } from '../src/core/sound';
import { AudioOutput } from '../src/web/audioOutput';

describe('browser audio output', () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const node = {
      onaudioprocess: null as ((event: AudioProcessingEvent) => void) | null,
      connect: vi.fn(),
    };
    const resume = vi.fn(async () => {});
    const suspend = vi.fn(async () => {});
    vi.stubGlobal('window', {
      AudioContext: class {
        sampleRate = APU_SAMPLE_RATE;
        destination = {};
        createScriptProcessor = () => node;
        resume = resume;
        suspend = suspend;
      },
    });
    const device = new SoundDevice(() => 0, () => {});
    const drain = vi.spyOn(device, 'drainSamples').mockReturnValue([]);
    const audio = new AudioOutput();
    audio.start(device);
    function render(samples: number[], length = 64): Float32Array {
      drain.mockReturnValueOnce(samples);
      const out = new Float32Array(length).fill(NaN);
      node.onaudioprocess!({
        outputBuffer: { getChannelData: () => out },
      } as unknown as AudioProcessingEvent);
      return out;
    }
    return { audio, render, resume, suspend, device, node };
  }

  it('clears queued samples and filter history between programs', () => {
    const { audio, render } = setup();
    const first = render(Array(256).fill(9841));
    expect([...first]).toEqual(Array(64).fill(1));

    audio.reset();
    const nextProgram = render(Array(128).fill(0));
    expect([...nextProgram]).toEqual(Array(64).fill(0));
  });

  it('writes silence to the entire output buffer on underrun', () => {
    const { render } = setup();
    expect([...render([])]).toEqual(Array(64).fill(0));
    const partial = render(Array(40).fill(9841));
    expect([...partial.slice(0, 8)]).toEqual(Array(8).fill(1));
    expect([...partial.slice(8)]).toEqual(Array(56).fill(0));
  });

  it('drops stale output when emulation gets ahead of playback', () => {
    const { render } = setup();
    render(Array(10_000).fill(9841));
    // A full new chunk should be heard immediately, not after the old backlog.
    const current = render(Array(10_000).fill(-9841));
    expect([...current]).toEqual(Array(64).fill(-1));
    // At most 100ms of retained output remains, then playback returns to silence.
    const drained = render([], 2048);
    expect(drained.slice(1969 - 64).every((sample) => sample === 0)).toBe(true);
  });

  it('reuses its audio node when resuming playback', () => {
    const { audio, device, node, resume, suspend } = setup();
    audio.pause();
    audio.start(device);
    expect(suspend).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledTimes(2);
    expect(node.connect).toHaveBeenCalledOnce();
  });

  it('can start and reset when browser audio is unavailable', () => {
    vi.stubGlobal('window', {});
    const audio = new AudioOutput();
    const device = new SoundDevice(() => 0, () => {});
    expect(() => {
      audio.start(device);
      audio.pause();
      audio.reset();
    }).not.toThrow();
  });
});
