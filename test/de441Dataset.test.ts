import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const directory = resolve('src/world/astronomy/data');
interface Volume { file: string; firstYear: number; lastYear: number; firstRecordJdTdb: string;
  records: number; usedCells: number; blocks: number; bytes: number; sha256: string }
interface Body { name: string; coefficientCount: number; piecesPer32Days: number }
interface Manifest { volumes: Volume[]; bodies: Body[]; emrat: string;
  startJdTdb: string; stopExclusiveJdTdb: string;
  audit: { records: number; polynomials: number; coefficients: number;
    maxAxisCoefficientErrorBoundMeters: string; maxAxisArgumentRoundingBoundMeters: string } }
const manifest: Manifest = JSON.parse(readFileSync(resolve(directory, 'de441-manifest.json'), 'utf8'));
const media = manifest.volumes.map(v => {
  const bytes = readFileSync(resolve(directory, v.file));
  const cells = new Int16Array(bytes.length / 2);
  for (let i = 0; i < cells.length; i++) cells[i] = bytes.readInt16LE(i * 2);
  return { ...v, bytes, cells };
});
const Q = 3n ** 27n;
function rational(s: string): [bigint, bigint] {
  const [whole, fraction = ''] = s.split('.');
  return [BigInt(`${whole}${fraction}`), 10n ** BigInt(fraction.length)];
}
function round(a: bigint, b: bigint): bigint {
  return a < 0n ? -((-a + b / 2n) / b) : (a + b / 2n) / b;
}
function polynomial(cells: Int16Array, offset: number, n: number) {
  const count = Math.ceil(n / 5);
  const lengths: number[] = [];
  for (let i = 0; i < count; i++) {
    let header = cells[offset + i]!;
    if (header < 0 || header > 3124) throw new Error('Invalid coefficient header');
    for (let j = 0; j < 5; j++) { lengths.push(header % 5); header = Math.floor(header / 5); }
  }
  let next = offset + count;
  const coefficients: bigint[] = [];
  for (let i = 0; i < n; i++) {
    let value = 0n;
    let place = 1n;
    for (let j = 0; j < lengths[i]!; j++) {
      const digit = cells[next++]!;
      if (digit < -9841 || digit > 9841) throw new Error('Invalid limb');
      value += BigInt(digit) * place;
      place *= 19683n;
    }
    coefficients.push(value * 1000n);
  }
  return { coefficients, next };
}
function evaluate(coefficients: bigint[], x: bigint): number {
  let a = 0n, b = 0n;
  for (let i = coefficients.length - 1; i > 0; i--) {
    const next = round(2n * x * a, Q) - b + coefficients[i]!;
    b = a; a = next;
  }
  return Number(round(x * a, Q) - b + coefficients[0]!) / 1000;
}
function positions(date: string): number[][] {
  const [numerator, denominator] = rational(date);
  const volume = [...media].reverse().find(v =>
    numerator * 2n >= BigInt(Number(v.firstRecordJdTdb) * 2 - v.cells[5]! * 2) * denominator)!;
  const firstTwice = BigInt(Number(volume.firstRecordJdTdb) * 2);
  const relativeNumerator = numerator * 2n - firstTwice * denominator;
  const relativeDenominator = denominator * 2n;
  const record = Number(relativeNumerator / (relativeDenominator * 32n));
  const inRecord = relativeNumerator - BigInt(record * 32) * relativeDenominator;
  const index = 243 + record * 2;
  const start = volume.cells[index]! * 243 + volume.cells[index + 1]!;
  return manifest.bodies.map((body, b) => {
    const width = BigInt(32 / body.piecesPer32Days);
    const piece = Number(inRecord / (relativeDenominator * width));
    const within = inRecord - BigInt(piece) * relativeDenominator * width;
    const x = round((2n * within - relativeDenominator * width) * Q, relativeDenominator * width);
    let offset = start + volume.cells[start + b]!;
    for (let skip = 0; skip < piece * 3; skip++) offset = polynomial(volume.cells, offset, body.coefficientCount).next;
    const xyz = [];
    for (let axis = 0; axis < 3; axis++) {
      const p = polynomial(volume.cells, offset, body.coefficientCount);
      offset = p.next;
      xyz.push(evaluate(p.coefficients, x));
    }
    return xyz;
  });
}

