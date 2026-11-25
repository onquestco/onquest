import { Caveat, Lilita_One, Nunito } from 'next/font/google';
import styles from './roadtrip.module.css';

// next/font downloads these at build time and serves them from our own domain, so pages and
// Instagram exports never call Google Fonts at runtime. The design uses three families: Lilita One
// for its stroked titles (--font-script), Caveat for captions and Nunito for the rest. The two
// variables it doesn't use (--font-type, --font-serif) point at Nunito in roadtrip.module.css, as
// in Coastal, so shared pieces that ask for them need no extra download.

const display = Lilita_One({ weight: '400', subsets: ['latin'], variable: '--font-script', display: 'swap' });
const hand = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap' });
const sans = Nunito({
  weight: ['400', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const roadtripFontClassName = [
  display.variable,
  hand.variable,
  sans.variable,
  styles.fontAliases,
].join(' ');
