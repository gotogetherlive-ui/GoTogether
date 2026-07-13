import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BuddyClient from "./BuddyClient";
import { getSession } from "@/lib/auth";
import Page3DWrapper from "@/components/Page3DWrapper";
import { hasCompleteProfile } from "@/lib/profile";
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Find a Travel Buddy in India | GoTogether',
  description: 'Find compatible travel companions by destination, dates, budget, and travel preferences on GoTogether.',
  path: '/buddy',
});

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
