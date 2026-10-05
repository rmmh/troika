#!/usr/bin/env python3
"""Pack JPL DE441 originals into immutable Troika raw block media.

No orbital approximation or fitted replacement is used. Input ASCII is retained
only in --cache (default /tmp). Runtime evaluates the stored Chebyshev series.
Download sources with --download; ordinary builds never contact JPL.
"""
import argparse
import array
import datetime
from decimal import Decimal as D, ROUND_HALF_UP, getcontext
import hashlib
import json
import math
from pathlib import Path
import random
import re
import sys
import urllib.request

getcontext().prec = 55
ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'src/world/astronomy/data'
BASE = 19683
BLOCK = 243
Q = 3 ** 27
BODY = list(zip(
    ['Mercury', 'Venus', 'Earth-Moon barycenter', 'Mars barycenter',
     'Jupiter barycenter', 'Saturn barycenter', 'Uranus barycenter',
     'Neptune barycenter', 'Pluto barycenter', 'Moon geocentric', 'Sun'],
    [3, 171, 231, 309, 342, 366, 387, 405, 423, 441, 753],
    [14, 10, 13, 11, 8, 7, 6, 6, 6, 13, 11],
    [4, 2, 2, 1, 1, 1, 1, 1, 1, 8, 2]))
URL = 'https://ssd.jpl.nasa.gov/ftp/eph/planets/ascii/de441/'
FILES = [('header.441', 'header.441', None),
         ('ascm02000.441', 'de441-m2000-full.txt', None),
         ('ascm01000.441', 'de441-m1000-full.txt', None),
         ('ascp00000.441', 'de441-0000-full.txt', None),
         ('ascp01000.441', 'de441-1000-full.txt', None),
         ('ascp02000.441', 'de441-2000-full.txt', None),
         ('ascp03000.441', 'de441-3000-edge.txt', 499999)]


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def jd(year, month=1, day=1):
    # Proleptic Gregorian with astronomical year numbering, including year zero.
    a = (14-month)//12
    y, m = year+4800-a, month+12*a-3
    return D(day+(153*m+2)//5+365*y+y//4-y//100+y//400-32045)-D('0.5')


def records(path):
    with path.open() as f:
        while True:
            line = f.readline()
            if not line:
                return
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) != 2 or parts[1] != '1018':
                raise ValueError(f'Invalid DE record header: {line!r}')
            text = [f.readline() for _ in range(340)]
            values = ' '.join(text).split()
            if len(values) < 1018:
                return  # The explicitly bounded final shard ends mid-record.
            yield [D(v.replace('D', 'E')) for v in values[:1018]]


