import { expect, test } from "@playwright/test";

test("trip search preserves submitted filters and resets them on client navigation", async ({ page }) => {
  await page.goto("/trips");
  await page.getByRole("searchbox", { name: "Search trips" }).fill("no-matching-destination-e2e");
  await page.getByLabel("Filter trips by date").fill("2027-04-14");
  await page.getByLabel("Filter trips by duration").selectOption("8+");
  await page.getByRole("button", { name: "Search trips" }).click();

  await expect(page.getByRole("heading", { name: "No trips match your search." })).toBeVisible();
  await expect(page.getByLabel("Filter trips by date")).toHaveValue("2027-04-14");
  await expect(page.getByLabel("Filter trips by duration")).toHaveValue("8+");
  expect(new URL(page.url()).searchParams.get("q")).toBe("no-matching-destination-e2e");

  await page.getByRole("link", { name: "Clear all filters" }).click();
  await expect(page.getByRole("searchbox", { name: "Search trips" })).toHaveValue("");
  await expect(page.getByLabel("Filter trips by date")).toHaveValue("");
  await expect(page.getByLabel("Filter trips by duration")).toHaveValue("");
});

test("support dialog traps keyboard focus and returns it on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact");
  const trigger = page.getByRole("button", { name: "Contact Support", exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Contact Support" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close support dialog" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile navigation opens and dismisses with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle menu" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("trip filters remain usable at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/trips");
  const search = await page.getByRole("searchbox", { name: "Search trips" }).boundingBox();
  const date = await page.getByLabel("Filter trips by date").boundingBox();
  expect(search!.width).toBeGreaterThan(200);
  expect(date!.x).toBeGreaterThanOrEqual(search!.x + search!.width);
});

test("featured destinations rotate, pause, and support manual navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Featured travel destinations" });
  await expect(carousel.getByRole("button", { name: "Pause slideshow" })).toBeVisible();
  await expect(carousel.getByText("Kerala Backwaters", { exact: true })).toBeVisible({ timeout: 12000 });
  await carousel.getByRole("button", { name: "Pause slideshow" }).click();
  await expect(carousel.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  await carousel.getByRole("button", { name: "Next destination" }).click();
  await expect(carousel.getByText("Goa Beaches", { exact: true })).toBeVisible();
  await carousel.getByRole("button", { name: "Previous destination" }).click();
  await expect(carousel.getByText("Kerala Backwaters", { exact: true })).toBeVisible();
});

test("reduced-motion visitors can change destinations without autoplay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Featured travel destinations" });
  await expect(carousel.getByRole("button", { name: "Pause slideshow" })).toHaveCount(0);
  await carousel.getByRole("button", { name: "Next destination" }).click();
  await expect(carousel.getByText("Kerala Backwaters", { exact: true })).toBeVisible();
});

test("sitemap and metadata feature custom trips and the public buddy finder", async ({ request, page }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toMatch(/<loc>[^<]+\/custom-trip<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]+\/buddy<\/loc>/);
  expect(xml).toContain("hero_india_ladakh.png");
  expect(xml).not.toMatch(/<loc>[^<]+\/(admin|dashboard|chat|stories|verify-ticket)(\/|<)/);
  await page.goto("/");
  await expect(page).toHaveTitle(/Custom Trips, Travel Buddies/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#ea580c");
});
