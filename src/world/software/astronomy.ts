import type { TextSoftware } from './native';

/** Positions, calendar, drawing and interaction all execute in guest firmware. */
export const ASTRONOMY: TextSoftware = {
  kind: 'text', number: 319, id: 'solar-system', site: 'observatory',
  title: 'Solar System / DE441', inputs: ['Gregorian TDB'], outputs: ['Geometric ICRF positions'],
  description: 'Explore JPL DE441 from 2000 BCE through 3000 CE. D enters a Gregorian astronomical year and TDB time (year 0 is 1 BCE); arrows choose a body, M switches the Sun-centered ICRF XY map, Z changes scale, F shows facts and H explains coordinates. Space animates; +/- changes the simulated step and R reverses. Positions are evaluated on the native CPU from indexed JPL coefficient disks. Outer planets are system barycenters; the Moon is geocentric. Coefficient packing adds less than 9 m of vector error relative to DE441, not a claim of physical prediction accuracy. TDB is not UTC. Example: -1999-01-01 00:00:00.000.',
  uiModule: 'astronomyUi', nativeModules: ['astroMath', 'astroEphemeris', 'astronomyLabels', 'astronomyDraw'],
  algorithm: '', examples: [],
};
