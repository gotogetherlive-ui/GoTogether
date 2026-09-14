import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardClient from "./DashboardClient";
import Page3DWrapper from "@/components/Page3DWrapper";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="gt-page-canvas relative flex min-h-screen flex-col font-sans text-slate-900 selection:bg-orange-500/30 selection:text-orange-900">
      <Navbar />

      <Page3DWrapper className="flex-1 flex flex-col relative z-10">
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 pt-28 md:px-8">
          <header className="gt-hero-panel mb-8 rounded-2xl border p-6 md:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Account</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              My profile
            </h1>
            <p className="mt-2 max-w-2xl text-base text-slate-600">
              Keep your traveler identity and contact details accurate.
            </p>
          </header>

          <DashboardClient />
        </section>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}
