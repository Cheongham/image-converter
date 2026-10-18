import {build} from 'esbuild';
import {mkdir,copyFile,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const out=path.join(root,'dist');const assets=path.join(out,'assets');await mkdir(assets,{recursive:true});
await build({entryPoints:{app:path.join(root,'src/app.js'),worker:path.join(root,'src/worker.js')},outdir:assets,bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,legalComments:'eof',logLevel:'info'});
for(const [src,dest] of [['src/index.html','dist/index.html'],['src/styles.css','dist/assets/styles.css'],['src/favicon.svg','dist/assets/favicon.svg'],['src/.htaccess','dist/.htaccess'],['LICENSE','dist/LICENSE.txt']])await copyFile(path.join(root,src),path.join(root,dest));
for(const f of ['webp_enc.wasm','webp_enc_simd.wasm'])await copyFile(path.join(root,'node_modules/@jsquash/webp/codec/enc',f),path.join(assets,f));
const licenses=[];for(const name of ['gifenc','fflate','@jsquash/webp','wasm-feature-detect']){const dir=path.join(root,'node_modules',name);const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));const files=await readdir(dir);const license=files.find(f=>/^licen[cs]e(?:\.|$)/i.test(f));licenses.push(`## ${name} ${pkg.version}\n\n${license?await readFile(path.join(dir,license),'utf8'):'License: '+pkg.license}`)}
licenses.push('## libwebp / Squoosh codecs\n\nWebP codecs are distributed through @jsquash/webp (Apache-2.0), using libwebp (BSD-3-Clause). See https://github.com/webmproject/libwebp/blob/main/COPYING and https://github.com/GoogleChromeLabs/squoosh.');
licenses.push('## libwebp license\n\n'+await readFile(path.join(root,'src/LIBWEBP-LICENSE.txt'),'utf8'));
await writeFile(path.join(out,'THIRD_PARTY_NOTICES.md'),licenses.join('\n\n---\n\n').trimEnd()+'\n');
console.log('Static deployment ready: dist/ (including local WebP WASM encoders).');
