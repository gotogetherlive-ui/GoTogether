import { test, expect } from '@playwright/test';

test('sitemap URLs resolve to indexable pages with matching canonical metadata', async ({ request }) => {
  test.setTimeout(180000);
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain('<urlset');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
  expect(urls.length).toBeGreaterThan(5);
  expect(new Set(urls).size).toBe(urls.length);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap:');
  expect(robots).toContain('Disallow: /buddy/interests');
  for (const url of urls) {
    const target = new URL(url);
    expect(target.pathname).not.toMatch(/^\/(api|admin|chat|team-chat|dashboard|buddy\/interests)(\/|$)/);
    const page = await request.get(target.pathname);
    expect(page.status(), target.pathname).toBe(200);
    const html = await page.text();
    expect(html, target.pathname).toMatch(/<title>[^<]+<\/title>/);
    expect(html, target.pathname).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html, target.pathname).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
    expect(page.headers()['x-robots-tag'] || '', target.pathname).not.toContain('noindex');
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical, target.pathname).toBeTruthy();
    expect(new URL(canonical!).href, target.pathname).toBe(target.href);
    for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      expect(() => JSON.parse(match[1]), target.pathname).not.toThrow();
    }
  }
});

test('private APIs deny anonymous access and private interests stay out of search', async ({ request }) => {
  for (const path of ['/api/profile', '/api/chat/notifications', '/api/admin/traveler-reports', '/api/admin/business-introductions']) {
    const response = await request.get(path);
    expect([401, 403], path).toContain(response.status());
  }
  const chats = await request.get('/api/chat/trips');
  expect(await chats.json()).toEqual({ trips: [], hasTeamChats: false });
  const interests = await request.get('/buddy/interests', { maxRedirects: 0 });
  expect(interests.headers()['x-robots-tag']).toContain('noindex');
});
