import { Caveat, Cormorant_Garamond, Nunito } from 'next/font/google';
import styles from './alpine.module.css';

// next/font downloads these at build time and serves them from our own domain, so pages and
// Instagram exports never call Google Fonts at runtime. The design uses three families; the two
// variables it doesn't use point at the nearest of them in alpine.module.css (--font-script at
// Caveat, --font-type at Nunito), so shared pieces that ask for them need no extra download.

const hand = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap' });
const serif = Cormorant_Garamond({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Nunito({
  weight: ['400', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const alpineFontClassName = [hand.variable, serif.variable, sans.variable, styles.fontAliases].join(' ');
