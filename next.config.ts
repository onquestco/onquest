import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Unlisted trip URLs must never be sent to map or analytics hosts.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

const nextConfig: NextConfig = {
  // Next.js reserves folders starting with "@", so /@handle URLs map onto app/(public)/u/...
  async rewrites() {
    return [
      { source: '/@:handle', destination: '/u/:handle' },
      { source: '/@:handle/:slug', destination: '/u/:handle/:slug' },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
