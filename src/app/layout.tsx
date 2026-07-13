import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { getAppSettings } from "@/lib/settings";
import SessionProvider from "@/components/SessionProvider";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import TermsAcceptanceGate from "@/components/TermsAcceptanceGate";
import NetworkStatus from "@/components/NetworkStatus";

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
  const [settings, sessionUser] = await Promise.all([
    getAppSettings(),
    getSession(),
  ]);
  const isAdmin = sessionUser ? await isAdminUser(sessionUser) : false;
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
        is_admin: isAdmin,
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
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Script
          id="google-tag-library"
          nonce={nonce}
          src="https://www.googletagmanager.com/gtag/js?id=G-23RKGDFD6H"
          strategy="afterInteractive"
        />
        <Script
          id="google-tag-config"
          nonce={nonce}
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-23RKGDFD6H');
          `}
        </Script>
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd([organizationJsonLd(), websiteJsonLd()]) }}
        />
        <SessionProvider serverUser={serverUser}>
          <MaintenanceGuard maintenanceMode={maintenanceMode}>
            <div id="main-content" tabIndex={-1} className="min-h-full flex-1 outline-none">
              {children}
            </div>
          </MaintenanceGuard>
          <TermsAcceptanceGate />
          <NetworkStatus />
        </SessionProvider>
      </body>
    </html>
  );
}
