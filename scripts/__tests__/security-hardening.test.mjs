import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionEnv } from "../check-production-env.mjs";
import { getDatabaseSsl } from "../../src/lib/databaseSsl.js";
import { validateStoryImages, STORY_IMAGE_MAX_BYTES } from "../../src/lib/storyMedia.js";

function strongEnv(overrides = {}) {
  return {
    DATABASE_URL: "postgresql://app_user:prod-pass@db.gotogether.internal:5432/gotogether?sslmode=verify-full",
    PGSSLMODE: "verify-full",
    NEXT_PUBLIC_BASE_URL: "https://app.gotogether.test",
    NEXT_PUBLIC_APP_URL: "https://app.gotogether.test",
    SUPER_ADMIN_EMAIL: "admin@gotogether.test",
    SESSION_SECRET: "session_secret_32_chars_minimum_value",
    CRON_SECRET: "cron_secret_32_chars_minimum_value__",
    PAYMENTS_MASTER_KEY: "payments_master_key_32_chars_value",
    PAYMENT_MODE: "ORGANIZER_OWNED",
    PAYMENT_PROVIDER: "RAZORPAY",
    ENABLED_ORGANIZER_PAYMENT_PROVIDERS: "RAZORPAY",
    NEXT_PUBLIC_ENABLED_ORGANIZER_PAYMENT_PROVIDERS: "RAZORPAY",
    RAZORPAY_KEY_ID: "rzp_live_123456789abcdef",
    RAZORPAY_KEY_SECRET: "razorpay_live_secret_value_123456",
    RAZORPAY_WEBHOOK_SECRET: "razorpay_webhook_secret_value_123456",
    NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_live_123456789abcdef",
    CLOUDINARY_CLOUD_NAME: "gotogether-prod",
    CLOUDINARY_API_KEY: "cloudinary_key_123456",
    CLOUDINARY_API_SECRET: "cloudinary_secret_123456789",
    GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "google_client_secret_value",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "google_maps_browser_key_value",
    RESEND_API_KEY: "resend_live_key_value",
    RESEND_FROM_EMAIL: "GoTogether <no-reply@gotogether.test>",
    ...overrides,
  };
}

test("production env validator accepts complete non-placeholder Razorpay config", () => {
  const result = validateProductionEnv(strongEnv());
  assert.deepEqual(result.errors, []);
});

test("production env validator rejects non-canonical origins and weak secrets", () => {
  const result = validateProductionEnv(strongEnv({
    NEXT_PUBLIC_APP_URL: "https://app.gotogether.test/login",
    SESSION_SECRET: "short",
  }));
  assert(result.errors.some((error) => error.includes("canonical origin")));
  assert(result.errors.some((error) => error.includes("SESSION_SECRET")));
});

test("production env validator allows organizer-owned mode without platform provider credentials", () => {
  const result = validateProductionEnv(strongEnv({
    RAZORPAY_KEY_ID: "",
    RAZORPAY_KEY_SECRET: "",
    RAZORPAY_WEBHOOK_SECRET: "",
    NEXT_PUBLIC_RAZORPAY_KEY_ID: "",
    CASHFREE_APP_ID: "",
    CASHFREE_SECRET_KEY: "",
  }));
  assert.deepEqual(result.errors, []);
  assert(result.warnings.some((warning) => warning.includes("ORGANIZER_OWNED mode uses each organizer")));
});

test("production env validator requires platform provider credentials in platform-controlled mode", () => {
  const result = validateProductionEnv(strongEnv({
    PAYMENT_MODE: "PLATFORM_CONTROLLED",
    RAZORPAY_WEBHOOK_SECRET: "",
  }));
  assert(result.errors.some((error) => error.includes("PLATFORM_CONTROLLED mode requires platform gateway credentials")));
});
test("production env validator requires verify-full database SSL", () => {
  const result = validateProductionEnv(strongEnv({ DATABASE_URL: "postgresql://app_user:prod-pass@db.gotogether.internal:5432/gotogether?sslmode=require", PGSSLMODE: "require" }));
  assert(result.errors.some((error) => error.includes("PostgreSQL SSL must use verify-full")));
});
test("production env validator warns when unverified database SSL is explicitly enabled", () => {
  const result = validateProductionEnv(strongEnv({ ALLOW_UNVERIFIED_DATABASE_SSL: "true" }));
  assert.deepEqual(result.errors, []);
  assert(result.warnings.some((warning) => warning.includes("certificate-chain verification is skipped")));
});


test("database SSL verifies certificates by default in production", () => {
  const ssl = getDatabaseSsl(strongEnv({ NODE_ENV: "production", PGSSLCA: "-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----" }));
  assert.equal(ssl.rejectUnauthorized, true);
  assert.match(ssl.ca, /BEGIN CERTIFICATE/);
});

test("database SSL fails closed when production disables TLS verification", () => {
  assert.throws(() => getDatabaseSsl(strongEnv({ NODE_ENV: "production", PGSSLMODE: "disable" })), /cannot be disabled/);
});
test("database SSL allows unverified TLS only with explicit opt-in", () => {
  const devSsl = getDatabaseSsl({
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://postgres:postgres@db.supabase.test:5432/postgres?sslmode=verify-full",
    PGSSLMODE: "verify-full",
    ALLOW_UNVERIFIED_DATABASE_SSL: "true",
  });
  assert.deepEqual(devSsl, { rejectUnauthorized: false });

  const prodSsl = getDatabaseSsl(strongEnv({
    NODE_ENV: "production",
    ALLOW_UNVERIFIED_DATABASE_SSL: "true",
  }));
  assert.deepEqual(prodSsl, { rejectUnauthorized: false });
});

test("database SSL keeps localhost development compatible", () => {
  const ssl = getDatabaseSsl({ NODE_ENV: "development", DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/gotogether" });
  assert.equal(ssl, false);
});

test("production rejects raw story data URLs", () => {
  const result = validateStoryImages(["data:image/png;base64,aGVsbG8="], { nodeEnv: "production" });
  assert.equal(result.ok, false);
  assert.match(result.error, /uploaded before posting/);
});

test("production accepts valid Cloudinary story image URLs", () => {
  const result = validateStoryImages(["https://res.cloudinary.com/gotogether/image/upload/v1/story.jpg"], { nodeEnv: "production" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.images, ["https://res.cloudinary.com/gotogether/image/upload/v1/story.jpg"]);
});

test("development accepts small safe data URLs intentionally", () => {
  const result = validateStoryImages(["data:image/webp;base64,aGVsbG8="], { nodeEnv: "development" });
  assert.equal(result.ok, true);
});

test("story media rejects unsafe and oversized data URLs", () => {
  const unsafe = validateStoryImages(["data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="], { nodeEnv: "development" });
  assert.equal(unsafe.ok, false);

  const oversizedPayload = "a".repeat(Math.ceil((STORY_IMAGE_MAX_BYTES + 1) / 3) * 4);
  const oversized = validateStoryImages([`data:image/jpeg;base64,${oversizedPayload}`], { nodeEnv: "development" });
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /3 MB/);
});