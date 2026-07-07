import { queryOne, run } from './db';

/** Shared database-backed fixed-window limiter for multi-process deployments. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const row = await queryOne<{ request_count: number; window_started_at: string }>(`
    INSERT INTO rate_limits (key, window_started_at, request_count)
    VALUES ($1, NOW(), 1)
    ON CONFLICT (key) DO UPDATE SET
      request_count = CASE
        WHEN rate_limits.window_started_at <= NOW() - ($2::bigint * INTERVAL '1 millisecond') THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN rate_limits.window_started_at <= NOW() - ($2::bigint * INTERVAL '1 millisecond') THEN NOW()
        ELSE rate_limits.window_started_at
      END
    RETURNING request_count, window_started_at
  `, [key, windowMs]);

  const count = Number(row?.request_count || 1);
  const elapsed = Date.now() - new Date(row?.window_started_at || Date.now()).getTime();
  const allowed = count <= limit;
  if (count === 1) {
    void run(`DELETE FROM rate_limits WHERE window_started_at < NOW() - INTERVAL '1 day'`).catch(() => {});
  }
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMs: allowed ? 0 : Math.max(0, windowMs - elapsed),
  };
}

export function getClientIP(request: Request): string {
  if (process.env.TRUST_PROXY !== 'true') return 'untrusted-proxy';
  const cloudflare = request.headers.get('cf-connecting-ip');
  if (cloudflare) return cloudflare.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}
