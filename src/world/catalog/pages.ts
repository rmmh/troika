import { encodeText } from '../../core/textEncoding';
import { encodeWide } from '../../core/wide';
import { createDiskImage } from '../../firmware/diskImage';
import { WEB_RINGS, WEB_SITES } from './index';

export const ATLAS_HOST = 'atlas.world';
export interface CatalogPage {
  host: string; path: string; body: string; cells: number[];
  links: {label: string; target: string}[]; records: number; retained: number;
}
interface Record { kind: 'H' | 'T' | 'B' | 'L'; fields: string[]; }
const heading = (value: string): Record => ({kind: 'H', fields: [value]});
const text = (value: string): Record => ({kind: 'T', fields: [value]});
const gap = (): Record => ({kind: 'B', fields: []});
const link = (label: string, target: string): Record => ({kind: 'L', fields: [label, target]});
const url = (host: string, path = '/index') => `http://${host}${path}`;

/** Build-time PAGE records and disk files. The guest handles every live request. */
export function buildWebCatalog() {
  const pages: CatalogPage[] = [];
  function add(host: string, path: string, records: Record[]) {
    const strings = records.flatMap(record => record.fields);
    if (strings.some(value => /[^\x20-\x7e\n]/.test(value))) throw new Error(`Non-ASCII catalog text: ${host}${path}`);
    const retained = strings.reduce((sum, value) => sum + value.length, 0);
    const body = 'PAGE 1\n' + records.map(record => record.kind + record.fields.map(value => ` ${value.length}:${value}`).join('')).join('\n') + '\n';
    if (retained > 1458 || body.length > 2187 || records.length > 27) throw new Error(`Catalog page exceeds native arena: ${host}${path}`);
    pages.push({host, path, body, cells: encodeText(body), retained, records: records.length,
      links: records.filter(record => record.kind === 'L').map(record => ({label: record.fields[0]!, target: record.fields[1]!}))});
  }
  add(ATLAS_HOST, '/index', [heading('The Small Web Atlas'),
    text('One hundred personal sites, ten webrings, and enough side roads to lose an afternoon. Pick a ring, meet its makers, then follow a neighbor.'), gap(),
    ...WEB_RINGS.map(ring => link(ring.title, `/${ring.id}`)), gap(),
    link('Community square', 'http://bbs.world/index'), link('Shared file library', 'http://files.world/index'),
    text('Mere and its residents are fictional. The writing is here to explore; most sites are quiet, like books left open.')]);
  WEB_RINGS.forEach((ring, ringIndex) => {
    const members = WEB_SITES.filter(site => site.ring === ringIndex);
    add(ATLAS_HOST, `/${ring.id}`, [heading(ring.title), text(ring.introduction), gap(),
      ...members.map(site => link(site.title, url(site.host))), gap(), link('All ten rings', '/index')]);
    members.forEach((site, i) => {
      const previous = members[(i + members.length - 1) % members.length]!;
      const next = members[(i + 1) % members.length]!;
      // A fixed editorial cross-link gives every site a way out of its ring.
      const elsewhere = WEB_SITES[((ringIndex + 3) % WEB_RINGS.length) * 10 + (i + 4) % 10]!;
      add(site.host, '/index', [heading(site.title), text(site.introduction), gap(), link(site.feature, '/read'), gap(),
        text(`Member of ${ring.title}`), link(`Previous: ${previous.title}`, url(previous.host)),
        link(`Next: ${next.title}`, url(next.host)), link('Ring directory', url(ATLAS_HOST, `/${ring.id}`)),
        gap(), text('A page from another corner:'), link(elsewhere.title, url(elsewhere.host)), link('The Small Web Atlas', url(ATLAS_HOST))]);
      // The first focus target belongs at the top: native keyboard focus must
      // not scroll past an article's opening just to reveal its footer links.
      add(site.host, '/read', [heading(site.feature), link('Site home', '/index'), gap(), ...site.paragraphs.flatMap(paragraph => [text(paragraph), gap()]),
        link(site.title, '/index'), link('Explore this webring', url(ATLAS_HOST, `/${ring.id}`))]);
    });
  });
  const hosts = [...WEB_SITES.map(site => ({name: site.host, directory: site.directory, server: site.server})),
    {name: ATLAS_HOST, directory: 'hub', server: 100}];
  const clusters = Array.from({length: 5}, (_, i) => {
    const server = 100 + i, members = hosts.filter(host => host.server === server);
    const files: { [path: string]: number[] } = {'/net.seq': [...encodeWide(1)]};
    for (const host of members) for (const page of pages.filter(page => page.host === host.name)) {
      files[`/public/${host.directory}${page.path}`] = page.cells;
    }
    const blocks = 243;
    const disk = createDiskImage({blocks, volumeId: [0, 0, server], files});
    const free = disk.slice(243, 243 + blocks).filter(cell => cell === 0).length;
    return {server, hosts: members, blocks, files, disk, free};
  });
  return {pages, hosts, clusters};
}
