import ChatMessageToasts from "@/components/ChatMessageToasts";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { getAppSettings } from "@/lib/settings";
import SessionProvider from "@/components/SessionProvider";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import TermsAcceptanceGate from "@/components/TermsAcceptanceGate";
import NetworkStatus from "@/components/NetworkStatus";
import GoogleAnalytics from "@/components/GoogleAnalytics";

import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { buildMetadata } from '@/lib/seo';
import { DEFAULT_GA_MEASUREMENT_ID, normalizeGoogleAnalyticsId } from '@/lib/analytics';

export const metadata: Metadata = buildMetadata();
export const viewport: Viewport = { themeColor: "#ea580c" };

const GA_MEASUREMENT_ID = normalizeGoogleAnalyticsId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
  || DEFAULT_GA_MEASUREMENT_ID;

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
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <script
          id="google-tag-config"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            window.gtag = gtag;
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false,
              allow_google_signals: false,
              allow_ad_personalization_signals: false,
              cookie_flags: 'SameSite=None;Secure'
            });
          `,
          }}
        />
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
        </Suspense>
        <SessionProvider serverUser={serverUser}>
          <MaintenanceGuard maintenanceMode={maintenanceMode}>
            <div id="main-content" tabIndex={-1} className="min-h-full flex-1 outline-none">
              {children}
              <ChatMessageToasts />
            </div>
          </MaintenanceGuard>
          <TermsAcceptanceGate />
          <NetworkStatus />
        </SessionProvider>
      </body>
    </html>
  );
}
