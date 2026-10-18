import {build} from 'esbuild';
await build({entryPoints:['tests/browser-harness-src.js'],outfile:'tests/browser-harness.js',bundle:true,format:'esm',platform:'browser'});
console.log('Open /tests/browser.html through npm run preview to run browser checks.');
