import models from './data/de441-models.json';

/** Storage predictors and corrections restore the native coefficient media. */
const counts = [14, 10, 13, 11, 8, 7, 6, 6, 6, 13, 11];
const pieces = [4, 2, 2, 1, 1, 1, 1, 1, 1, 8, 2];
const block = 243;

export function unpackAstronomyDigest(payload: Uint8Array): Int16Array {
  if (payload.length < 495 || String.fromCharCode(...payload.slice(0, 4)) !== 'D441' || ![1, 2].includes(payload[4]!))
    throw new Error('Invalid astronomy digest');
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const quantum = view.getUint32(5, true);
  const predicted = payload[4] === 2;
  if (quantum !== (predicted ? 1 : 400)) throw new Error('Invalid coefficient quantum');
  const cells: number[] = Array.from({length: block}, (_, i) => view.getInt16(9 + i * 2, true));
  const records = cells[4]!;
  if (cells[0] !== 441 || cells[1] !== 1 || records < 1 || records > 1200)
    throw new Error('Invalid astronomy header');
  if (predicted && payload.length < 497) throw new Error('Truncated astronomy digest');
  const fixedBlocks = predicted ? view.getUint16(495, true) : 0;
  if (predicted && (fixedBlocks < 1 || fixedBlocks > 9841)) throw new Error('Native astronomy bounds exceeded');
  let cursor = predicted ? 497 : 495;
  function signedVarint(): number {
    let value = 0, place = 1;
    for (let i = 0; i < 8; i++) {
      if (cursor >= payload.length) throw new Error('Truncated astronomy digest');
      const byte = payload[cursor++]!;
      value += (byte & 127) * place;
      if (!Number.isSafeInteger(value)) throw new Error('Oversized coefficient difference');
      if (byte < 128) return value % 2 ? -(value + 1) / 2 : value / 2;
      place *= 128;
    }
    throw new Error('Invalid coefficient difference');
  }
  const bodies = counts.map((n, body) => {
    const length = records * pieces[body]!;
    const correction = predicted ? prediction(body, records, signedVarint) : null;
    return Array.from({length: 3 * n}, (_, column) => {
      const values = new Float64Array(length);
      let value = 0, first = 0, second = 0;
      for (let i = 0; i < length; i++) {
        second += signedVarint(); first += second; value += first;
        const meters = predicted ? (value + correction![i * 3 * n + column]!) * quanta[body]! : value * quantum;
        if (!Number.isSafeInteger(meters) || Math.abs(meters) > 10_000_000_000_000)
          throw new Error('Invalid coefficient magnitude');
        values[i] = meters;
      }
      return values;
    });
  });
  if (cursor !== payload.length) throw new Error('Trailing astronomy data');
  cells.push(...new Array<number>(records * 2).fill(0));
  for (let record = 0; record < records; record++) {
    const start = cells.length;
    cells[block + record * 2] = Math.floor(start / block);
    cells[block + record * 2 + 1] = start % block;
    cells.push(...new Array<number>(11).fill(0));
    for (let body = 0; body < 11; body++) {
      const n = counts[body]!;
      cells[start + body] = cells.length - start;
      for (let piece = 0; piece < pieces[body]!; piece++) for (let axis = 0; axis < 3; axis++) {
        const limbs = Array.from({length: n}, (_, k) => {
          let value = bodies[body]![axis * n + k]![record * pieces[body]! + piece]!;
          const digits: number[] = [];
          while (value) {
            const next = Math.floor((value + 9841) / 19683);
            digits.push(value - next * 19683); value = next;
          }
          if (digits.length > 4) throw new Error('Oversized native coefficient');
          return digits;
        });
        for (let i = 0; i < n; i += 5)
          cells.push(limbs.slice(i, i + 5).reduce((sum, digits, j) => sum + digits.length * 5 ** j, 0));
        for (const digits of limbs) cells.push(...digits);
      }
    }
  }
  if (predicted) {
    if (fixedBlocks < 1 || fixedBlocks > 9841 || cells.length > fixedBlocks * block) throw new Error('Native astronomy bounds exceeded');
    while (cells.length < fixedBlocks * block) cells.push(0);
  } else while (cells.length % block) cells.push(0);
  if (cells.length / block > 9841 || cells.some(value => value < -9841 || value > 9841))
    throw new Error('Native astronomy bounds exceeded');
  return Int16Array.from(cells);
}

const quanta = [8000,8000,8000,8000,8000,8000,8000,8000,8000,400,1000];
const pi = 3.141592653589793;
function sincos(phase: number): [number, number] {
  const quadrant = Math.floor(phase / (pi / 2) + 0.5), x = phase - quadrant * (pi / 2), xx = x * x;
  let s = 1 / 355687428096000;
  for (const term of [-1/1307674368000,1/6227020800,-1/39916800,1/362880,-1/5040,1/120,-1/6,1]) s = term + xx * s;
  const sine = x * s;
  let c = 1 / 20922789888000;
  for (const term of [-1/87178291200,1/479001600,-1/3628800,1/40320,-1/720,1/24,-1/2,1]) c = term + xx * c;
  switch (((quadrant % 4) + 4) % 4) {
    case 0: return [sine,c]; case 1: return [c,-sine]; case 2: return [-sine,-c]; default: return [-c,sine];
  }
}

