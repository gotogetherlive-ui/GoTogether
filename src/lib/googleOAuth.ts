export function getGoogleRedirectUri(requestOrigin?: string): string {
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || requestOrigin || 'http://localhost:3000';
  return `${new URL(configuredOrigin).origin}/api/auth/google/callback`;
}

export function getGoogleRedirectOrigin(requestOrigin: string): string {
  return new URL(getGoogleRedirectUri(requestOrigin)).origin;
}