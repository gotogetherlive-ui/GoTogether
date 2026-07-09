import fs from "node:fs";

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function configuredCa(env) {
  if (env.PGSSLCA) return env.PGSSLCA;
  if (env.PGSSLROOTCERT) return fs.readFileSync(env.PGSSLROOTCERT, "utf8");
  return undefined;
}

function sslmodeFromConnectionString(connectionString) {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    return {
      hostname: url.hostname,
      sslmode: url.searchParams.get("sslmode")?.toLowerCase() || null,
    };
  } catch {
    return null;
  }
}

function verifiedSsl(env) {
  const ca = configuredCa(env);
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

function isSupabasePoolerHost(hostname) {
  return typeof hostname === "string" && hostname.endsWith(".pooler.supabase.com");
}

export function getDatabaseSsl(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";
  const explicitMode = env.PGSSLMODE?.toLowerCase();
  const parsedUrl = sslmodeFromConnectionString(env.DATABASE_URL);
  const mode = explicitMode || parsedUrl?.sslmode || null;
  const allowUnverified = truthy(env.ALLOW_UNVERIFIED_DATABASE_SSL);

  if (mode === "disable") {
    if (isProd && !allowUnverified) {
      throw new Error("PostgreSQL SSL verification cannot be disabled in production");
    }
    return false;
  }

  if (!isProd && parsedUrl && ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)) {
    return false;
  }

  if (allowUnverified) {
    return { rejectUnauthorized: false };
  }

  // Supabase transaction/session pooler endpoints can present a certificate
  // chain that is not trusted by some serverless runtimes. Keep TLS encrypted
  // while skipping chain verification for those pooler hosts only.
  if (!configuredCa(env) && isSupabasePoolerHost(parsedUrl?.hostname)) {
    return { rejectUnauthorized: false };
  }

  if (mode === "verify-ca" || mode === "verify-full") {
    return verifiedSsl(env);
  }

  if (isProd) {
    return verifiedSsl(env);
  }

  if (mode === "require") {
    return verifiedSsl(env);
  }

  return undefined;
}