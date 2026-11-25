import { Caveat, Nunito, Pacifico } from 'next/font/google';
import styles from './coastal.module.css';

// next/font downloads these at build time and serves them from our own domain, so pages and
// Instagram exports never call Google Fonts at runtime. The design uses three families; the two
// variables it doesn't use (--font-type, --font-serif) point at Nunito in coastal.module.css, so
// shared pieces that ask for them get a Coastal font without an extra download.

const script = Pacifico({ weight: '400', subsets: ['latin'], variable: '--font-script', display: 'swap' });
const hand = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap' });
const sans = Nunito({
  weight: ['400', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const coastalFontClassName = [script.variable, hand.variable, sans.variable, styles.fontAliases].join(
  ' ',
);
