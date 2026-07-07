import crypto from 'node:crypto';

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get('authorization') || '';
  const supplied = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : request.headers.get('x-cron-secret') || '';
  if (!supplied || supplied.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}
