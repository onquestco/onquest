import { Caveat, Nunito, Poppins } from 'next/font/google';
import styles from './desert.module.css';

// next/font downloads these at build time and serves them from our own domain, so pages and
// Instagram exports never call Google Fonts at runtime. The design uses three families: Poppins for
// its titles, kickers and stamps (--font-script, the display slot in Roadtrip, Winter and Monsoon),
// Caveat for captions and Nunito for the rest. The two variables it doesn't use (--font-type,
// --font-serif) point at Nunito in desert.module.css, as in the others, so shared pieces that ask
// for them need no extra download.

const display = Poppins({
  weight: ['600', '700'],
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

export const desertFontClassName = [
  display.variable,
  hand.variable,
  sans.variable,
  styles.fontAliases,
].join(' ');
