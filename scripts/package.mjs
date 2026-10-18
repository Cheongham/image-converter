import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {zipSync,unzipSync} from 'fflate';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const files={};async function collect(dir,relative=''){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const rel=path.posix.join(relative,entry.name),full=path.join(dir,entry.name);if(entry.isDirectory())await collect(full,rel);else if(entry.isFile())files['image-converter/'+rel]=new Uint8Array(await readFile(full))}}
await collect(dist);if(!files['image-converter/index.html']||!files['image-converter/.htaccess'])throw new Error('Missing deployment entrypoints');
const zip=zipSync(files,{level:9}),decoded=unzipSync(zip);for(const name of Object.keys(files)){if(decoded[name].length!==files[name].length||!decoded[name].every((v,i)=>v===files[name][i]))throw new Error('Archive integrity mismatch: '+name)}
await mkdir(path.join(root,'releases'),{recursive:true});const target=path.join(root,'releases/image-converter-cpanel.zip');await writeFile(target,zip);console.log(`Verified ${Object.keys(files).length} files in ${target} (${zip.byteLength.toLocaleString()} bytes). Extract at the domain document root.`);
