import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getAppSettings } from "@/lib/settings";
import SessionProvider from "@/components/SessionProvider";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import TermsAcceptanceGate from "@/components/TermsAcceptanceGate";

import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { buildMetadata, organizationJsonLd, websiteJsonLd, safeJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  // Server-side: fetch settings (uses fast 60s cache, not dynamic)
  const settings = await getAppSettings();
  const sessionUser = await getSession();
  const serverUser = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.full_name,
        role: sessionUser.role,
        avatar_url: sessionUser.avatar_url,
        google_id: sessionUser.google_id,
        is_verified: sessionUser.is_verified,
        age: sessionUser.age,
        gender: sessionUser.gender,
        profession: sessionUser.profession,
        fooding_habit: sessionUser.fooding_habit,
        phone_number: sessionUser.phone_number,
        phone_verified: sessionUser.phone_verified,
        created_at: sessionUser.created_at,
        last_login_at: sessionUser.last_login_at,
        terms_accepted_at: sessionUser.terms_accepted_at,
        is_admin: await isAdminUser(sessionUser),
      }
    : null;

  const maintenanceMode = !!settings?.maintenance_mode;

  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd([organizationJsonLd(), websiteJsonLd()]) }}
        />
        <SessionProvider serverUser={serverUser}>
          <MaintenanceGuard maintenanceMode={maintenanceMode}>
            {children}
          </MaintenanceGuard>
          <TermsAcceptanceGate />
        </SessionProvider>
      </body>
    </html>
  );
}
