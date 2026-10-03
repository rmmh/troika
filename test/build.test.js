import { afterEach, describe, expect, it } from 'vitest';
import { build, context } from 'esbuild';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asmDirPlugin, asmTextPlugin } from '../scripts/build-plugins.mjs';
import { webOptions } from '../scripts/web-build.mjs';

describe('assembly build plugins', () => {
  let dir;
  let ctx;
  afterEach(async () => {
    await ctx?.dispose();
    ctx = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function fixture() {
    dir = mkdtempSync(join(tmpdir(), 'troika-build-test-'));
    mkdirSync(join(dir, 'demos'));
    write('entry.js', 'import demos from "asm-dir:demos"; console.log(demos);');
    return {
      absWorkingDir: dir, entryPoints: ['entry.js'], bundle: true,
      write: false, logLevel: 'silent', plugins: [asmDirPlugin, asmTextPlugin],
    };
  }
  function write(path, source) { writeFileSync(join(dir, path), source); }

  it('expands nested includes relative to their containing files', async () => {
    const options = fixture();
    mkdirSync(join(dir, 'demos', 'lib'));
    write('demos/main.asm', '; title: Example\n#include "lib/outer.inc"');
    write('demos/lib/outer.inc', '#include "inner.inc" ; nested\nI A 1');
    write('demos/lib/inner.inc', 'M A 83');
    const result = await build(options);
    const output = result.outputFiles[0].text;
    expect(output).toContain('Example');
    expect(output).toContain('M A 83\\nI A 1');
    expect(output).not.toContain('#include');
  });

  it('diagnoses recursive includes', async () => {
    const options = fixture();
    write('demos/main.asm', '#include "main.asm"');
    await expect(build(options)).rejects.toThrow('recursive #include');
  });

  it('emits and watches the HTML and CSS served by the web app', async () => {
    fixture();
    mkdirSync(join(dir, 'src/web'), { recursive: true });
    write('src/web/main.tsx', 'console.log("app");');
    write('src/web/style.css', 'body { color: red; }');
    write('index.html', '<title>Original</title>');
    let latest;
    ctx = await context({
      ...webOptions, absWorkingDir: dir, write: false, logLevel: 'silent',
      plugins: [...webOptions.plugins, {
        name: 'observe', setup(build) { build.onEnd(result => { latest = result; }); },
      }],
    });
    await ctx.watch();
    const output = name => latest?.outputFiles?.find(file => file.path === join(dir, 'dist', name))?.text ?? '';
    await expect.poll(() => output('index.html')).toContain('Original');
    expect(output('main.js')).toContain('app');
    expect(output('style.css')).toContain('red');
    write('index.html', '<title>Updated</title>');
    await expect.poll(() => output('index.html')).toContain('Updated');
    write('src/web/style.css', 'body { color: blue; }');
    await expect.poll(() => output('style.css')).toContain('blue');
    expect(latest.errors).toEqual([]);
  });

  it('rebuilds when includes, titles, and demo directory entries change', async () => {
    const options = fixture();
    write('demos/main.asm', '; title: Original\n#include "shared.inc"');
    write('demos/shared.inc', 'M A 83');
    let latest;
    options.plugins.push({ name: 'observe', setup(build) { build.onEnd((result) => { latest = result; }); } });
    ctx = await context(options);
    await ctx.watch();
    const output = () => latest?.outputFiles?.[0]?.text ?? '';
    await expect.poll(output).toContain('M A 83');

    write('demos/shared.inc', 'M A 99');
    await expect.poll(output).toContain('M A 99');

    write('demos/main.asm', '; title: Renamed\n#include "shared.inc"');
    await expect.poll(output).toContain('Renamed');
    expect(output()).not.toContain('Original');

    write('demos/added.asm', '; title: Added\nI B 1');
    await expect.poll(output).toContain('Added');
    rmSync(join(dir, 'demos/added.asm'));
    await expect.poll(output).not.toContain('Added');

    rmSync(join(dir, 'demos/shared.inc'));
    await expect.poll(() => latest?.errors?.length).toBeGreaterThan(0);
    write('demos/shared.inc', 'M A 123');
    await expect.poll(output).toContain('M A 123');
    expect(latest.errors).toEqual([]);
  }, 15_000);
});
