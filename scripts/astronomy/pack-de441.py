#!/usr/bin/env python3
"""Derive compact, pinned 400-meter coefficients from the audited source media.

Stored columns contain third differences as signed varints, then deterministic
gzip. Decoding reconstructs native whole-meter coefficient disks; guest code
continues to evaluate all positions. No host orbital calculation is introduced.
"""
import argparse
import array
import gzip
import hashlib
import json
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'src/world/astronomy/data'
QUANTUM = 400
BASE = 19683
BLOCK = 243


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def limbs(value):
    result = []
    while value:
        following = (value + 9841) // BASE
        result.append(value - following * BASE)
        value = following
    return result


def encode_polynomial(coeff):
    digits = [limbs(value) for value in coeff]
    headers = [sum(len(d) * 5 ** j for j, d in enumerate(digits[i:i+5]))
               for i in range(0, len(coeff), 5)]
    return headers + [digit for ds in digits for digit in ds]


def signed_varint(value, output):
    value = value * 2 if value >= 0 else -value * 2 - 1
    while value >= 128:
        output.append((value & 127) | 128)
        value >>= 7
    output.append(value)


def pack(source, bodies):
    cells = array.array('h')
    cells.frombytes(source)
    if sys.byteorder != 'little':
        cells.byteswap()
    records = cells[4]
    columns = [[[] for _ in range(body['coefficientCount'] * 3)] for body in bodies]
    errors = [0] * len(bodies)
    output = list(cells[:BLOCK]) + [0] * (2 * records)
    for record in range(records):
        old_start = cells[BLOCK + record*2] * BLOCK + cells[BLOCK + record*2 + 1]
        start = len(output)
        output[BLOCK+record*2:BLOCK+record*2+2] = divmod(start, BLOCK)
        output.extend([0] * 11)
        for body, spec in enumerate(bodies):
            pointer = old_start + cells[old_start + body]
            output[start + body] = len(output) - start
            n = spec['coefficientCount']
            for piece in range(spec['piecesPer32Days']):
                for axis in range(3):
                    lengths = []
                    for header in cells[pointer:pointer+(n+4)//5]:
                        for _ in range(5):
                            lengths.append(header % 5)
                            header //= 5
                    pointer += (n+4)//5
                    coeff, error = [], 0
                    for k, length in enumerate(lengths[:n]):
                        value = sum(cells[pointer+j] * BASE**j for j in range(length))
                        pointer += length
                        quantized = (abs(value) + QUANTUM//2) // QUANTUM
                        if value < 0:
                            quantized = -quantized
                        columns[body][axis*n+k].append(quantized)
                        rounded = quantized * QUANTUM
                        coeff.append(rounded)
                        error += abs(rounded-value)
                    errors[body] = max(errors[body], error)
                    output.extend(encode_polynomial(coeff))
    used = len(output)
    output.extend([0] * (-used % BLOCK))
    native = struct.pack('<' + 'h' * len(output), *output)
    payload = bytearray(b'D441\x01' + struct.pack('<I', QUANTUM) + source[:BLOCK*2])
    for body in columns:
        for column in body:
            previous = first = second = 0
            for value in column:
                d1 = value-previous
                d2 = d1-first
                signed_varint(d2-second, payload)
                previous, first, second = value, d1, d2
    # Explicit filename/mtime keeps the gzip header stable across Python versions.
    import io
    compressed = io.BytesIO()
    with gzip.GzipFile(fileobj=compressed, mode='wb', filename='', mtime=0, compresslevel=9) as stream:
        stream.write(payload)
    return compressed.getvalue(), native, used, errors, len(payload)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify committed compressed digests offline')
    parser.add_argument('--refresh', action='store_true', help='Explicitly update digest files and manifest')
    args = parser.parse_args()
    target = DEST / 'de441-manifest.json'
    pinned = json.loads(target.read_text())
    if args.check:
        for volume in pinned['volumes']:
            payload = (DEST / volume['file']).read_bytes()
            if len(payload) != volume['bytes'] or digest(payload) != volume['sha256']:
                parser.error(f"Digest mismatch: {volume['file']}")
        print(f"Verified {len(pinned['volumes'])} compact DE441 digests")
        return
    original = json.loads((DEST / 'de441-source-manifest.json').read_text())
    volumes, errors = [], [0] * 11
    for entry in original['volumes']:
        source = (DEST / entry['file']).read_bytes()
        if len(source) != entry['bytes'] or digest(source) != entry['sha256']:
            parser.error(f"Source media mismatch: {entry['file']}")
        payload, native, used, bounds, unpacked = pack(source, original['bodies'])
        filename = entry['file'].replace('.bin', '.d441')
        volume = dict(entry, file=filename, bytes=len(payload), sha256=digest(payload),
                      usedCells=used, blocks=len(native)//(BLOCK*2),
                      nativeBytes=len(native), nativeSha256=digest(native), payloadBytes=unpacked)
        if not args.refresh:
            expected = next(v for v in pinned['volumes'] if v['file'] == filename)
            if expected != volume or (DEST / filename).read_bytes() != payload:
                parser.error(f'Nonreproducible compact digest: {filename}')
        else:
            (DEST / filename).write_bytes(payload)
        volumes.append(volume)
        errors = [max(a, b) for a, b in zip(errors, bounds)]
        print(f"{filename}: {len(payload):,} bytes", flush=True)
    manifest = dict(original, format='troika-de441-digest-v1',
                    transport='gzip-third-difference-zigzag-varint',
                    coefficientQuantumMeters=QUANTUM, volumes=volumes)
    audit = dict(original['audit'])
    # The source audit already bounds error to original JPL coefficients at all
    # times. |T_k(x)| <= 1 bounds this additional rounding independently.
    prior = float(audit['maxAxisCoefficientErrorBoundMeters'])
    argument = float(audit['maxAxisArgumentRoundingBoundMeters']) + QUANTUM/2 * sum(k*k for k in range(14)) / (2 * original['normalizedArgumentScale'])
    arithmetic = argument + 0.007
    axis = [error + prior + arithmetic for error in errors]
    earth = axis[2] + axis[9] / (1 + float(original['emrat']))
    vector = 3**0.5
    worst = max(max(axis), max(error+axis[10] for error in axis), earth+axis[10]) * vector
    if worst >= 10000:
        parser.error(f'10 km position error budget exceeded: {worst} m')
    audit.update(maxAxisCoefficientErrorBoundMeters=str(max(errors)+prior),
                 maxAxisArgumentRoundingBoundMeters=str(argument),
                 perBodyAxisErrorBoundMeters=axis,
                 maxCoordinateVectorErrorBoundMeters=worst,
                 targetCoordinateVectorErrorMeters=10000,
                 note='All-time bounds relative to original DE441 include barycentric, geocentric Sun and heliocentric subtraction; they are not physical ephemeris uncertainty.')
    manifest['audit'] = audit
    if args.refresh:
        target.write_text(json.dumps(manifest, indent=2)+'\n')
    elif manifest != pinned:
        parser.error('Compact digest manifest differs from pins')
    print(f"Total digest bytes: {sum(v['bytes'] for v in volumes):,}")
    print(f'Worst all-time coordinate vector error bound: {worst:.3f} meters')


if __name__ == '__main__':
    main()
