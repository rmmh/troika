#!/usr/bin/env node
/** Reproducibly pack the pinned NASA import; no network or astronomical calculation. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../../',import.meta.url));
const bundle=await build({stdin:{contents:"export {buildEclipseCartridge} from './src/world/astronomy/eclipseCartridgePacking.ts'",resolveDir:root},bundle:true,write:false,platform:'node',format:'esm'});
const {buildEclipseCartridge}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const source=await readFile(new URL('../../src/world/astronomy/data/nasa-eclipses.json',import.meta.url));
const cells=buildEclipseCartridge(JSON.parse(source));
const bytes=Buffer.alloc(cells.length*2);cells.forEach((cell,i)=>bytes.writeInt16LE(cell,i*2));
const artifact={schema:1,blocks:cells.length/243,sourceSha256:createHash('sha256').update(source).digest('hex'),sha256:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')};
const target=new URL('../../src/world/astronomy/data/eclipse-cartridge.json',import.meta.url),output=JSON.stringify(artifact)+'\n';
if(process.argv.includes('--check')){
 if(await readFile(target,'utf8')!==output)throw new Error('Stale eclipse cartridge; run node scripts/astronomy/pack-eclipses.mjs');
}else await writeFile(target,output);
console.log(`Eclipse cartridge: ${artifact.blocks} blocks, ${bytes.length} bytes, ${artifact.sha256}`);
