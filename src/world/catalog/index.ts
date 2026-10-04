import { field } from './field';
import { workshop } from './workshop';
import { kitchen } from './kitchen';
import { arts } from './arts';
import { local } from './local';
import { games } from './games';
import { science } from './science';
import { stories } from './stories';
import { collections } from './collections';
import { personal } from './personal';

/** Authored initial disk content, never a live HTTP/DNS dispatch table. */
export const WEB_RINGS = [field, workshop, kitchen, arts, local, games, science, stories, collections, personal];
export const WEB_SITES = WEB_RINGS.flatMap((ring, ringIndex) => ring.sites.map((site, siteIndex) => ({
  ...site, ring: ringIndex, host: `${site.slug}.world`,
  server: 100 + Math.floor(ringIndex / 2), directory: `s${String((ringIndex % 2) * 10 + siteIndex).padStart(2, '0')}`,
})));
