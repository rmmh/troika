import { encodeText } from '../../core/textEncoding';
import { encodeWide } from '../../core/wide';
import { createDiskImage } from '../../firmware/diskImage';
import { WEB_RINGS, WEB_SITES } from './index';
import { ATLAS_GRAPHIC, RING_GRAPHICS } from './graphics';
import type { buildSoftwareDistribution, Software } from '../software/native';

export const ATLAS_HOST = 'atlas.world';
export interface CatalogPage {
  host: string; path: string; body: string; cells: number[];
  links: {label: string; target: string}[]; records: number; retained: number;
}
interface Record { kind: 'H' | 'T' | 'B' | 'L' | 'G'; fields: string[]; }
const heading = (value: string): Record => ({kind: 'H', fields: [value]});
const text = (value: string): Record => ({kind: 'T', fields: [value]});
const gap = (): Record => ({kind: 'B', fields: []});
const graphic = (payload: string): Record => ({kind: 'G', fields: [payload]});
const link = (label: string, target: string): Record => ({kind: 'L', fields: [label, target]});
const url = (host: string, path = '/index') => `http://${host}${path}`;

/** Keep the shelf's instructions consistent with the controls shipped in each PRG. */
function softwareHelp(app: Software): string {
  if (app.launchHelp) return app.launchHelp;
  if (app.kind === 'board') return 'Arrows or Tab select a square. ' +
    (app.controls ?? (app.stepKey ? 'Enter/Space: edit; N: step; R: reset' : 'Enter/Space: play; R: reset')) +
    '. F1 returns to programs.';
  if (app.kind === 'document') return `Arrows/Tab select; Enter ${app.commandOnly ? "opens a command" : "edits"}; F1 cancels or exits. S saves to ${app.dataPath}; L reloads. At an unsaved-change prompt: S saves, D discards, F1 goes back.`;
  if (app.kind === 'text') return 'Type up to 54 ASCII characters; Backspace edits; Enter runs; F1 returns to programs.';
  return 'Tab selects inputs; Enter runs; minus toggles sign; F1 returns to programs.' +
    (app.audio ? ' Enable sound in the world controls; Space releases the sound.' : '');
}

function softwareExample(app: Software): Record[] {
  if (app.kind === 'board') return [];
  if (app.kind === 'document') {
    const example=app.examples[0];
    return example?.records.length ? [text(`Try editing record 1 to: ${JSON.stringify(example.records[0])}. Save with S, then reload with L.`),gap()] : [];
  }
  const example = app.examples.find(example => !example.error && example.output !== undefined);
  if (!example) return [];
  const input = typeof example.input === 'string' ? JSON.stringify(example.input) : example.input.join(', ');
  const output = typeof example.output === 'string' ? JSON.stringify(example.output) : example.output!.join(', ');
  // A preview cannot masquerade as the complete result of a long text tool.
  return [text(`Try input: ${input}. ` + (output.length > 81 ? `Result begins: ${output.slice(0, 78)}...` : `Result: ${output}.`)), gap()];
}

