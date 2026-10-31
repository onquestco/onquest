import { Caveat, DM_Sans, Kaushan_Script, Playfair_Display, Special_Elite } from 'next/font/google';

// next/font downloads these at build time and serves them from our own domain,
// so pages and Instagram exports never call Google Fonts at runtime.

const script = Kaushan_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
});
const type = Special_Elite({ weight: '400', subsets: ['latin'], variable: '--font-type', display: 'swap' });
const hand = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap' });
const serif = Playfair_Display({
  weight: '500',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = DM_Sans({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const beachFontClassName = [script, type, hand, serif, sans].map((font) => font.variable).join(' ');
