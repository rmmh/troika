#!/usr/bin/env python3
"""Verify pinned JPL ASCII inputs and cache their binary64 coefficients locally."""

import argparse
import importlib.util
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "src/world/astronomy/data"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--download", action="store_true")
    p.add_argument("--cache", type=Path, default=Path("/tmp"))
    p.add_argument("--output", type=Path, default=Path("/tmp/troika-de441-float.npy"))
    args = p.parse_args()
    spec = importlib.util.spec_from_file_location(
        "importer", Path(__file__).with_name("import-de441.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    pins = json.loads((DEST / "de441-source-manifest.json").read_text())
    args.cache.mkdir(parents=True, exist_ok=True)
    for (remote, local, end), pin in zip(module.FILES, pins["sources"]):
        path = args.cache / local
        if not path.exists():
            if not args.download:
                p.error(f"Missing {path}; use --download")
            request = urllib.request.Request(
                pin["url"], headers={"Range": f"bytes=0-{end}"} if end else {}
            )
            with (
                urllib.request.urlopen(request) as response,
                path.with_suffix(path.suffix + ".part").open("wb") as out,
            ):
                while data := response.read(1024 * 1024):
                    out.write(data)
            path.with_suffix(path.suffix + ".part").replace(path)
        if path.stat().st_size != pin["bytes"] or module.sha(path) != pin["sha256"]:
            p.error(f"Source checksum mismatch: {path}")
    import numpy as np

    start = float(pins["volumes"][0]["firstRecordJdTdb"])
    last = pins["volumes"][-1]
    stop = float(last["firstRecordJdTdb"]) + last["records"] * 32
    count = round((stop - start) / 32)
    temporary = args.output.with_suffix(".partial.npy")
    out = np.lib.format.open_memmap(
        temporary, mode="w+", dtype=np.float64, shape=(count, 1018)
    )
    i = 0
    previous = None
    for _, local, _ in module.FILES[1:]:
        with (args.cache / local).open() as source:
            while line := source.readline():
                if not line.strip():
                    continue
                text = "".join(source.readline() for _ in range(340)).replace("D", "E")
                record = np.fromstring(text, sep=" ")
                if len(record) != 1018:
                    break
                if record[1] <= start or record[0] >= stop or record[0] == previous:
                    continue
                if record[0] != start + i * 32 or record[1] != record[0] + 32:
                    p.error("Gap or malformed source record")
                out[i] = record
                i += 1
                previous = record[0]
    if i != count:
        p.error(f"Incomplete source: {i}/{count} records")
    out.flush()
    del out
    temporary.replace(args.output)
    print(f"Cached {count} verified source records in {args.output}")


if __name__ == "__main__":
    main()