/** Build-time PAGE records and disk files. The guest handles every live request. */
export function buildWebCatalog(software: ReturnType<typeof buildSoftwareDistribution> = []) {
  if (software.some(app => !WEB_SITES.some(site => site.slug === app.site))) throw new Error('Software has no hosting site');
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
  add(ATLAS_HOST, '/index', [heading('The Small Web Atlas'), graphic(ATLAS_GRAPHIC),
    text('One hundred personal sites, ten webrings, and enough side roads to lose an afternoon. Pick a ring, meet its makers, then follow a neighbor.'), gap(),
    ...software.length ? [link('Browse native software', '/software')] : [],
    ...WEB_RINGS.map(ring => link(ring.title, `/${ring.id}`)), gap(),
    link('Community square', 'http://bbs.world/index'), link('Shared file library', 'http://files.world/index'),
    text('Mere and its residents are fictional. The writing is here to explore; most sites are quiet, like books left open.')]);
  if (software.length) {
    const stocked = WEB_SITES.filter(site => software.some(app => app.site === site.slug));
    add(ATLAS_HOST, '/software', [heading('The software directory'), link('Atlas home', '/index'), gap(),
      text(`${software.length} native programs on ${stocked.length} personal sites. Browse a neighborhood, visit a software shelf, and choose a program to learn how to use it.`),
      ...WEB_RINGS.flatMap((ring, index) => {
        const count = software.filter(app => stocked.some(site => site.ring === index && site.slug === app.site)).length;
        return count ? [link(`${ring.title}: ${count} programs`, `/soft${index}`)] : [];
      })]);
    WEB_RINGS.forEach((ring, index) => {
      const sites = stocked.filter(site => site.ring === index);
      if (!sites.length) return;
      add(ATLAS_HOST, `/soft${index}`, [heading(`${ring.title}: software`), link('All software neighborhoods', '/software'), gap(),
        text('Choose a maker to open their software shelf. Each program page includes controls and download instructions.'),
        ...sites.map(site => link(`${site.title} (${software.filter(app => app.site === site.slug).length})`, url(site.host, '/soft')))]);
    });
  }
  WEB_RINGS.forEach((ring, ringIndex) => {
    const members = WEB_SITES.filter(site => site.ring === ringIndex);
    add(ATLAS_HOST, `/${ring.id}`, [heading(ring.title), graphic(RING_GRAPHICS[ringIndex]!), text(ring.introduction), gap(),
      ...members.map(site => link(site.title, url(site.host))), gap(), link('All ten rings', '/index')]);
    members.forEach((site, i) => {
      const previous = members[(i + members.length - 1) % members.length]!;
      const next = members[(i + 1) % members.length]!;
      // A fixed editorial cross-link gives every site a way out of its ring.
      const elsewhere = WEB_SITES[((ringIndex + 3) % WEB_RINGS.length) * 10 + (i + 4) % 10]!;
      const apps = software.filter(app => app.site === site.slug);
      add(site.host, '/index', [heading(site.title), graphic(RING_GRAPHICS[ringIndex]!), text(site.introduction), gap(), link(site.feature, '/read'),
        ...apps.length ? [link('Software shelf', '/soft')] : [], gap(),
        text(`Member of ${ring.title}`), link(`Previous: ${previous.title}`, url(previous.host)),
        link(`Next: ${next.title}`, url(next.host)), link('Ring directory', url(ATLAS_HOST, `/${ring.id}`)),
        gap(), text('A page from another corner:'), link(elsewhere.title, url(elsewhere.host)), link('The Small Web Atlas', url(ATLAS_HOST))]);
      // The first focus target belongs at the top: native keyboard focus must
      // not scroll past an article's opening just to reveal its footer links.
      add(site.host, '/read', [heading(site.feature), link('Site home', '/index'), gap(), ...site.paragraphs.flatMap(paragraph => [text(paragraph), gap()]),
        link(site.title, '/index'), link('Explore this webring', url(ATLAS_HOST, `/${ring.id}`))]);
      if (apps.length) {
        // Twenty program links leave room for headings and both navigation links
        // within the guest's 27-record PAGE arena. Paths remain short FAT names.
        const shelfPath = (index: number) => index === 0 ? '/soft' : `/soft${index + 1}`;
        const shelfCount = Math.ceil(apps.length / 20);
        for (let shelf = 0; shelf < shelfCount; shelf++) {
          add(site.host, shelfPath(shelf), [heading(`${site.title}: software`),
            text('Native programs for your Troika. Each page explains its inputs, outputs and download.'),
            ...shelfCount > 1 ? [text(`Shelf ${shelf + 1} of ${shelfCount}`)] : [],
            ...apps.slice(shelf * 20, (shelf + 1) * 20).map(app => link(app.title, app.pagePath)),
            ...shelf > 0 ? [link('Previous shelf', shelfPath(shelf - 1))] : [],
            ...shelf + 1 < shelfCount ? [link('Next shelf', shelfPath(shelf + 1))] : [],
            link('Site home', '/index')]);
        }
        for (const [index, app] of apps.entries()) add(site.host, app.pagePath, [heading(app.title), link(`Run ${app.title}`, app.path), link('Software shelf', shelfPath(Math.floor(index / 20))), gap(), text(app.description),
          text(`Inputs: ${app.inputs.join(', ')}. Outputs: ${app.outputs.join(', ')}.`),
          ...softwareExample(app),
          text('Run: press Enter (replaces /launch). F1: Programs. F3 on Run: save a separate copy.'),
          text(softwareHelp(app)),
          link('Algorithm source', app.sourcePath), link('Site home', '/index')]);
      }
    });
  });
  const hosts = [...WEB_SITES.map(site => ({name: site.host, directory: site.directory, server: site.server})),
    {name: ATLAS_HOST, directory: 'hub', server: 100}];
  const clusters = Array.from({length: 5}, (_, i) => {
    const server = 100 + i, members = hosts.filter(host => host.server === server);
    const files: { [path: string]: number[] } = {'/net.seq': [...encodeWide(1)]};
    const diskPaths: {[url: string]: string} = {};
    const crowded = new Set(members.filter(host => software.filter(app => `${app.site}.world` === host.name).length > 25).map(host => host.name));
    const diskPath = (host: typeof members[number], path: string) => {
      let suffix = path;
      if (crowded.has(host.name) && /^\/[pcs][0-9]{4}$/.test(path)) {
        const bucket = Math.floor(Number(path.slice(2)) / 27), digits = 'abcdefghijklmnopqrstuvwxyz_';
        suffix = `/apps/${digits[Math.floor(bucket / 27)]}/${digits[bucket % 27]}${path}`;
      }
      const result = `/public/${host.directory}${suffix}`;
      diskPaths[host.name + path] = result;
      return result;
    };
    for (const host of members) for (const page of pages.filter(page => page.host === host.name)) {
      files[diskPath(host, page.path)] = page.cells;
    }
    const plainPaths: string[] = [];
    for (const app of software) {
      const host = members.find(host => host.name === `${app.site}.world`);
      if (!host) continue;
      files[diskPath(host, app.path)] = app.program.file;
      files[diskPath(host, app.sourcePath)] = encodeText(app.publishedSource);
      plainPaths.push(app.path, app.sourcePath);
    }
    let blocks = 243, disk: Int16Array;
    for (;;) {
      try { disk = createDiskImage({blocks, volumeId: [0, 0, server], files}); break; }
      catch (error) {
        if (!(error instanceof Error) || error.message !== 'fixture volume full' || blocks === 9841) throw error;
        blocks = Math.min(9841, blocks + 243);
      }
    }
    const free = disk.slice(243, 243 + blocks).filter(cell => cell === 0).length;
    return {server, hosts: members, blocks, files, disk, free, plainPaths, diskPaths};
  });
  return {pages, hosts, clusters, software};
}
