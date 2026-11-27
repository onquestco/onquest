// `npm run analytics`: rewrites the generated taxonomy module from the Taxonomy sheet's CSV export
// (docs/analytics/v2), and the paste-ready G1 BigQuery files. The v1 taxonomy is frozen in
// taxonomyV1.ts and isn't generated any more (docs/specs/analytics-v2.md §3.5).
import { readFileSync, writeFileSync } from 'node:fs';
import { renderApplyG1, renderFixtureCheck } from './bigqueryG1.ts';
import { commonPropertiesFromCsv, renderTaxonomyV2Module, taxonomyV2FromCsv } from './taxonomyFromCsv.ts';

const csv = (path: string) => readFileSync(new URL(`../../docs/analytics/${path}.csv`, import.meta.url), 'utf8');

writeFileSync(
  new URL('./taxonomy.ts', import.meta.url),
  renderTaxonomyV2Module(taxonomyV2FromCsv(csv('v2/events')), commonPropertiesFromCsv(csv('v2/common'))),
);
console.log('lib/analytics/taxonomy.ts updated');

const bigquery = (file: string) => new URL(`../../docs/analytics/bigquery/${file}`, import.meta.url);
const readSql = (file: string) => readFileSync(bigquery(file), 'utf8');
writeFileSync(bigquery('g1_fixture_check.sql'), renderFixtureCheck(readSql));
writeFileSync(bigquery('apply-g1.sql'), renderApplyG1(readSql));
console.log('docs/analytics/bigquery/{g1_fixture_check,apply-g1}.sql updated');
