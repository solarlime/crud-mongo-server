import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  packages: 'external',
  outfile: 'dist/server.js',
});
