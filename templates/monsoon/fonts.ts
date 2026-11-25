import { Caveat, Montserrat, Nunito } from 'next/font/google';
import styles from './monsoon.module.css';

// next/font downloads these at build time and serves them from our own domain, so pages and
// Instagram exports never call Google Fonts at runtime. The design uses three families: Montserrat
// for its uppercase titles, kickers and stamps (--font-script, the display slot in Roadtrip and
// Winter), Caveat for captions and Nunito for the rest. The two variables it doesn't use
// (--font-type, --font-serif) point at Nunito in monsoon.module.css, as in Roadtrip and Winter, so
// shared pieces that ask for them need no extra download.

const display = Montserrat({
  weight: ['300', '500', '800'],
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
});
const hand = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap' });
const sans = Nunito({
  weight: ['400', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const monsoonFontClassName = [
  display.variable,
  hand.variable,
  sans.variable,
  styles.fontAliases,
].join(' ');
