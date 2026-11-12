import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

// Search engines and AI *search* bots may crawl public pages; AI *training* bots are opted out.
// See docs/03-security-visibility-seo.md §D.2 before changing this.
const AI_TRAINING_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in app screens (all noindex): nothing for a crawler there.
        disallow: [
          '/trips/',
          '/new',
          '/settings',
          '/login',
          '/onboarding',
          '/auth/',
          '/api/',
          '/home',
          '/explore',
          '/quests',
          '/notifications',
          '/welcome',
        ],
      },
      { userAgent: AI_TRAINING_BOTS, disallow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
