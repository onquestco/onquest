// Test-only stand-in for next/font/google, which works only inside a Next.js build. Each font gives
// a stable class name, so rendered markup can be compared between runs. Use in a test with
//   vi.mock('next/font/google', () => import('@/templates/shared/nextFontStub'));

const font = (name: string) => (options: { variable: string }) => ({
  className: name,
  variable: `${name}${options.variable}`,
  style: { fontFamily: name },
});

export const Bitter = font('Bitter');
export const Caveat = font('Caveat');
export const Cormorant_Garamond = font('Cormorant_Garamond');
export const Courier_Prime = font('Courier_Prime');
export const DM_Sans = font('DM_Sans');
export const Kaushan_Script = font('Kaushan_Script');
export const Nunito = font('Nunito');
export const Pacifico = font('Pacifico');
export const Playfair_Display = font('Playfair_Display');
export const Satisfy = font('Satisfy');
export const Special_Elite = font('Special_Elite');
export const Work_Sans = font('Work_Sans');
