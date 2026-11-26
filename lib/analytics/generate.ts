// `npm run analytics`: rewrites the generated taxonomy modules from the Taxonomy sheet's CSV export.
// taxonomy.ts (v1) is what the app sends today; taxonomyV2.ts replaces it in AN-02.
import { readFileSync, writeFileSync } from 'node:fs';
import {
  commonPropertiesFromCsv,
  renderTaxonomyModule,
  renderTaxonomyV2Module,
  taxonomyFromCsv,
  taxonomyV2FromCsv,
} from './taxonomyFromCsv.ts';

const csv = (path: string) => readFileSync(new URL(`../../docs/analytics/${path}.csv`, import.meta.url), 'utf8');

writeFileSync(
  new URL('./taxonomy.ts', import.meta.url),
  renderTaxonomyModule(taxonomyFromCsv(csv('client-events')), taxonomyFromCsv(csv('server-events'))),
);
console.log('lib/analytics/taxonomy.ts updated');

writeFileSync(
  new URL('./taxonomyV2.ts', import.meta.url),
  renderTaxonomyV2Module(taxonomyV2FromCsv(csv('v2/events')), commonPropertiesFromCsv(csv('v2/common'))),
);
console.log('lib/analytics/taxonomyV2.ts updated');
