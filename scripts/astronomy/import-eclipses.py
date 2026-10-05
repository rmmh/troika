#!/usr/bin/env python3
"""Import public NASA/GSFC eclipse facts; retain source calendar and TD times.

Run explicitly to refresh pinned data. Normal builds never access the network.
Eclipse Predictions by Fred Espenak (NASA's GSFC).
"""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'src/world/astronomy/data/nasa-eclipses.json'
MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()

def scaled(value, places):
    # Decimal input, exact integer storage; never round through a binary float.
    from decimal import Decimal
    number = Decimal(value) * 10 ** places
    if number != number.to_integral():
        raise ValueError(f'Unexpected precision: {value}')
    return int(number)

def coordinate(value):
    return int(value[:-1]) * (-1 if value[-1] in 'SW' else 1)

def year_code(year):
    return ('-' if year < 0 else '') + f'{abs(year):04d}'

def fetch(kind, start):
    url = f'https://eclipse.gsfc.nasa.gov/{kind}cat5/{kind}{year_code(start)}-{year_code(start+99)}.html'
    with urllib.request.urlopen(url, timeout=60) as response:
        raw = response.read()
    text = html.unescape(re.sub(r'<[^>]*>', '', raw.decode('utf8')))
    records = []
    for line in text.splitlines():
        if not re.match(r'^\s*\d{5}\s+-?\d{4}\s+[A-Z][a-z]{2}\s+\d{2}\s+\d\d:', line):
            continue
        fields = line.split()
        number, year, month, day, time = fields[:5]
        year, month, day = int(year), MONTHS.index(month)+1, int(day)
        if not -1999 <= year <= 3000:
            continue
        if len(fields) not in ([15,17] if kind == 'SE' else [18]):
            raise ValueError(f'Unrecognized NASA row: {line}')
        record = dict(number=int(number), year=year, month=month, day=day,
                      calendar='gregorian' if (year,month,day)>=(1582,10,15) else 'julian',
                      td=time, deltaTSeconds=int(fields[5]), lunation=int(fields[6]),
                      saros=int(fields[7]), type=fields[8], classification=fields[9],
                      gamma1e4=scaled(fields[10],4))
        if kind == 'SE':
            duration = re.fullmatch(r'(\d+)m(\d+)s', fields[16]) if len(fields)==17 else None
            record.update(magnitude1e4=scaled(fields[11],4),
                          latitudeDegrees=coordinate(fields[12]), longitudeDegrees=coordinate(fields[13]),
                          sunAltitudeDegrees=int(fields[14]) if fields[14]!='-' else None,
                          pathWidthKm=int(fields[15]) if len(fields)==17 and fields[15]!='-' else None,
                          centralDurationSeconds=int(duration[1])*60+int(duration[2]) if duration else None)
        else:
            record.update(penumbralMagnitude1e4=scaled(fields[11],4), umbralMagnitude1e4=scaled(fields[12],4),
                          penumbralDurationTenthsMinutes=scaled(fields[13],1) if fields[13]!='-' else None,
                          partialDurationTenthsMinutes=scaled(fields[14],1) if fields[14]!='-' else None,
                          totalDurationTenthsMinutes=scaled(fields[15],1) if fields[15]!='-' else None,
                          latitudeDegrees=coordinate(fields[16]), longitudeDegrees=coordinate(fields[17]))
        records.append(record)
    return kind, records, dict(url=url, sha256=hashlib.sha256(raw).hexdigest())

def main():
    data = dict(schema=1, yearRange=[-1999,3000], timeScale='TD (Terrestrial Dynamical Time)',
                attribution="Eclipse Predictions by Fred Espenak (NASA's GSFC)",
                solar=[], lunar=[], sources=[])
    jobs = [(kind,start) for kind in ['SE','LE'] for start in range(-1999,3000,100)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for kind, records, source in pool.map(lambda job: fetch(*job), jobs):
            data['solar' if kind=='SE' else 'lunar'].extend(records)
            data['sources'].append(source)
    for kind in ['solar','lunar']:
        records=data[kind]
        records.sort(key=lambda r:(r['year'],r['month'],r['day'],r['td']))
        if len({r['number'] for r in records})!=len(records):
            raise ValueError(f'Duplicate {kind} catalog rows')
        if {r['year'] for r in records}!=set(range(-1999,3001)):
            raise ValueError(f'Missing {kind} year')
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(data,separators=(',',':'))+'\n')
    print(f"Imported {len(data['solar'])} solar and {len(data['lunar'])} lunar eclipses into {DEST}")

if __name__ == '__main__':
    main()
