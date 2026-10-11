#!/usr/bin/env python3
"""Pack DE441 below 4 MB using storage prediction plus audited coefficient corrections.

Preparation requires numpy/scipy and the pinned importer output. Offline --check
needs only Python's standard library. Full precision ASCII/media stay untracked.
"""

import argparse
import gzip
import hashlib
import json
import struct
import io
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "src/world/astronomy/data"
BLOCK = 243


def digest(b):
    return hashlib.sha256(b).hexdigest()


def varint(v, out):
    v = 2 * int(v) if v >= 0 else -2 * int(v) - 1
    while v >= 128:
        out.append((v & 127) | 128)
        v >>= 7
    out.append(v)


def zipped(b):
    out = io.BytesIO()
    with gzip.GzipFile(
        fileobj=out, mode="wb", filename="", mtime=0, compresslevel=9
    ) as f:
        f.write(b)
    return out.getvalue()


def native_polynomial(values):
    digits = []
    for v in values:
        ds = []
        while v:
            following = (int(v) + 9841) // 19683
            ds.append(int(v) - following * 19683)
            v = following
        digits.append(ds)
    return [
        sum(len(d) * 5**j for j, d in enumerate(digits[i : i + 5]))
        for i in range(0, len(values), 5)
    ] + [v for ds in digits for v in ds]


