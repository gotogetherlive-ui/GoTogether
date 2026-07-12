import { expect, test } from "@playwright/test";
import {
  collectDiagnostics,
  e2eKey,
  fixtureOtp,
  fixturePassword,
  loginFixture,
  prepareOtpSignup,
  resetEmail,
  setupFixtures,
  timeVisible,
  waitForAuthenticatedNavbar,
} from "./helpers";

test.beforeAll(async ({ request }) => {
  await setupFixtures(request);
});

async function passwordLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("e2e.alpha@goto.local");
  await page.getByLabel("Password").fill(fixturePassword);
  const started = Date.now();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await waitForAuthenticatedNavbar(page);
  return Date.now() - started;
}

test("password login, cross-tab session sync, and logout remain server authoritative", async ({ context }, testInfo) => {
  const signedOutTab = await context.newPage();
  const finishSignedOutDiagnostics = collectDiagnostics(signedOutTab);
  await signedOutTab.goto("/");
  await expect(signedOutTab.getByRole("navigation").getByRole("link", { name: "Sign In" })).toBeVisible();

  const loginTab = await context.newPage();
  const finishLoginDiagnostics = collectDiagnostics(loginTab);
  const visibleDelay = await passwordLogin(loginTab);
  testInfo.annotations.push({ type: "password-login-visible-ms", description: String(visibleDelay) });
  expect(visibleDelay).toBeLessThan(5000);
  await expect(signedOutTab.getByLabel("Open user menu")).toBeVisible({ timeout: 1000 });

  await loginTab.getByLabel("Open user menu").click();
  const signoutResponsePromise = loginTab.waitForResponse((response) =>
    response.url().includes("/api/auth/signout") && response.request().method() === "POST",
  );
  await loginTab.getByRole("button", { name: "Sign Out" }).click();
  const signoutResponse = await signoutResponsePromise;
  expect(signoutResponse.ok()).toBeTruthy();
  const logoutPropagatedStarted = Date.now();
  await expect(signedOutTab.getByRole("navigation").getByRole("link", { name: "Sign In" })).toBeVisible({ timeout: 1000 });
  const logoutPropagatedMs = Date.now() - logoutPropagatedStarted;
  testInfo.annotations.push({ type: "cross-tab-logout-visible-ms", description: String(logoutPropagatedMs) });
  expect(logoutPropagatedMs).toBeLessThan(1000);

  const protectedResponse = await signedOutTab.request.get("/api/profile");
  expect(protectedResponse.status()).toBe(401);
  await finishSignedOutDiagnostics(testInfo);
  await finishLoginDiagnostics(testInfo);
});

test("saved profile response updates mounted Navbar without navigation or focus", async ({ page }, testInfo) => {
  const finishDiagnostics = collectDiagnostics(page);
  await loginFixture(page, "alpha");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /edit profile/i }).click();
  const name = `E2E Alpha ${Date.now()}`;
  await page.getByPlaceholder("Your full name").fill(name);
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await page.getByLabel("Open user menu").click();
  await expect(page.getByRole("navigation").getByText(name, { exact: true })).toBeVisible();
  await finishDiagnostics(testInfo);
});

test("email OTP signup creates a session and authenticated Navbar without manual refresh", async ({ page, request }, testInfo) => {
  const finishDiagnostics = collectDiagnostics(page);
  const email = `e2e.otp.${Date.now()}@goto.local`;
  await resetEmail(request, email);

  await page.goto("/login");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await page.getByLabel("Full Name").fill("E2E OTP User");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(fixturePassword);

  await timeVisible(
    "otp-request-to-modal-ms",
    testInfo,
    async () => page.getByRole("button", { name: /verify email/i }).click(),
    async () => expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible(),
  );

  await prepareOtpSignup(request, email);

  const digits = fixtureOtp.split("");
  const otpInputs = page.locator(".fixed input");
  const submitStarted = Date.now();
  const verifyResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/email-otp/verify") && response.request().method() === "POST",
  );
  for (let i = 0; i < digits.length; i++) {
    await otpInputs.nth(i).fill(digits[i]);
  }
  const verifyResponse = await verifyResponsePromise;
  const responseAt = Date.now();
  expect(verifyResponse.ok()).toBeTruthy();
  testInfo.annotations.push({ type: "otp-submit-to-response-ms", description: String(responseAt - submitStarted) });

  const navigationStarted = Date.now();
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
  const navigatedAt = Date.now();
  testInfo.annotations.push({ type: "otp-response-to-navigation-ms", description: String(navigatedAt - navigationStarted) });

  const navbarStarted = Date.now();
  await waitForAuthenticatedNavbar(page);
  const navbarMs = Date.now() - navbarStarted;
  testInfo.annotations.push({ type: "navigation-to-navbar-ms", description: String(navbarMs) });
  testInfo.annotations.push({ type: "otp-total-visible-ms", description: String(Date.now() - submitStarted) });
  await expect(page.getByRole("navigation").getByRole("link", { name: "Sign In" })).toHaveCount(0);
  await finishDiagnostics(testInfo);
});

test("internal OAuth session transition redirects to authenticated Navbar and syncs other tabs", async ({ context }, testInfo) => {
  const watcher = await context.newPage();
  const finishWatcherDiagnostics = collectDiagnostics(watcher);
  await watcher.goto("/");
  await expect(watcher.getByRole("navigation").getByRole("link", { name: "Sign In" })).toBeVisible();

  const oauthPage = await context.newPage();
  const finishOauthDiagnostics = collectDiagnostics(oauthPage);
  await oauthPage.setExtraHTTPHeaders({ "x-e2e-key": e2eKey });
  const started = Date.now();
  await oauthPage.goto("/api/test/e2e?oauthFixture=alpha", { waitUntil: "domcontentloaded" });
  await waitForAuthenticatedNavbar(oauthPage);
  const oauthVisibleMs = Date.now() - started;
  testInfo.annotations.push({ type: "oauth-internal-visible-ms", description: String(oauthVisibleMs) });
  await expect(watcher.getByLabel("Open user menu")).toBeVisible({ timeout: 1000 });
  await finishWatcherDiagnostics(testInfo);
  await finishOauthDiagnostics(testInfo);
});
