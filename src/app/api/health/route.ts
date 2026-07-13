import { NextResponse } from "next/server";
import { ensureSchema, getPoolInstance } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await ensureSchema();
    const pool = getPoolInstance();
    await pool.query("SELECT 1");

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        responseTimeMs: Date.now() - startedAt,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        database: "unreachable",
        responseTimeMs: Date.now() - startedAt,
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
