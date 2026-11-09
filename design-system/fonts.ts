import { Inter } from 'next/font/google';

// next/font downloads Inter at build time and serves it from our own domain (no Google Fonts calls
// at runtime). The variable feeds `--font-sans` in tokens.css.
const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Put on <html> so every app screen gets Inter. Templates set their own fonts on their page. */
export const appFontClassName = inter.variable;
