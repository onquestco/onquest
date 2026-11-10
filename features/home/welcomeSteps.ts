import type { Scene } from '@/lib/demo/placeholderImages';

// Copy from the PRD (screen 10), the same words in the welcome screens and "What's a Quest?".
export const WELCOME_STEPS: { headline: string; text: string; scenes: [Scene, Scene, Scene] }[] = [
  {
    headline: 'Your trip, as a scrapbook',
    text: 'A Quest is an animated scrapbook of one trip. Up to 5 pages, 3 photos each.',
    scenes: ['beach', 'palm', 'cove'],
  },
  {
    headline: 'Pick photos. We do the rest.',
    text: 'Choose 3 to 15 photos. We sort them by day, add places and dates, and lay out the pages.',
    scenes: ['street', 'church', 'bonfire'],
  },
  {
    headline: 'Share it. Friends react.',
    text: 'Send the link on WhatsApp or post it to Instagram. Friends like and comment, no app needed.',
    scenes: ['cove', 'beach', 'face'],
  },
];
