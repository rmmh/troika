import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Read production declarations without assembling firmware or manufacturing
// an independent inventory that can drift from the actual software shelves.
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/software-catalog.mjs [--json] [search terms...]\n' +
    'Search all terms, case-insensitively, in native program metadata.\n' +
    'Examples: formula, knight, "slide", "kind:document", "site:tram".\n' +
    'With no terms, list the complete production catalog. --json emits metadata only.');
  process.exit(0);
}
const unknown = args.find(arg => arg.startsWith('--') && arg !== '--json');
if (unknown) {
  console.error(`Unknown option: ${unknown}. Use --help.`);
  process.exit(2);
}
const json = args.includes('--json');
const terms = args.filter(arg => arg !== '--json').map(arg => arg.toLowerCase());
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = await mkdtemp(join(tmpdir(), 'troika-catalog-'));
try {
  const outfile = join(dir, 'catalog.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `import { SOFTWARE } from './src/world/software/native';
        export const catalog = SOFTWARE.map(app => ({
          number: app.number, id: app.id, kind: app.kind ?? 'numeric',
          site: app.site, title: app.title, description: app.description,
          inputs: app.inputs, outputs: app.outputs,
          url: 'http://' + app.site + '.world/p' + String(app.number - 1).padStart(4, '0')
        })).sort((a, b) => a.number - b.number);`,
      resolveDir: root,
    },
    outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'warning',
  });
  const { catalog } = await import(pathToFileURL(outfile).href);
  const matches = catalog.filter(app => {
    const text = `${app.number} ${app.id} kind:${app.kind} site:${app.site} ${app.title} ${app.description} ${app.inputs.join(' ')} ${app.outputs.join(' ')}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
  if (json) console.log(JSON.stringify(matches, null, 2));
  else {
    console.log(`${matches.length} of ${catalog.length} native programs`);
    for (const app of matches) {
      console.log(`\n${app.number}. ${app.title} [${app.id}; ${app.kind}]\n${app.url}\n${app.description}`);
    }
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