def predictor_coefficients(payload, models, records):
    """Read pinned amplitude choices; their corrections are regenerated from JPL."""
    from digest_model import COUNTS, PIECES

    if payload[4] != 2:
        return None
    cursor = 497

    def read():
        nonlocal cursor
        value = shift = 0
        while True:
            if cursor >= len(payload):
                raise ValueError("Truncated predictor archive")
            byte = payload[cursor]
            cursor += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return -(value + 1) // 2 if value & 1 else value // 2
            shift += 7
            if shift > 56:
                raise ValueError("Oversized predictor value")

    result = []
    for body, model in enumerate(models):
        count = (
            (model["trend"] + 1 + 6 * len(model["frequencies"]))
            if model["kind"] == "periodic"
            else ((records * 32 + model["widthDays"] - 1) // model["widthDays"])
            * model["count"]
        )
        result.append([read() for _ in range(count * 3)])
        for _ in range(records * PIECES[body] * 3 * COUNTS[body]):
            read()
    if cursor != len(payload):
        raise ValueError("Trailing predictor archive bytes")
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--check", action="store_true")
    p.add_argument("--refresh", action="store_true")
    p.add_argument("--refit", action="store_true")
    p.add_argument(
        "--source-cache", type=Path, default=Path("/tmp/troika-de441-float.npy")
    )
    args = p.parse_args()
    target = DEST / "de441-manifest.json"
    pinned = json.loads(target.read_text())
    if args.check:
        if (
            digest((DEST / "de441-models.json").read_bytes())
            != pinned["predictorSha256"]
        ):
            p.error("Predictor dictionary checksum mismatch")
        files = [DEST / v["file"] for v in pinned["volumes"]]
        for v, path in zip(pinned["volumes"], files):
            data = path.read_bytes()
            if len(data) != v["bytes"] or digest(data) != v["sha256"]:
                p.error(f"Digest mismatch: {path.name}")
        extras = [
            DEST / "de441-models.json",
            DEST / "de441-manifest.json",
            DEST / "de441-source-manifest.json",
            ROOT / "test/fixtures/de441-vectors.json.gz",
            ROOT / "test/fixtures/de441-polynomials.json",
        ]
        if sum(f.stat().st_size for f in files + extras) > 4000000:
            p.error("4 MB astronomy data budget exceeded")
        print(
            f"Verified {len(files)} DE441 volumes, {sum(f.stat().st_size for f in files):,} compressed bytes"
        )
        return
    import numpy as np
    from numpy.polynomial.chebyshev import chebvander
    from scipy.fft import dct
    from scipy.linalg import cho_factor, cho_solve
    from digest_model import COUNTS, PIECES, QUANTA, predict

    # Reuse the importer's pinned original coefficients; build a compact float
    # workspace once from its ASCII cache rather than decoding limb media again.
    if not args.source_cache.exists():
        p.error("Missing source float cache; run astronomy:prepare")
    source_hash = hashlib.file_digest(
        args.source_cache.open("rb"), "sha256"
    ).hexdigest()
    if pinned.get("sourceFloatSha256", source_hash) != source_hash:
        p.error("Original coefficient cache checksum mismatch")
    source = np.load(args.source_cache, mmap_mode="r")
    first = source[0, 0]
    offsets = [3, 171, 231, 309, 342, 366, 387, 405, 423, 441, 753]

    def state(t, b):
        index = np.floor((t - first) / 32).astype(int)
        piece = np.minimum(
            PIECES[b] - 1,
            np.floor((t - source[index, 0]) / (32 / PIECES[b])).astype(int),
        )
        x = 2 * (t - source[index, 0] - piece * 32 / PIECES[b]) / (32 / PIECES[b]) - 1
        c = source[
            index[:, None, None],
            offsets[b]
            - 1
            + piece[:, None, None] * 3 * COUNTS[b]
            + np.arange(3)[None, :, None] * COUNTS[b]
            + np.arange(COUNTS[b])[None, None, :],
        ]
        return np.polynomial.chebyshev.chebval(x, c.transpose(2, 1, 0), tensor=False).T

    original = json.loads((DEST / "de441-source-manifest.json").read_text())
    models = json.loads((DEST / "de441-models.json").read_text())
    fits = {}
    volumes = []
    errors = np.zeros(11)
    for entry in original["volumes"]:
        records = entry["records"]
        start = float(entry["firstRecordJdTdb"])
        duration = records * 32
        if records < 100:
            edge = next(
                v for v in pinned["volumes"] if v["firstYear"] == entry["firstYear"]
            )
            data = (DEST / edge["file"]).read_bytes()
            raw = gzip.decompress(data)
            if len(data) != edge["bytes"] or digest(data) != edge["sha256"]:
                p.error("Pinned year-3000 edge archive changed")
            if raw[:5] != b"D441\x01" or struct.unpack_from("<I", raw, 5)[0] != 400:
                p.error("Unexpected year-3000 coefficient quantum")
            # Its audited v1 quantization is at most n * 200 m per axis.
            # The original source/guest rounding allowance is added below.
            errors = np.maximum(errors, np.asarray(COUNTS) * 200)
            volumes.append(edge)
            continue
        old = gzip.decompress(
            (DEST / entry["file"].replace(".bin", ".d441")).read_bytes()
        )
        retained = None if args.refit else predictor_coefficients(old, models, records)
        header = old[9:495]
        cells = list(struct.unpack("<243h", header)) + [0] * (records * 2)
        payload = bytearray(
            b"D441\x02"
            + struct.pack("<I", 1)
            + header
            + struct.pack("<H", entry["blocks"])
        )
        all_columns = []
        index = int(round((start - first) / 32))
        for b, model in enumerate(models):
            if retained is not None:
                shape = (
                    (-1, 3) if model["kind"] == "periodic" else (-1, model["count"], 3)
                )
                ci = np.asarray(retained[b], dtype=np.int64).reshape(shape)
            else:
                if model["kind"] == "periodic":
                    key = (b, records)
                    if key not in fits:
                        ts = np.arange(0, duration, 2 if b == 9 else 4)
                        x = 2 * ts / duration - 1
                        poly = chebvander(x, 2)
                        a = np.concatenate(
                            [chebvander(x, 8)]
                            + [
                                np.concatenate(
                                    [
                                        poly * np.cos(2 * np.pi * f * ts)[:, None],
                                        poly * np.sin(2 * np.pi * f * ts)[:, None],
                                    ],
                                    axis=1,
                                )
                                for f in model["frequencies"]
                            ],
                            axis=1,
                        )
                        gram = a.T @ a
                        gram.flat[:: len(gram) + 1] += np.max(np.diag(gram)) * 1e-11
                        fits[key] = (ts, a, cho_factor(gram))
                    ts, a, factor = fits[key]
                    c = cho_solve(factor, a.T @ state(start + ts, b)) * 1000
                else:
                    count = model["count"]
                    width = model["widthDays"]
                    ends = np.arange(0, duration, width)
                    nodes = np.cos(np.pi * (np.arange(count) + 0.5) / count)
                    times = start + ends[:, None] + width * (1 + nodes)[None, :] / 2
                    # Final coarse interval extends beyond this archive; the source
                    # cache includes the adjacent record, except at the final date.
                    times = np.minimum(times, source[-1, 1] - 1e-8)
                    c = (
                        dct(
                            state(times.ravel(), b).reshape(len(ends), count, 3), axis=1
                        )
                        / count
                        * 1000
                    )
                    c[:, 0] /= 2
                ci = np.floor(c / model["quantumMeters"] + 0.5).astype(np.int64)
            for v in ci.ravel():
                varint(v, payload)
            predicted = predict(model, ci * model["quantumMeters"], b, records)
            actual = (
                source[
                    index : index + records,
                    offsets[b] - 1 : offsets[b] - 1 + PIECES[b] * 3 * COUNTS[b],
                ].reshape(records * PIECES[b], 3, COUNTS[b])
                * 1000
            )
            rounded = np.floor(actual / QUANTA[b] + 0.5).astype(np.int64)
            base = np.floor(predicted / QUANTA[b] + 0.5).astype(np.int64)
            final = base.copy()
            bound = 5000 if b in [9, 10] else 50000
            # Predictors affect size only. Restore the coefficient with the
            # largest error reduction until the polynomial L1 budget holds.
            original_error = abs(rounded * QUANTA[b] - actual)
            for _ in range(COUNTS[b]):
                err = abs(final * QUANTA[b] - actual)
                mask = err.sum(axis=2) > bound
                if not mask.any():
                    break
                gain = err - original_error
                k = gain.argmax(axis=2)
                rows, axes = np.nonzero(mask)
                final[rows, axes, k[rows, axes]] = rounded[rows, axes, k[rows, axes]]
            error = abs(final * QUANTA[b] - actual).sum(axis=2).max()
            if error > bound:
                p.error(f"Unattainable body {b} budget: {error}")
            errors[b] = max(errors[b], error)
            residual = final - base
            for col in residual.transpose(1, 2, 0).reshape(3 * COUNTS[b], -1):
                previous = first_difference = second_difference = 0
                for value in col:
                    difference = int(value) - previous
                    second = difference - first_difference
                    varint(second - second_difference, payload)
                    previous, first_difference, second_difference = (
                        int(value),
                        difference,
                        second,
                    )
            all_columns.append(final * QUANTA[b])
        for record in range(records):
            begin = len(cells)
            cells[BLOCK + 2 * record : BLOCK + 2 * record + 2] = divmod(begin, BLOCK)
            cells.extend([0] * 11)
            for b in range(11):
                cells[begin + b] = len(cells) - begin
                for piece in range(PIECES[b]):
                    for axis in range(3):
                        cells.extend(
                            native_polynomial(
                                all_columns[b][record * PIECES[b] + piece, axis]
                            )
                        )
        used = len(cells)
        cells.extend([0] * (entry["blocks"] * BLOCK - used))
        if used > entry["blocks"] * BLOCK:
            p.error("Native disk overflow")
        native = struct.pack("<" + "h" * len(cells), *cells)
        data = zipped(payload)
        file = entry["file"].replace(".bin", ".d441")
        volume = dict(
            entry,
            file=file,
            usedCells=used,
            bytes=len(data),
            sha256=digest(data),
            nativeBytes=len(native),
            nativeSha256=digest(native),
            payloadBytes=len(payload),
        )
        if args.refresh:
            (DEST / file).write_bytes(data)
        elif (
            volume != next(v for v in pinned["volumes"] if v["file"] == file)
            or data != (DEST / file).read_bytes()
        ):
            p.error(f"Nonreproducible digest: {file}")
        volumes.append(volume)
        print(file, len(data), flush=True)
    axis = (
        errors
        + float(original["audit"]["maxAxisCoefficientErrorBoundMeters"])
        + float(original["audit"]["maxAxisArgumentRoundingBoundMeters"])
        + 0.007
    ).tolist()
    earth = axis[2] + axis[9] / (1 + float(original["emrat"]))
    worst = max(max(axis), max(e + axis[10] for e in axis), earth + axis[10]) * 3**0.5
    moon = axis[9] * 3**0.5
    if worst >= 100000 or moon >= 10000:
        p.error(f"Accuracy budget exceeded: planets {worst} m, Moon {moon} m")
    manifest = dict(
        original,
        sourceFloatSha256=source_hash,
        predictorSha256=digest((DEST / "de441-models.json").read_bytes()),
        format="troika-de441-digest-v2",
        transport="gzip-predicted-coefficient-corrections",
        coefficientQuantumMeters=QUANTA,
        volumes=volumes,
    )
    manifest["audit"] = dict(
        original["audit"],
        maxAxisCoefficientErrorBoundMeters=str(max(errors)),
        perBodyAxisErrorBoundMeters=axis,
        maxCoordinateVectorErrorBoundMeters=worst,
        moonCoordinateVectorErrorBoundMeters=moon,
        targetCoordinateVectorErrorMeters=100000,
        moonTargetCoordinateVectorErrorMeters=10000,
        note="All-time coefficient L1 bounds relative to the original JPL polynomials, including coordinate subtraction and guest rounding. Storage predictors do not determine accuracy.",
    )
    if args.refresh:
        target.write_text(json.dumps(manifest, indent=2) + "\n")
    elif manifest != pinned:
        p.error("Manifest differs from pins")
    total = (
        sum(v["bytes"] for v in volumes) + (DEST / "de441-models.json").stat().st_size
    )
    print("TOTAL", total, "PLANET BOUND", worst, "MOON BOUND", moon)
    if total > 4000000:
        p.error("4 MB budget exceeded")


if __name__ == "__main__":
    main()
