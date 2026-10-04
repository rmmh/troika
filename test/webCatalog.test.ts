import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { WEB_RINGS, WEB_SITES } from '../src/world/catalog';
import { ATLAS_HOST, buildWebCatalog } from '../src/world/catalog/pages';
import { compactDnsRecord } from '../src/world/dnsProfile';
import { decodeText } from '../src/core/textEncoding';
import { linkFirmware } from '../src/firmware/link';
import { REG_P, REG_S } from '../src/core/machine';
import { FirmwareProbe } from './firmwareProbe';
import { ATLAS_GRAPHIC, RING_GRAPHICS } from '../src/world/catalog/graphics';
import { buildWorldPrograms } from '../src/world/programImages';
import { buildSoftwareDistribution } from '../src/world/software/native';

const catalog = buildWebCatalog();
test('all home and directory pages embed distinct bounded ring artwork with captions', () => {
  expect(new Set([ATLAS_GRAPHIC, ...RING_GRAPHICS].map(payload => payload.slice(0, 54))).size).toBe(11);
  for (const payload of [ATLAS_GRAPHIC, ...RING_GRAPHICS]) {
    expect(payload.slice(0, 54)).toMatch(/^[a-p]{54}$/);
    expect(payload.length).toBeGreaterThan(54); expect(payload.length).toBeLessThanOrEqual(108);
  }
  const homes = catalog.pages.filter(page => page.path !== '/read');
  expect(homes).toHaveLength(111);
  for (const page of homes) expect(page.body, `${page.host}${page.path}`).toMatch(/\nG \d+:/);
});
test('100 individually written sites fit five native disks and the DNS table', () => {
  expect(WEB_RINGS).toHaveLength(10); expect(WEB_SITES).toHaveLength(100);
  expect(new Set(WEB_SITES.map(site => site.host)).size).toBe(100);
  expect(new Set(WEB_SITES.map(site => site.feature)).size).toBe(100);
  expect(new Set(WEB_SITES.map(site => site.introduction)).size).toBe(100);
  expect(catalog.pages).toHaveLength(211); expect(catalog.hosts).toHaveLength(101);
  for (const ring of WEB_RINGS) expect(ring.sites).toHaveLength(10);
  for (const site of WEB_SITES) {
    expect(site.paragraphs.join(' ').length, site.host).toBeGreaterThan(400);
    expect(site.introduction.length, site.host).toBeGreaterThan(90);
    expect(compactDnsRecord(site.host, [1, 3, site.server])).toHaveLength(24);
  }
  for (const cluster of catalog.clusters) {
    expect(cluster.hosts.length).toBeLessThanOrEqual(27);
    expect(cluster.disk.length).toBe(cluster.blocks * 243);
    expect(cluster.free).toBeGreaterThan(0);
  }
  console.info('Catalog disks:', catalog.clusters.map(cluster => `${cluster.server}: ${cluster.free}/${cluster.blocks} free`).join(', '));
});

test('all catalog links resolve, rings close, and every page is reachable from the atlas', () => {
  const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
  const catalog = buildWebCatalog(buildSoftwareDistribution(buildWorldPrograms(source).core, source));
  expect(catalog.software.some(app => ['ipv4-cidr', 'mac-inspect'].includes(app.id))).toBe(false);
  for (const app of catalog.software) {
    const page = catalog.pages.find(page => page.host === `${app.site}.world` && page.path === app.pagePath)!;
    if (app.kind === 'board' && app.controls) expect(page.body, app.id).toContain(app.controls);
    if (app.kind !== 'board' && app.examples.some(example => !example.error && example.output !== undefined)) {
      expect(page.body, app.id).toContain('Try input:');
    }
  }
  const addresses = new Set([
    ...catalog.pages.map(page => `http://${page.host}${page.path}`),
    ...catalog.software.flatMap(app => [app.path, app.sourcePath].map(path => `http://${app.site}.world${path}`)),
  ]);
  const external = new Set(['http://bbs.world/index', 'http://files.world/index']);
  const graph = new Map(catalog.pages.map(page => [`http://${page.host}${page.path}`,
    page.links.map(link => new URL(link.target, `http://${page.host}${page.path}`).href)]));
  for (const [from, targets] of graph) for (const target of targets) expect(addresses.has(target) || external.has(target), `${from} -> ${target}`).toBe(true);
  const seen = new Set<string>(), queue = [`http://${ATLAS_HOST}/index`];
  while (queue.length) {
    const address = queue.pop()!;
    if (seen.has(address)) continue;
    seen.add(address); queue.push(...graph.get(address) ?? []);
  }
  for (const address of addresses) expect(seen.has(address), address).toBe(true);
  for (const ring of WEB_RINGS) {
    const start = `http://${ring.sites[0]!.slug}.world/index`, visited = new Set<string>();
    let current = start;
    for (let i = 0; i < 10; i++) {
      expect(visited.has(current)).toBe(false); visited.add(current);
      const page = catalog.pages.find(page => `http://${page.host}${page.path}` === current)!;
      current = page.links.find(link => link.label.startsWith('Next:'))!.target;
      expect(ring.sites.some(site => current === `http://${site.slug}.world/index`)).toBe(true);
    }
    expect(current).toBe(start);
  }
});

