// `npm run tokens`: rewrites tokens.css from tokens.ts. Runs with Node's built-in TypeScript support.
import { writeFileSync } from 'node:fs';
import { renderTokensCss } from './tokensCss.ts';

writeFileSync(new URL('./tokens.css', import.meta.url), renderTokensCss());
console.log('design-system/tokens.css updated');
