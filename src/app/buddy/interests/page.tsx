import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BuddyClient from '../BuddyClient';
import { getSession } from '@/lib/auth';
import { hasCompleteProfile } from '@/lib/profile';
import { loadBuddyFeed } from '@/lib/buddyFeed';

export const metadata = { title: 'My Buddy Interests | GoTogether', robots: { index: false, follow: false } };

export default async function BuddyInterestsPage() {
  const user = await getSession();
  if (!user) redirect('/login?next=/buddy/interests');
  const initialData = await loadBuddyFeed(user, 'interests');
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900"><Navbar /><BuddyClient mode="interests" isAuthenticated hasCompletedProfile={hasCompleteProfile(user)} initialData={initialData} /><Footer /></div>;
}
