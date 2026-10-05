NASA ECLIPSE CATALOG DATA AND NATIVE DISK FORMAT, VERSION 2

Scope
The pinned JSON contains all 11,898 solar and 12,064 lunar catalog records dated
astronomical years -1999 through 3000 inclusive (2000 BCE through 3000 CE).
Year zero is 1 BCE; year -1 is 2 BCE. These are published catalog facts, not a live
planetary ephemeris or a local eclipse-circumstance solver. Normal builds are
offline. scripts/astronomy/import-eclipses.py refreshes source data explicitly
and retains a SHA-256 digest and URL for each of 100 fetched century pages.

Sources and attribution
Eclipse Predictions by Fred Espenak (NASA's GSFC).
https://eclipse.gsfc.nasa.gov/SEcat5/SEcatalog.html
https://eclipse.gsfc.nasa.gov/LEcat5/LEcatalog.html
https://eclipse.gsfc.nasa.gov/SEcat5/deltat.html
Example independent fixture pages:
https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html
https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html

Dates and time
Catalog dates before 1582-10-15 are Julian; later dates are Gregorian. The
1582-10-05 through 1582-10-14 reform gap is rejected. Do not interpret the
whole table as proleptic Gregorian, or use JavaScript Date on early dates.
The greatest-eclipse clock is TD (Terrestrial Dynamical Time), a uniform
terrestrial time scale, not UTC. Preserve the source TD label; TT is the
modern terrestrial-time terminology, not a request to relabel the clock UTC.
Catalog-derived UT = TD - the record's DeltaT seconds. DeltaT is the source
model of terrestrial time minus Earth-rotation time. It is not the UTC leap
second offset. The subtraction can change the civil date. Historical/future
Earth rotation has uncertainty, especially far from modern observations.
The catalog's printed second is storage precision, not a one-second accuracy
promise for observations or local contacts. For example the 2024-04-08 row
has TD18:18:29 and DeltaT74s, yielding source-model UT18:17:15. Do not replace
its DeltaT silently with a different model and still call it the pinned row.
Source coordinates in these HTML tables are rounded to integer degrees;
central duration/path width describe greatest eclipse, not arbitrary places.
Solar magnitude, gamma and lunar magnitudes retain four decimal places;
lunar durations retain tenths of minutes. Missing values differ from zero.

Native disk organization
Build-only eclipsePacking.ts forms 102 century files, 51 per eclipse kind.
Centuries start -2000,-1900,...,0,100,...,3000. The first bucket has no -2000
records because the public catalogue begins -1999; the last contains only
3000. These boundaries differ from NASA source pages but retain every row.
Logical identifiers /astro/s-20 through /astro/s30 (and lunar l equivalents)
are descriptive, not files in a FAT directory. The raw cartridge directory
below indexes every bucket directly. The largest file is7110 cells; total
102 files635112 cells, each below the9841-cell native file limit.

Header offsets (16 cells)
 0..2 ASCII69,67,76 ('ECL'); 3 version2; 4 kind0solar/1lunar;
 5 first year; 6 last year; 7 record width25solar/27lunar;
 8 record count; 9 index offset16; 10 data offset117;
 11 time code1=sourceTD; 12 calendar convention1=1582historical cutover;
 13 rolling checksum; 14..15 reserved zero.
Index offsets16..116 contain101 cumulative record counts. Entry i is the
first record at or after firstYear+i. Records for yearY occupy indices
index[Y-firstYear] through index[Y-firstYear+1]-1. All entries after3000 in
bucket30 equal its count. Native lookup can form the bucket path from year.
Checksum: start0; for each cell in file order, sum=wrapTryte(2*sum+cell),
substituting zero for cell13. This detects accidental corruption; it is not
a cryptographic signature. Multiplier2 is coprime to the3^9 tryte modulus.

Record offsets common to both kinds
 0 year offset from bucket start; 1 month; 2 day;
 3 TD hour; 4 TD minute; 5 TD second; 6 calendar0Julian/1Gregorian;
 7..8 catalog number low/high; 9 DeltaT low limb;
 10..11 lunation low/high; 12 Saros number;
 13 eclipse-type enum; 14 classification enum; 15..16 gamma1e4 low/high;
 17 latitude degrees; 18 longitude degrees.
Solar extras:19..20 magnitude1e4 low/high;21 Sun altitude degrees;
 22 path width km;23 central duration seconds;24 DeltaT high limb.
Lunar extras:19..20 penumbralMagnitude1e4 low/high;
 21..22 umbralMagnitude1e4 low/high;23 penumbral duration tenths of minutes;
 24 partial duration tenths of minutes;25 total duration tenths of minutes;26 DeltaT high limb.
Nullable extras use-9841 for missing; zero remains a real zero.
Wide values = low+729*high, with0<=low<729 and signed high (floor quotient).
Do not reconstruct oversized values in one native tryte. Display/compare
with limb arithmetic. Enum order is the fixed ECLIPSE_TYPES/ECLIPSE_CLASSES
arrays in eclipsePacking.ts; new enum values require a format revision.

Native cartridge and viewer
Eclipse Explorer uses a read-only raw block medium on unit22, attached when
program overlays are installed. It is not part of the normal client FAT and
adds no boot-time scan. Directory block0 cells0..3 are69,67,2,102. Cells4..207
hold102(startBlock,logicalCellLength) pairs: solar centuries-2000..3000,
then lunar centuries-2000..3000. Every file begins at a243-cell boundary;
trailing physical padding is zero and excluded from the file checksum.
The builder validates all imported records before creating this cartridge.
The guest checks directory/file headers and the selected year's bounds,
streams every logical cell of the selected century through its checksum,
and retains only that year's records. No host query interception or runtime
JavaScript astronomical calculation is involved. RAM uses3200..3224 state,
3250..3254 decimal limbs,3300..3461 selected records and4000..4242 block I/O.
UI: S2024/L2025 or S-1999/L0000 Enter, arrows cycle events, D cycles four detail pages,
H explains TD/UT and the calendar. F1 returns to the native program menu.

Reproducible artifact
Run node scripts/astronomy/pack-eclipses.mjs after updating the pinned NASA
import. --check verifies byte-for-byte reproducibility. The JSON artifact
contains canonical little-endian signed16-bit cells as base64, its SHA256,
and the SHA256 of the exact source JSON. Tests compare the decoded artifact
to independently repacking all source records. Runtime only decodes the
1293732-byte immutable medium (2662blocks); it does not import or reprocess
the full NASA JSON. Each guest lookup still validates its century checksum.
