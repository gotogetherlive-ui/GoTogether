import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BuddyClient from "./BuddyClient";
import { getSession } from "@/lib/auth";
import Page3DWrapper from "@/components/Page3DWrapper";
import { hasCompleteProfile } from "@/lib/profile";

export default async function BuddyPage() {
  const user = await getSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />
      <Page3DWrapper className="flex-1 flex flex-col">
        <BuddyClient isAuthenticated={!!user} hasCompletedProfile={hasCompleteProfile(user)} />
      </Page3DWrapper>
      <Footer />
    </div>
  );
}
