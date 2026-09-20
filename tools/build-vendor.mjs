#!/usr/bin/env node
/* Bundles vendor-entry.js into ../vendor/editor-libs.js.
   Run once after changing tools/package.json or vendor-entry.js:
     cd tools && npm install && npm run build
   The output is committed; the app never runs a build. */
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const versions = Object.keys(pkg.devDependencies).filter((n) => n !== 'esbuild')
  .map((n) => `${n}@${JSON.parse(readFileSync(new URL(`./node_modules/${n}/package.json`, import.meta.url))).version}`);

await build({
  entryPoints: [new URL('./vendor-entry.js', import.meta.url).pathname],
  outfile: new URL('../vendor/editor-libs.js', import.meta.url).pathname,
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
  banner: { js: `/* Vendored editor libraries: ${versions.join(', ')}. Built by tools/build-vendor.mjs — do not edit. */` },
});
console.log('vendor/editor-libs.js written:', versions.join(', '));
