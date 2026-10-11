import type { TextSoftware } from './native';

/** Positions, calendar, drawing and interaction all execute in guest firmware. */
export const ASTRONOMY: TextSoftware = {
  kind: 'text', number: 319, id: 'solar-system', site: 'observatory',
  title: 'Solar System / DE441', inputs: ['Gregorian TDB'], outputs: ['Geometric ICRF positions'],
  description: 'Explore JPL DE441 from 2000 BCE through 3000 CE. D enters a Gregorian astronomical year and TDB time (year 0 is 1 BCE); arrows choose a body, M switches the Sun-centered ICRF XY map, Z changes the 162x162 native bitmap scale, F shows facts and H explains coordinates. Space animates; +/- changes the simulated step and R reverses. Positions are evaluated on the native CPU from indexed JPL coefficient disks. Outer planets are system barycenters; the Moon is geocentric. Packing adds less than 10 km of geocentric Moon error and 100 km for other positions relative to DE441, not a claim of physical prediction accuracy. Dotted rings mark distances, not orbits; symbols are not body sizes. TDB is not UTC. Example: -1999-01-01 00:00:00.000.',
  bitmapVram: true, uiModule: 'astronomyUi', nativeModules: ['astroMath', 'astroEphemeris', 'astronomyLabels', 'astronomyDraw', 'astronomyBitmap'],
  sourceModule: 'astroMath',
  launchHelp: 'D edits the date; Enter applies it. Space plays or pauses; +/- changes time step; R reverses. M maps, Z changes between 5 and 150 million km per pixel, arrows select a body, F shows facts, H explains time scales, F1 exits. Algorithm source shows the native multiword polynomial evaluator.',
  algorithm: '', examples: [],
};
