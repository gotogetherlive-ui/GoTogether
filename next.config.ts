import type { NextConfig } from "next";
const isDev = process.env.NODE_ENV !== "production";
// Incremental CSP hardening: production still allows inline script blocks because
// this app uses static Next headers. A full nonce migration should move CSP
// generation to src/proxy.ts as documented by Next, opt pages into dynamic
// rendering where needed, and remove 'unsafe-inline' from script-src/style-src.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://maps.googleapis.com",
  "https://maps.gstatic.com",
  "https://checkout.razorpay.com",
  "https://sdk.cashfree.com",
].join(" ");

const razorpaySources = [
  "https://checkout.razorpay.com",
  "https://api.razorpay.com",
  "https://*.razorpay.com",
  "https://sdk.cashfree.com",
  "https://api.cashfree.com",
  "https://sandbox.cashfree.com",
].join(" ");

const nextConfig: NextConfig = {
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
  async headers() {
    return [
      {
        // Security headers on every response
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' ${razorpaySources}; script-src ${scriptSrc}; script-src-attr 'none'; img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://maps.gstatic.com https://lh3.googleusercontent.com https://images.unsplash.com ${razorpaySources}; connect-src 'self' ${razorpaySources} https://maps.googleapis.com https://maps.gstatic.com https://api.bigdatacloud.net; frame-src 'self' ${razorpaySources}; child-src 'self' ${razorpaySources}; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' https://res.cloudinary.com https://*.cloudinary.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;${isDev ? '' : ' upgrade-insecure-requests;'}`
          },
        ],
      },
      {
        // No caching on any API route Ã¢â‚¬â€ data is always fresh
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },

      {
        // Cache uploaded/public images for 7 days with revalidation
        source: '/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
