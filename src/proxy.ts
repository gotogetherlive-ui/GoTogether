import { NextRequest, NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ORIGIN_EXEMPT_PATHS = new Set(['/api/webhooks/razorpay']);
const PAYMENT_SOURCES = [
  'https://checkout.razorpay.com',
  'https://api.razorpay.com',
  'https://*.razorpay.com',
  'https://sdk.cashfree.com',
  'https://api.cashfree.com',
  'https://sandbox.cashfree.com',
].join(' ');

function isOriginExemptPath(pathname: string): boolean {
  return ORIGIN_EXEMPT_PATHS.has(pathname)
    || pathname.startsWith('/api/webhooks/payments/')
    || pathname.startsWith('/api/cron/');
}

function getRequestOrigin(request: NextRequest): string | null {
  const expectedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'http';
  return expectedHost ? `${protocol}://${expectedHost}` : null;
}

function getExpectedOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
    'https://checkout.razorpay.com',
    'https://sdk.cashfree.com',
  ].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `form-action 'self' ${PAYMENT_SOURCES}`,
    `script-src ${scriptSrc}`,
    "script-src-attr 'none'",
    `img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://maps.gstatic.com https://lh3.googleusercontent.com https://images.unsplash.com ${PAYMENT_SOURCES}`,
    `connect-src 'self' ${PAYMENT_SOURCES} https://maps.googleapis.com https://maps.gstatic.com https://api.bigdatacloud.net`,
    `frame-src 'self' ${PAYMENT_SOURCES}`,
    `child-src 'self' ${PAYMENT_SOURCES}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' https://res.cloudinary.com https://*.cloudinary.com",
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

function withContentSecurityPolicy(request: NextRequest, response: NextResponse): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const nextResponse = response.headers.has('Location') || response.status !== 200
    ? response
    : NextResponse.next({ request: { headers: requestHeaders } });

  nextResponse.headers.set('Content-Security-Policy', csp);
  return nextResponse;
}

function checkUnsafeApiOrigin(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method) || isOriginExemptPath(request.nextUrl.pathname)) {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return NextResponse.json({ error: 'Missing request origin' }, { status: 403 });
  }

  try {
    const requestOrigin = getRequestOrigin(request);
    const requestMatchesDevServer = process.env.NODE_ENV !== 'production'
      && requestOrigin
      && new URL(origin).origin === requestOrigin;

    if (requestMatchesDevServer) {
      return null;
    }

    const expectedOrigin = getExpectedOrigin();
    if (!expectedOrigin || new URL(origin).origin !== expectedOrigin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  return null;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return checkUnsafeApiOrigin(request) || NextResponse.next();
  }

  return withContentSecurityPolicy(request, NextResponse.next());
}

export const config = {
  matcher: [
    '/api/:path*',
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