def limbs(value):
    result = []
    while value:
        digit = (value + BASE // 2) % BASE - BASE // 2
        result.append(digit)
        value = (value - digit) // BASE
    return result


def polynomial(coeff):
    quantized = [int((v * 1000).to_integral_value(rounding=ROUND_HALF_UP)) for v in coeff]
    digits = [limbs(v) for v in quantized]
    headers = [sum(len(v) * 5 ** i for i, v in enumerate(digits[j:j + 5]))
               for j in range(0, len(digits), 5)]
    return headers + [digit for value in digits for digit in value], quantized


def clenshaw(coeff, x):
    a = b = D(0)
    for c in coeff[:0:-1]:
        a, b = 2 * x * a - b + c, a
    return x * a - b + coeff[0]


def vectors(record, date, emrat):
    result = []
    for name, start, n, pieces in BODY:
        width = D(32) / pieces
        piece = min(pieces - 1, int((date - record[0]) / width))
        x = (date - record[0] - width * piece) * 2 / width - 1
        xyz = []
        for axis in range(3):
            p = start - 1 + (piece * 3 + axis) * n
            xyz.append(clenshaw(record[p:p + n], x) * 1000)
        result.append(xyz)
    earth = [result[2][i] - result[9][i] / (1 + emrat) for i in range(3)]
    sun_geo = [result[10][i] - earth[i] for i in range(3)]
    return dict(jdTdb=str(date), meters=[[str(v.quantize(D('0.000001'))) for v in xyz]
                                       for xyz in result],
                earthMeters=[str(v.quantize(D('0.000001'))) for v in earth],
                sunGeocentricMeters=[str(v.quantize(D('0.000001'))) for v in sun_geo])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/tmp'))
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    if args.download:
        for remote, local, end in FILES:
            if (args.cache / local).exists():
                continue  # Explicit cache reuse; source hashes remain recorded.
            print(f'Downloading {remote}', flush=True)
            req = urllib.request.Request(URL + remote,
                headers={'Range': f'bytes=0-{end}'} if end else {})
            with urllib.request.urlopen(req, timeout=300) as response:
                with (args.cache / (local+'.part')).open('wb') as output:
                    while chunk := response.read(1 << 20):
                        output.write(chunk)
            (args.cache / (local+'.part')).replace(args.cache / local)
    sources = [dict(url=URL + remote, sha256=sha(args.cache / local),
                    bytes=(args.cache / local).stat().st_size,
                    byteRange=f'0-{end}' if end else None)
               for remote, local, end in FILES]
    header = (args.cache / 'header.441').read_text()
    names = header.split('GROUP   1040')[1].split('GROUP   1041')[0].split()[1:]
    vals = header.split('GROUP   1041')[1].split('GROUP   1050')[0].split()[1:]
    emrat = D(vals[names.index('EMRAT')].replace('D', 'E'))
    start, stop = jd(-1999), jd(3001)
    packed_start = jd(-2000)
    # One date in every year, exact boundaries, plus deterministic arbitrary times.
    dates = {jd(y, 7, 1) + D('0.314159265') for y in range(-1999, 3001)}
    dates.update([start, stop - D('0.000000001')])
    for year in range(-1900, 3001, 100):
        dates.update([jd(year) - D('0.000000001'), jd(year)])
    rng = random.Random(441)
    for _ in range(256):
        dates.add(start + D(rng.randrange(int((stop - start) * 86400000))) / 86400000)
    dates = sorted(dates)
    date_index = 0
    packed_records = []
    fixtures = []
    max_quant_error = D(0)
    max_argument_error = D(0)
    coefficient_count = polynomial_count = 0
    previous = None
    for _, local, _ in FILES[1:]:
        for rec in records(args.cache / local):
            if rec[1] <= packed_start or rec[0] >= stop:
                continue
            if rec[0] == previous:
                continue
            if packed_records and rec[0] != packed_records[-1][0] + 32:
                raise ValueError(f'Gap/overlap at {rec[0]}')
            previous = rec[0]
            packed = [0] * 11
            for body, (_, offset, n, pieces) in enumerate(BODY):
                packed[body] = len(packed)
                for piece in range(pieces):
                    for axis in range(3):
                        p = offset - 1 + (piece * 3 + axis) * n
                        coeff = rec[p:p+n]
                        encoded, quantized = polynomial(coeff)
                        packed.extend(encoded)
                        coefficient_count += n
                        polynomial_count += 1
                        quant_error = sum(abs(D(q) - c*1000) for q,c in zip(quantized, coeff))
                        max_quant_error = max(max_quant_error, quant_error)
                        # |T'_k(x)| <= k*k for -1<=x<=1; nearest x quantization.
                        deriv = sum(D(k*k)*abs(c)*1000 for k,c in enumerate(coeff))
                        max_argument_error = max(max_argument_error, deriv / (2*Q))
            packed_records.append((rec[0], packed))
            while date_index < len(dates) and dates[date_index] < rec[1]:
                date = dates[date_index]
                if date < rec[0]:
                    raise ValueError('Missing fixture date')
                fixtures.append(vectors(rec, date, emrat))
                date_index += 1
            if len(packed_records) % 2000 == 0:
                print(f'Packed {len(packed_records)} records', flush=True)
    if date_index != len(dates) or packed_records[-1][0] + 32 < stop:
        raise ValueError('Incomplete date coverage')
    DEST.mkdir(parents=True, exist_ok=True)
    volumes = []
    for year in range(-2000, 3001, 100):
        last_year = min(year+100, 3001)
        first, end = jd(year), jd(last_year)
        chosen = [(date, data) for date,data in packed_records if date < end and date+32 > first]
        # One header block: 16 fixed cells, then 101 (record,remainder) year entries.
        cells = [0] * BLOCK
        cells[:16] = [441, 1, year, last_year-year, len(chosen),
                      int(chosen[0][0]-first), 1, 2, 11, 32, 1, 5, 0, 0, 0, 0]
        for y in range(year, last_year+1):
            offset = int(jd(y)-chosen[0][0])
            cells[16+(y-year)*2:18+(y-year)*2] = list(divmod(offset,32))
        cells.extend([0] * (2*len(chosen)))
        for index, (_, data) in enumerate(chosen):
            cells[BLOCK+2*index:BLOCK+2*index+2] = list(divmod(len(cells),BLOCK))
            cells.extend(data)
        used = len(cells)
        cells.extend([0] * ((-len(cells)) % BLOCK))
        if len(cells)//BLOCK > 9841 or any(abs(c)>9841 for c in cells):
            raise ValueError('Native volume bounds exceeded')
        binary = array.array('h', cells)
        if sys.byteorder != 'little':
            binary.byteswap()
        filename=f'de441-{year}.bin'
        path=DEST/filename
        path.write_bytes(binary.tobytes())
        volumes.append(dict(file=filename, firstYear=year, lastYear=last_year-1,
            firstRecordJdTdb=str(chosen[0][0]), records=len(chosen),
            usedCells=used, blocks=len(cells)//BLOCK, bytes=path.stat().st_size,
            sha256=sha(path)))
    manifest = dict(format='troika-de441-v1', source='JPL DE441',
        frame='ICRF3 geometric', timeScale='TDB', calendar='proleptic Gregorian',
        startJdTdb=str(start), stopExclusiveJdTdb=str(stop), yearRange=[-1999,3000], yearNumbering='astronomical (0 = 1 BCE)',
        coefficientQuantumMeters=1, evaluationUnitMeters='0.001',
        normalizedArgumentScale=Q, limbBase=BASE, coefficientLengthRadix=5,
        coefficientLengthsPerHeader=5, emrat=str(emrat),
        bodies=[dict(name=name, coefficientCount=n, piecesPer32Days=p)
                for name,_,n,p in BODY], sources=sources, volumes=volumes,
        audit=dict(records=len(packed_records), polynomials=polynomial_count,
            coefficients=coefficient_count, vectorFixtures=len(fixtures),
            maxAxisCoefficientErrorBoundMeters=str(max_quant_error),
            maxAxisArgumentRoundingBoundMeters=str(max_argument_error),
            maxAxisClenshawRoundingBoundMeters='0.007',
            note='Bounds concern representation relative to supplied DE441, not physical ephemeris uncertainty.'))
    (DEST/'de441-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    fixture_path=ROOT/'test/fixtures/de441-vectors.json'
    fixture_path.parent.mkdir(parents=True,exist_ok=True)
    fixture_path.write_text(json.dumps(dict(source='Independent Decimal evaluation of JPL ASCII before quantization', vectors=fixtures),separators=(',',':'))+'\n')
    print(json.dumps(manifest['audit'],indent=2))
    print('Total binary bytes:',sum(v['bytes'] for v in volumes))


if __name__ == '__main__':
    main()
