import type { NextConfig } from "next";

const PRIVATE_RESPONSE_PATHS = [
  '/admin/:path*',
  '/api/:path*',
  '/auth/:path*',
  '/dashboard/:path*',
  '/chat/:path*',
  '/buddy/interests/:path*',
  '/team-chat/:path*',
  '/bookings/:path*',
  '/profile/:path*',
  '/verify-ticket/:path*',
];

function serverActionAllowedOrigins(): string[] {
  const origins = new Set<string>([
    'gotogethertrip.com',
    'www.gotogethertrip.com',
    'staging.gotogethertrip.com',
  ]);

  for (const value of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_SERVER_ACTION_ALLOWED_ORIGINS,
  ]) {
    if (!value) continue;
    for (const entry of value.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      try {
        origins.add(new URL(trimmed).hostname);
      } catch {
        origins.add(trimmed.replace(/^https?:\/\//, '').replace(/\/$/, ''));
      }
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  compress: true,
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || process.env.DEPLOYMENT_VERSION,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Security headers on every response; CSP is nonce-generated in src/proxy.ts.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), browsing-topics=(), usb=(), serial=(), bluetooth=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'Origin-Agent-Cluster', value: '?1' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // No caching on any API route; data is always fresh.
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      ...PRIVATE_RESPONSE_PATHS.filter((source) => !source.startsWith('/api/')).map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      })),
      {
        // Cache uploaded/public images for 7 days with revalidation.
        source: '/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
