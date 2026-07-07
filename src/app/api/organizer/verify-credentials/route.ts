import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CredentialVerificationService } from "@/lib/payments/credential-verification-service";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, key_id, key_secret } = body;

    if (!provider || !key_id || !key_secret) {
      return NextResponse.json(
        { error: "Provider, API Key, and API Secret are required" },
        { status: 400 }
      );
    }

    const result = await CredentialVerificationService.verifyCredentials(
      provider,
      key_id,
      key_secret
    );

    return NextResponse.json({
      success: result.valid,
      message: result.message,
      error: result.error,
    });
  } catch (err) {
    console.error("Organizer credentials verification API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