/** Change a polynomial's interval through coefficient algebra. */
function compose(c: Float64Array, offset: number, count: number, alpha: number, beta: number, requested: number): Float64Array {
  const n = Math.max(requested, count), out = new Float64Array(3 * n);
  let before = new Float64Array(n), current = new Float64Array(n);
  before[0] = 1; current[0] = alpha; current[1] = beta;
  for (let k = 0; k < count; k++) {
    const basis = k === 0 ? before : current;
    for (let axis = 0; axis < 3; axis++) for (let j = 0; j < n; j++)
      out[axis * n + j]! += basis[j]! * c[offset + k * 3 + axis]!;
    if (k) {
      const next = new Float64Array(n);
      for (let j = 0; j < n; j++) next[j] = 2 * alpha * current[j]! - before[j]!;
      for (let j = 0; j < n; j++) {
        if (j + 1 < n) next[j + 1]! += beta * current[j]!;
        next[Math.abs(j - 1)]! += beta * current[j]!;
      }
      before = current; current = next;
    }
  }
  if (n === requested) return out;
  const trimmed = new Float64Array(3 * requested);
  for (let axis = 0; axis < 3; axis++) trimmed.set(out.subarray(axis * n, axis * n + requested), axis * requested);
  return trimmed;
}

function prediction(body: number, records: number, signedVarint: () => number): Float64Array {
  const model = models[body]!, n = counts[body]!, width = 32 / pieces[body]!, duration = records * 32;
  const count = model.kind === 'periodic' ? model.trend! + 1 + model.frequencies!.length * 6
    : Math.ceil(duration / model.widthDays!) * model.count!;
  const c = Float64Array.from({length: count * 3}, () => signedVarint() * model.quantumMeters);
  if (c.some(v => !Number.isSafeInteger(v) || Math.abs(v) > 1e14)) throw new Error('Invalid predictor coefficients');
  const out = new Float64Array(records * pieces[body]! * 3 * n);
  const cosineWave = new Float64Array(n + 2), sineWave = new Float64Array(n + 2);
  for (let piece = 0; piece < records * pieces[body]!; piece++) {
    const midpoint = (piece + 0.5) * width;
    let coeff: Float64Array;
    if (model.kind === 'polynomial') {
      const at = Math.floor(midpoint / model.widthDays!);
      coeff = compose(c, at * model.count! * 3, model.count!, 2 * (midpoint - at * model.widthDays!) / model.widthDays! - 1, width / model.widthDays!, n);
    } else {
      const alpha = 2 * midpoint / duration - 1, beta = width / duration;
      coeff = compose(c, 0, model.trend! + 1, alpha, beta, n);
      let offset = (model.trend! + 1) * 3;
      const b20 = 2 * alpha * alpha - 1 + beta * beta;
      const b21 = 2 * alpha * beta + beta * alpha + beta * alpha, b22 = beta * beta;
      for (let mode = 0; mode < model.frequencies!.length; mode++) {
        const [sine, cosine] = sincos((2 * pi * model.frequencies![mode]!) * midpoint);
        for (let k = 0; k < n + 2; k++) {
          const factor = (k === 0 ? 1 : 2) * (Math.floor(k / 2) % 2 ? -1 : 1) * model.bessel![mode]![k]!;
          cosineWave[k] = factor * (k % 2 === 0 ? cosine : -sine);
          sineWave[k] = factor * (k % 2 === 0 ? sine : cosine);
        }
        for (let half = 0; half < 2; half++) {
          const wave = half === 0 ? cosineWave : sineWave;
          for (let axis = 0; axis < 3; axis++) {
            const c0 = c[offset + axis]!, c1 = c[offset + 3 + axis]!, c2 = c[offset + 6 + axis]!;
            const amp0 = c0 + alpha * c1 + b20 * c2, amp1 = beta * c1 + b21 * c2, amp2 = b22 * c2;
            for (let k = 0; k < n; k++) {
              const first = k === 0 ? wave[1]! * 0.5 : k === 1 ? wave[0]! + wave[2]! * 0.5 : (wave[Math.abs(k - 1)]! + wave[k + 1]!) * 0.5;
              const second = k === 0 ? wave[2]! * 0.5 : k === 2 ? wave[0]! + wave[4]! * 0.5 : (wave[Math.abs(k - 2)]! + wave[k + 2]!) * 0.5;
              coeff[axis * n + k]! += amp0 * wave[k]! + amp1 * first + amp2 * second;
            }
          }
          offset += 9;
        }
      }
    }
    for (let axis = 0; axis < 3; axis++) for (let k = 0; k < n; k++)
      out[piece * 3 * n + axis * n + k] = Math.floor(coeff[axis * n + k]! / quanta[body]! + 0.5);
  }
  return out;
}
