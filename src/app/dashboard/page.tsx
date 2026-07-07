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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-orange-500/30 selection:text-orange-900 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-orange-50/80 to-transparent pointer-events-none"></div>
      <Navbar />

      <Page3DWrapper className="flex-1 flex flex-col relative z-10">
        <section className="pt-28 pb-16 px-4 md:px-8 max-w-3xl mx-auto w-full">
          <div className="mb-8 glass p-6 md:p-8 rounded-[2rem] relative overflow-hidden border border-slate-200/60 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight relative z-10">
              My Profile
            </h1>
            <p className="text-slate-500 mt-2 text-base relative z-10">
              Manage your personal details, professional identity, and live location
            </p>
          </div>

          <DashboardClient />
        </section>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}
