/** Transport decoding only: restores native Chebyshev media, without evaluating it. */
const counts = [14, 10, 13, 11, 8, 7, 6, 6, 6, 13, 11];
const pieces = [4, 2, 2, 1, 1, 1, 1, 1, 1, 8, 2];
const block = 243;

export function unpackAstronomyDigest(payload: Uint8Array): Int16Array {
  if (payload.length < 495 || String.fromCharCode(...payload.slice(0, 4)) !== 'D441' || payload[4] !== 1)
    throw new Error('Invalid astronomy digest');
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const quantum = view.getUint32(5, true);
  if (quantum !== 400) throw new Error('Invalid coefficient quantum');
  const cells: number[] = Array.from({length: block}, (_, i) => view.getInt16(9 + i * 2, true));
  const records = cells[4]!;
  if (cells[0] !== 441 || cells[1] !== 1 || records < 1 || records > 1200)
    throw new Error('Invalid astronomy header');
  let cursor = 495;
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
    return Array.from({length: 3 * n}, () => {
      const values = new Float64Array(length);
      let value = 0, first = 0, second = 0;
      for (let i = 0; i < length; i++) {
        second += signedVarint(); first += second; value += first;
        const meters = value * quantum;
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
  while (cells.length % block) cells.push(0);
  if (cells.length / block > 9841 || cells.some(value => value < -9841 || value > 9841))
    throw new Error('Native astronomy bounds exceeded');
  return Int16Array.from(cells);
}
