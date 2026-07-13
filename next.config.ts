import type { NextConfig } from "next";

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
    minimumCacheTTL: 3600,
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
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // No caching on any API route; data is always fresh.
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
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
