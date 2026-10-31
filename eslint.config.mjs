import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Photos are pre-resized on upload (thumb/display) and served from storage with srcset,
      // so we don't use next/image (and avoid paying for image optimisation). docs/01-hld.md §1.
      '@next/next/no-img-element': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'docs/**'] },
];

export default config;
