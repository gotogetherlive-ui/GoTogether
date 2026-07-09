#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseDatabaseConnectionString } from 'pg-connection-string';

const required = [
  'DATABASE_URL',
  'NEXT_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'SUPER_ADMIN_EMAIL',
  'SESSION_SECRET',
  'CRON_SECRET',
  'PAYMENTS_MASTER_KEY',
  'PAYMENT_MODE',
  'ENABLED_ORGANIZER_PAYMENT_PROVIDERS',
  'NEXT_PUBLIC_ENABLED_ORGANIZER_PAYMENT_PROVIDERS',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
];

const placeholders = [
  'your_',
  'change_me',
  'changeme',
  'example.com',
  'localhost',
  '127.0.0.1',
  '::1',
  'mock',
  'fake',
  'dummy',
  'rzp_test_your_key_id',
  'your_razorpay_key_secret',
  'your_razorpay_webhook_secret',
  'your_app_id',
  'your_mid',
  'your_key',
];

const allowedPaymentModes = new Set(['PLATFORM', 'PLATFORM_CONTROLLED', 'ORGANIZER_OWNED', 'MARKETPLACE']);
const allowedProviders = new Set(['RAZORPAY', 'CASHFREE']);
const truthy = new Set(['1', 'true', 'yes', 'on']);

const providerEnv = {
  RAZORPAY: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'NEXT_PUBLIC_RAZORPAY_KEY_ID'],
  CASHFREE: ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY'],
};

function value(env, name) {
  return String(env[name] || '').trim();
}

function isTruthy(env, name) {
  return truthy.has(value(env, name).toLowerCase());
}

function paymentMode(env) {
  const mode = value(env, 'PAYMENT_MODE').toUpperCase();
  return mode === 'PLATFORM' ? 'PLATFORM_CONTROLLED' : mode;
}

function hasPlaceholder(raw) {
  const lower = raw.toLowerCase();
  return placeholders.some((placeholder) => lower.includes(placeholder));
}

function parseProviderList(env, envName) {
  return value(env, envName).split(',').map((provider) => provider.trim().toUpperCase()).filter(Boolean);
}

function validateHttpsPublicOrigin(env, envName, errors) {
  const raw = value(env, envName);
  if (!raw) return;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') errors.push(`${envName} must be an https:// public origin in production`);
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')) {
      errors.push(`${envName} must not point to localhost or a private development origin in production`);
    }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      errors.push(`${envName} must be a canonical origin only, for example https://gotogether.example.com`);
    }
    if (raw !== url.origin) {
      errors.push(`${envName} must not include trailing slashes, paths, query strings, or fragments`);
    }
  } catch {
    errors.push(`${envName} must be a valid https:// public origin in production`);
  }
}

export function loadProductionEnvFiles(env = process.env, cwd = process.cwd()) {
  for (const file of ['.env.staging.local', '.env.production.local', '.env.production', '.env.local']) {
    const fullPath = path.resolve(cwd, file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let parsedValue = trimmed.slice(eq + 1).trim();
      if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) || (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
        parsedValue = parsedValue.slice(1, -1);
      }
      if (!env[key]) env[key] = parsedValue;
    }
    break;
  }
}

