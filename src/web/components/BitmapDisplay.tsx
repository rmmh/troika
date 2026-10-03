import { useEffect, useRef } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';
import { renderTextPixels } from '../../core/textDisplay';
import { DISPLAY_PX, renderBitmapPixels } from '../../core/display';

const SCALE = 3;
const CANVAS_SIZE = DISPLAY_PX * SCALE;

export function BitmapDisplay({ emu, text = false }: { emu: EmulatorController; text?: boolean }) {
  useEmulator(emu);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!imgRef.current) imgRef.current = ctx.createImageData(DISPLAY_PX, DISPLAY_PX);

    const img = imgRef.current;
    (text ? renderTextPixels : renderBitmapPixels)(new Uint32Array(img.data.buffer), emu.machine.mem, (a) => emu.machine.peek(a));
    ctx.putImageData(img, 0, 0);
  });

  return (
    <canvas
      ref={canvasRef}
      width={DISPLAY_PX}
      height={DISPLAY_PX}
      style={`width:${CANVAS_SIZE}px; height:${CANVAS_SIZE}px; border:1px solid #26263a; flex-shrink:0; image-rendering:pixelated`}
      title={text ? 'text display' : 'hi-res bitmap display'}
    />
  );
}
