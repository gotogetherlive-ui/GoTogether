import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BuddyClient from "./BuddyClient";
import { getSession } from "@/lib/auth";
import Page3DWrapper from "@/components/Page3DWrapper";
import { hasCompleteProfile } from "@/lib/profile";
import { buildMetadata } from '@/lib/seo';
import { loadBuddyFeed } from '@/lib/buddyFeed';

export const metadata = buildMetadata({
  title: 'Find a Travel Buddy in India | GoTogether',
  description: 'Find compatible travel companions by destination, dates, budget, and travel preferences on GoTogether.',
  path: '/buddy',
});

export default async function BuddyPage() {
  const user = await getSession();
  const initialData = await loadBuddyFeed(user);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar />
      <Page3DWrapper className="flex-1 flex flex-col">
        <BuddyClient
          isAuthenticated={!!user}
          hasCompletedProfile={hasCompleteProfile(user)}
          initialData={initialData}
        />
      </Page3DWrapper>
      <Footer />
    </div>
  );
}
