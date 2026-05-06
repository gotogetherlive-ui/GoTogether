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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />

      <Page3DWrapper className="flex-1 flex flex-col">
        <section className="pt-28 pb-16 px-4 md:px-8 max-w-3xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              My Profile
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Manage your details, profession, and live location
            </p>
          </div>

          <DashboardClient />
        </section>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}
