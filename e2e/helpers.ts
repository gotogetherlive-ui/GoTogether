import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

export const e2eKey = "local-reactive-ui-e2e-only";
export const fixturePassword = "LocalE2E!234";
export const fixtureOtp = "734921";

export type FixtureName = "alpha" | "beta";

function safeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0];
  }
}

export async function e2ePost(request: APIRequestContext, data: Record<string, unknown>) {
  const response = await request.post("/api/test/e2e", {
    headers: { "x-e2e-key": e2eKey, origin: "http://127.0.0.1:3100" },
    data,
  });
  if (!response.ok()) {
    throw new Error(`E2E fixture action failed (${response.status()}): ${await response.text()}`);
  }
  return response;
}

export async function setupFixtures(request: APIRequestContext) {
  await e2ePost(request, { action: "setup" });
}

export async function loginFixture(page: Page, fixture: FixtureName) {
  await e2ePost(page.request, { action: "login", fixture });
}

export async function resetEmail(request: APIRequestContext, email: string) {
  await e2ePost(request, { action: "resetEmail", email });
}

export async function prepareOtpSignup(request: APIRequestContext, email: string) {
  await e2ePost(request, { action: "setOtpForEmail", email, otp: fixtureOtp });
}

export async function waitForAuthenticatedNavbar(page: Page) {
  await expect(page.getByLabel("Open user menu")).toBeVisible();
}

export async function timeVisible(label: string, testInfo: TestInfo, action: () => Promise<void>, assertion: () => Promise<void>) {
  const started = Date.now();
  await action();
  await assertion();
  const elapsed = Date.now() - started;
  testInfo.annotations.push({ type: label, description: String(elapsed) });
  return elapsed;
}

export function collectDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const failedResponses: Array<{ url: string; status: number; method: string }> = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      failedResponses.push({
        url: safeUrl(response.url()),
        status,
        method: response.request().method(),
      });
    }
  });

  return async (testInfo: TestInfo) => {
    await testInfo.attach("runtime-diagnostics", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify({ consoleErrors, failedResponses }, null, 2)),
    });
  };
}
