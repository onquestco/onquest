import { Bitter, Caveat, Courier_Prime, Satisfy, Work_Sans } from 'next/font/google';

// next/font downloads these at build time and serves them from our own domain,
// so pages and Instagram exports never call Google Fonts at runtime.

const script = Satisfy({ weight: '400', subsets: ['latin'], variable: '--font-script', display: 'swap' });
const type = Courier_Prime({ weight: '400', subsets: ['latin'], variable: '--font-type', display: 'swap' });
const hand = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap' });
const serif = Bitter({
  weight: ['500', '700'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Work_Sans({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const mountainFontClassName = [script, type, hand, serif, sans].map((font) => font.variable).join(' ');