export function validateProductionEnv(env = process.env) {
  const errors = [];
  const warnings = [];

  for (const name of required) {
    const raw = value(env, name);
    if (!raw) errors.push(`${name} is required`);
    else if (hasPlaceholder(raw)) errors.push(`${name} still looks like a placeholder`);
  }

  validateHttpsPublicOrigin(env, 'NEXT_PUBLIC_BASE_URL', errors);
  validateHttpsPublicOrigin(env, 'NEXT_PUBLIC_APP_URL', errors);

  if (value(env, 'NEXT_PUBLIC_BASE_URL') !== value(env, 'NEXT_PUBLIC_APP_URL')) {
    warnings.push('NEXT_PUBLIC_BASE_URL and NEXT_PUBLIC_APP_URL differ; OAuth and payment callbacks should usually use the same public origin');
  }

  if (!allowedPaymentModes.has(value(env, 'PAYMENT_MODE').toUpperCase())) {
    errors.push('PAYMENT_MODE must be PLATFORM, PLATFORM_CONTROLLED, ORGANIZER_OWNED, or MARKETPLACE');
  }

  const selectedProvider = value(env, 'PAYMENT_PROVIDER').toUpperCase();
  if (selectedProvider && !allowedProviders.has(selectedProvider)) {
    errors.push('PAYMENT_PROVIDER must be one of RAZORPAY or CASHFREE when set');
  }
  if (selectedProvider === 'MOCK' || selectedProvider === 'SIMULATED' || selectedProvider === 'TEST') {
    errors.push('PAYMENT_PROVIDER must not be a mock or simulated provider in production');
  }
  if (paymentMode(env) === 'PLATFORM_CONTROLLED' && !selectedProvider) {
    errors.push('PAYMENT_PROVIDER is required for PLATFORM_CONTROLLED mode');
  }

  for (const envName of ['ENABLED_ORGANIZER_PAYMENT_PROVIDERS', 'NEXT_PUBLIC_ENABLED_ORGANIZER_PAYMENT_PROVIDERS']) {
    const providers = parseProviderList(env, envName);
    if (!providers.length) errors.push(`${envName} must contain at least one provider`);
    for (const provider of providers) {
      if (!allowedProviders.has(provider)) errors.push(`${envName} contains unsupported provider ${provider}`);
      if (provider === 'MOCK' || provider === 'SIMULATED' || provider === 'TEST') {
        errors.push(`${envName} must not contain mock or simulated providers in production`);
      }
    }
  }

  if (value(env, 'ENABLED_ORGANIZER_PAYMENT_PROVIDERS') !== value(env, 'NEXT_PUBLIC_ENABLED_ORGANIZER_PAYMENT_PROVIDERS')) {
    errors.push('ENABLED_ORGANIZER_PAYMENT_PROVIDERS and NEXT_PUBLIC_ENABLED_ORGANIZER_PAYMENT_PROVIDERS must match');
  }

  if (value(env, 'PAYMENTS_MASTER_KEY').length < 32) {
    errors.push('PAYMENTS_MASTER_KEY must be at least 32 characters');
  }

  if (value(env, 'SESSION_SECRET').length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters');
  }

  if (value(env, 'CRON_SECRET').length < 32) {
    errors.push('CRON_SECRET must be at least 32 characters');
  }

  const dbUrl = value(env, 'DATABASE_URL');
  const pgSslMode = value(env, 'PGSSLMODE').toLowerCase();
  let dbSslMode = '';
  try {
    dbSslMode = dbUrl ? parseDatabaseConnectionString(dbUrl).sslmode?.toLowerCase() || new URL(dbUrl).searchParams.get('sslmode')?.toLowerCase() || '' : '';
  } catch {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URL. If the password contains special characters such as @, #, %, /, ?, :, or spaces, URL-encode the password.');
  }
  const effectiveSslMode = pgSslMode || dbSslMode;
  const hasTrustedDatabaseCa = Boolean(value(env, 'PGSSLCA') || value(env, 'PGSSLROOTCERT'));
  if (!effectiveSslMode) {
    errors.push('PostgreSQL SSL mode must be explicit in production; set PGSSLMODE=verify-full or add ?sslmode=verify-full to DATABASE_URL');
  }
  if (effectiveSslMode === 'disable') {
    if (!isTruthy(env, 'ALLOW_UNVERIFIED_DATABASE_SSL')) {
      errors.push('PostgreSQL SSL must not be disabled in production without ALLOW_UNVERIFIED_DATABASE_SSL=true');
    } else {
      warnings.push('ALLOW_UNVERIFIED_DATABASE_SSL is enabled; use only for an explicitly approved temporary exception.');
    }
  }
  if (['prefer', 'allow', 'require', 'verify-ca'].includes(effectiveSslMode)) {
    errors.push('PostgreSQL SSL must use verify-full in production; set PGSSLMODE=verify-full or add ?sslmode=verify-full to DATABASE_URL');
  }
  if (isTruthy(env, 'ALLOW_UNVERIFIED_DATABASE_SSL')) {
    warnings.push('ALLOW_UNVERIFIED_DATABASE_SSL is enabled; PostgreSQL traffic stays encrypted but certificate-chain verification is skipped. Prefer PGSSLROOTCERT or PGSSLCA when your database provider supplies a trusted CA.');
  } else if (effectiveSslMode === 'verify-full' && !hasTrustedDatabaseCa) {
    warnings.push('If the database presents a private or self-signed certificate chain, configure PGSSLROOTCERT or PGSSLCA with the trusted CA before deployment, or explicitly set ALLOW_UNVERIFIED_DATABASE_SSL=true for managed free-tier compatibility.');
  }
  if (isTruthy(env, 'ALLOW_PAYMENT_SIMULATION') && !isTruthy(env, 'ALLOW_UNSAFE_PRODUCTION_PAYMENT_SIMULATION')) {
    errors.push('ALLOW_PAYMENT_SIMULATION=true is unsafe in production without ALLOW_UNSAFE_PRODUCTION_PAYMENT_SIMULATION=true');
  }
  if (isTruthy(env, 'ALLOW_UNSAFE_PRODUCTION_PAYMENT_SIMULATION')) {
    warnings.push('ALLOW_UNSAFE_PRODUCTION_PAYMENT_SIMULATION is enabled; production payments may use deliberate simulation paths. Do not use for real traffic.');
  }

  if (isTruthy(env, 'ALLOW_RUNTIME_SCHEMA_DDL')) {
    errors.push('ALLOW_RUNTIME_SCHEMA_DDL must not be enabled in production runtime. Apply database migrations through the controlled release job.');
  }

  const enabledProviders = parseProviderList(env, 'ENABLED_ORGANIZER_PAYMENT_PROVIDERS');
  if (selectedProvider && enabledProviders.length && !enabledProviders.includes(selectedProvider)) {
    errors.push('PAYMENT_PROVIDER must be included in ENABLED_ORGANIZER_PAYMENT_PROVIDERS');
  }

  const requiresPlatformProviderCredentials = paymentMode(env) === 'PLATFORM_CONTROLLED';
  for (const provider of enabledProviders) {
    const missing = (providerEnv[provider] || []).filter((name) => !value(env, name));
    if (requiresPlatformProviderCredentials && missing.length) {
      errors.push(`${provider} gateway env vars are missing (${missing.join(', ')}). PLATFORM_CONTROLLED mode requires platform gateway credentials for API and signature verification.`);
    }
    for (const name of providerEnv[provider] || []) {
      const raw = value(env, name);
      if (raw && hasPlaceholder(raw)) errors.push(`${name} still looks like a placeholder`);
    }
  }

  if (paymentMode(env) === 'ORGANIZER_OWNED') {
    warnings.push('ORGANIZER_OWNED mode uses each organizer\'s verified encrypted provider account credentials; platform Razorpay/Cashfree env vars are optional unless used as fallback credentials.');
  }

  return { errors, warnings };
}

function runCli() {
  loadProductionEnvFiles(process.env, process.cwd());
  const { errors, warnings } = validateProductionEnv(process.env);

  if (warnings.length) {
    console.warn('Production environment warnings:');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (errors.length) {
    console.error('Production environment check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('Production environment check passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}