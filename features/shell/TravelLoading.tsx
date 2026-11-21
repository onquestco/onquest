'use client';

import { useEffect, useState } from 'react';

// While a screen loads (OQ-3): a bobbing map pin and a travel fact that changes every few seconds,
// so a slow connection feels like part of the trip rather than a blank page.

const FACTS = [
  'Goa is India’s smallest state by area.',
  'Hampi was the capital of the Vijayanagara Empire.',
  'Mawsynram in Meghalaya is one of the wettest places on Earth.',
  'The Rann of Kutch is one of the largest salt deserts in the world.',
  'Chilika in Odisha is Asia’s largest brackish-water lagoon.',
  'Key Monastery in Spiti is about a thousand years old.',
  'India has more than 40 UNESCO World Heritage Sites.',
  'Kerala’s backwaters are a maze of lakes, canals and rivers.',
];
const EVERY_MS = 3500;

export function TravelLoading({ label = 'Loading' }: { label?: string }) {
  // A random first fact would differ between server and browser; rotate only after load.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % FACTS.length), EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="mx-auto flex min-h-96 max-w-sm flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <svg
        aria-hidden
        width="44"
        height="52"
        viewBox="0 0 24 28"
        className="animate-bounce fill-brand-strong motion-reduce:animate-none"
      >
        <path d="M12 0C5.4 0 0 5.2 0 11.6 0 19.3 12 28 12 28s12-8.7 12-16.4C24 5.2 18.6 0 12 0Zm0 16a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" />
      </svg>
      <p className="text-label text-ink-muted">Did you know?</p>
      <p className="min-h-12 text-body text-ink" aria-live="polite">
        {FACTS[index]}
      </p>
    </main>
  );
}
