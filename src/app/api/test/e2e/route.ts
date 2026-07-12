import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createSession, hashPassword } from "@/lib/auth";
import { ensureSchema, queryOne, run } from "@/lib/db";

const fixtures = {
  alpha: { email: "e2e.alpha@goto.local", name: "E2E Alpha" },
  beta: { email: "e2e.beta@goto.local", name: "E2E Beta" },
} as const;

function enabled(request: Request) {
  return process.env.NODE_ENV !== "production" &&
    process.env.E2E_TEST_MODE === "true" &&
    request.headers.get("x-e2e-key") === process.env.E2E_TEST_KEY;
}

function fixtureKey(value: unknown): keyof typeof fixtures | null {
  return typeof value === "string" && value in fixtures ? value as keyof typeof fixtures : null;
}

async function upsertFixtureUser(email: string, name: string, passwordHash: string) {
  await run(
    `INSERT INTO users
      (id, email, password_hash, full_name, role, age, gender, profession, fooding_habit,
       phone_number, phone_verified, is_verified, terms_accepted_at)
     VALUES ($1, $2, $3, $4, 'regular', 29, 'Other', 'Tester', 'Vegetarian',
             '+91 9000000000', 1, 1, NOW())
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = 'regular',
       age = EXCLUDED.age,
       gender = EXCLUDED.gender,
       profession = EXCLUDED.profession,
       fooding_habit = EXCLUDED.fooding_habit,
       phone_number = EXCLUDED.phone_number,
       phone_verified = 1,
       is_verified = 1,
       terms_accepted_at = NOW(),
       deleted_at = NULL`,
    [uuidv4(), email, passwordHash, name],
  );
}

async function loginEmail(email: string) {
  const user = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);
  if (!user) return NextResponse.json({ error: "Fixture missing" }, { status: 409 });
  await createSession(user.id);
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  if (!enabled(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await ensureSchema();
  const url = new URL(request.url);
  const fixtureName = fixtureKey(url.searchParams.get("oauthFixture"));
  if (!fixtureName) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const fixture = fixtures[fixtureName];
  const user = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL", [fixture.email]);
  if (!user) return NextResponse.redirect("http://127.0.0.1:3100/login?error=fixture_missing");
  const token = await createSession(user.id);
  const response = NextResponse.redirect("http://127.0.0.1:3100/");
  response.cookies.set("gt_session", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    priority: "high",
  });
  return response;
}

export async function POST(request: Request) {
  if (!enabled(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await ensureSchema();
  const body = await request.json();

  if (body.action === "setup") {
    const passwordHash = await hashPassword("LocalE2E!234");
    for (const fixture of Object.values(fixtures)) {
      await upsertFixtureUser(fixture.email, fixture.name, passwordHash);
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "login") {
    const key = fixtureKey(body.fixture);
    if (!key) return NextResponse.json({ error: "Invalid fixture" }, { status: 400 });
    return loginEmail(fixtures[key].email);
  }

  if (body.action === "resetEmail" && typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!email.endsWith("@goto.local")) return NextResponse.json({ error: "Invalid fixture email" }, { status: 400 });
    await run("DELETE FROM email_otps WHERE email = $1", [email]);
    await run("UPDATE users SET deleted_at = NOW() WHERE email = $1", [email]);
    return NextResponse.json({ success: true });
  }

  if (body.action === "setOtpForEmail" && typeof body.email === "string" && typeof body.otp === "string") {
    const email = body.email.trim().toLowerCase();
    if (!email.endsWith("@goto.local") || !/^\d{6}$/.test(body.otp)) {
      return NextResponse.json({ error: "Invalid OTP fixture" }, { status: 400 });
    }
    const otpHash = await hashPassword(body.otp);
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [email],
    );
    if (existing) {
      await run("UPDATE email_otps SET otp_hash = $1, attempts = 0, expires_at = NOW() + INTERVAL '10 minutes' WHERE id = $2", [otpHash, existing.id]);
    } else {
      const passwordHash = await hashPassword("LocalE2E!234");
      await run(
        "INSERT INTO email_otps (id, email, full_name, password_hash, otp_hash, expires_at) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes')",
        [uuidv4(), email, "E2E OTP", passwordHash, otpHash],
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