describe('pinned full-span DE441 raw astronomy media', () => {
  it('independently agrees with Horizons Earth at J2000 TDB', () => {
    // https://ssd.jpl.nasa.gov/api/horizons.api ; queried 2026-10-04.
    // COMMAND=399 CENTER=500@0 TLIST=2451545 REF_PLANE=FRAME
    // VEC_CORR=NONE OUT_UNITS=KM-S TIME_TYPE=TDB; DE441 geometric ICRF.
    const expectedKm = [-2.756674048281145e7, 1.323613811535491e8, 5.741865328625385e7];
    const actual = positions('2451545.0');
    for (let axis=0; axis<3; axis++) {
      const earth = actual[2]![axis]! - actual[9]![axis]!/(1+Number(manifest.emrat));
      expect(Math.abs(earth-expectedKm[axis]!*1000)).toBeLessThan(7.2);
    }
  });
  it('pins every volume and keeps all blocks/record indexes within native bounds', () => {
    expect(media).toHaveLength(51);
    let polynomialCount = 0;
    for (const v of media) {
      expect(createHash('sha256').update(v.bytes).digest('hex')).toBe(v.sha256);
      expect(v.bytes.length).toBe(v.blocks * 243 * 2);
      expect(v.blocks).toBeLessThanOrEqual(9841);
      expect(Array.from(v.cells.slice(0, 5))).toEqual([441, 1, v.firstYear, v.lastYear-v.firstYear+1, v.records]);
      let previousEnd = 243 + v.records * 2;
      for (let r = 0; r < v.records; r++) {
        const index = 243 + r * 2;
        const start = v.cells[index]! * 243 + v.cells[index + 1]!;
        expect(start).toBe(previousEnd);
        let end = start + 11;
        manifest.bodies.forEach((body, b) => {
          if (start + v.cells[start+b]! !== end) throw new Error('Body index mismatch');
          for (let p = 0; p < body.piecesPer32Days * 3; p++) {
            end = polynomial(v.cells, end, body.coefficientCount).next;
            polynomialCount++;
          }
        });
        previousEnd = end;
      }
      expect(previousEnd).toBe(v.usedCells);
      expect(v.cells.slice(v.usedCells).every(v => v === 0)).toBe(true);
      // All year table entries produce the same exact record/remainder as civil dates.
      for (let year = v.firstYear; year <= v.lastYear+1; year++) {
        const date = new Date(0); date.setUTCFullYear(year,0,1); date.setUTCHours(0,0,0,0);
        const jd = date.getTime()/86400000+2440587.5;
        const delta = jd-Number(v.firstRecordJdTdb);
        const entry = 16+(year-v.firstYear)*2;
        expect([v.cells[entry],v.cells[entry+1]]).toEqual([Math.floor(delta/32),delta%32]);
      }
    }
    expect(polynomialCount).toBeGreaterThanOrEqual(manifest.audit.polynomials);
    expect(Number(manifest.audit.maxAxisCoefficientErrorBoundMeters)).toBeLessThanOrEqual(7);
    expect(Number(manifest.audit.maxAxisArgumentRoundingBoundMeters)).toBeLessThan(0.01);
  }, 60_000);

  it('matches original unquantized JPL series throughout every year and at arbitrary times', () => {
    interface Vector { jdTdb: string; meters: string[][]; earthMeters: string[]; sunGeocentricMeters: string[] }
    const fixture: { vectors: Vector[] } = JSON.parse(readFileSync(resolve('test/fixtures/de441-vectors.json'),'utf8'));
    expect(fixture.vectors.length).toBe(5358);
    let maxError = 0;
    for (const vector of fixture.vectors) {
      const actual = positions(vector.jdTdb);
      for (let body = 0; body < 11; body++) for (let axis = 0; axis < 3; axis++) {
        const error = Math.abs(actual[body]![axis]! - Number(vector.meters[body]![axis]));
        maxError = Math.max(maxError,error);
        if (error > 7.02) throw new Error(`${vector.jdTdb} ${body}/${axis}: ${error}m`);
      }
      for (let axis = 0; axis < 3; axis++) {
        const earth = actual[2]![axis]! - actual[9]![axis]!/(1+Number(manifest.emrat));
        expect(Math.abs(earth-Number(vector.earthMeters[axis]))).toBeLessThan(7.2);
        expect(Math.abs(actual[10]![axis]!-earth-Number(vector.sunGeocentricMeters[axis]))).toBeLessThan(14.3);
      }
    }
    expect(maxError).toBeGreaterThan(0);
  },30_000);
});
