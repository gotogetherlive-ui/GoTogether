import { NextRequest, NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ORIGIN_EXEMPT_PATHS = new Set(['/api/webhooks/razorpay']);

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

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method) || isOriginExemptPath(request.nextUrl.pathname)) {
    return NextResponse.next();
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
      return NextResponse.next();
    }

    const expectedOrigin = getExpectedOrigin();
    if (!expectedOrigin || new URL(origin).origin !== expectedOrigin) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};