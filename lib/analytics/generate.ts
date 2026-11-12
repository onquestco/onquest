// `npm run analytics`: rewrites taxonomy.ts from the Taxonomy sheet's CSV export.
import { readFileSync, writeFileSync } from 'node:fs';
import { renderTaxonomyModule, taxonomyFromCsv } from './taxonomyFromCsv.ts';

const read = (name: string) =>
  taxonomyFromCsv(readFileSync(new URL(`../../docs/analytics/${name}.csv`, import.meta.url), 'utf8'));

writeFileSync(
  new URL('./taxonomy.ts', import.meta.url),
  renderTaxonomyModule(read('client-events'), read('server-events')),
);
console.log('lib/analytics/taxonomy.ts updated');