test('every authored page parses in native firmware within its real text and record arenas', () => {
  const source = (name: string) => readFileSync(new URL(`../firmware/include/${name}.asm`, import.meta.url), 'utf8');
  const distribution = buildSoftwareDistribution(buildWorldPrograms(source).core, source);
  const populated = buildWebCatalog(distribution);
  // Capacity fixture only: these are existing programs moved to one site, not
  // extra ecosystem entries. Twenty-five require two independently valid pages.
  const crowded = buildWebCatalog(distribution.slice(0, 25).map(app => ({...app, site:'ternary'})));
  const shelves = crowded.pages.filter(page => page.host === 'ternary.world' && /^\/soft/.test(page.path));
  expect(shelves.map(page => page.path)).toEqual(['/soft', '/soft2']);
  expect(shelves[0]!.links.filter(link => /^\/s\d/.test(link.target))).toHaveLength(20);
  expect(shelves[1]!.links.filter(link => /^\/s\d/.test(link.target))).toHaveLength(5);
  expect(shelves[0]!.links).toContainEqual({label:'Next shelf', target:'/soft2'});
  expect(shelves[1]!.links).toContainEqual({label:'Previous shelf', target:'/soft'});
  for (const [index, app] of crowded.software.entries()) {
    const page = crowded.pages.find(page => page.host === 'ternary.world' && page.path === app.pagePath)!;
    expect(page.links[0]).toEqual({label:'Software shelf', target:index < 20 ? '/soft' : '/soft2'});
  }
  const linked = linkFirmware([{name: 'boot', source: 'J entry'},
    ...['dns', 'url', 'forthVm', 'forthPage', 'forthLookup', 'forthLex', 'forthCompile', 'pageState', 'page'].map(name => ({name, source: source(name)})),
    {name: 'app', source: `entry: M S 5710 M A 2 C S page_init J done
feed: M A 1337 R B 2201 C S page_feed J done
finish: C S page_finish
done: W 2200 A H 0sAAA Z`}]);
  const m = new FirmwareProbe(['mmio', 'native.stack', 'url.state', 'scratch', 'network.state', 'page.text', 'page.script', 'page.records', 'forth.state']);
  for (const chunk of linked.image.chunks) chunk.data.forEach((v, i) => m.poke(chunk.addr + i, v));
  function execute(label: string, context: string) {
    m.poke(REG_P, linked.image.labels.get(label)!); m.sleep = null;
    expect(m.run(200_000), context).toBe('sleep-forever');
    expect(m.peek(2200), context).toBe(0); expect(m.peek(REG_S)).toBe(5710);
  }
  for (const page of [...populated.pages, ...shelves]) {
    const context = `${page.host}${page.path}`;
    execute('entry', context);
    for (let offset = 0; offset < page.cells.length; offset += 216) {
      const cells = page.cells.slice(offset, offset + 216);
      cells.forEach((v, i) => m.poke(1337 + i, v)); m.poke(2201, cells.length); execute('feed', context);
    }
    execute('finish', context);
    expect(m.peek(5434), context).toBe(1); expect(m.peek(5414), context).toBe(page.records);
    expect(m.peek(5420), context).toBe(2552 + page.retained);
    expect(decodeText(page.cells), context).toBe(page.body);
  }
  expect(m.stackHighWater).toBeLessThanOrEqual(100);
}, 60_000);
