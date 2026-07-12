import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, MessageCircle, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Page3DWrapper from "@/components/Page3DWrapper";
import { getSession } from "@/lib/auth";
import { getTeamChatTrips } from "@/lib/teamChats";

export const dynamic = "force-dynamic";

export default async function TeamChatPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/team-chat");

  const trips = await getTeamChatTrips(user.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <Page3DWrapper className="flex-1 flex flex-col">
        <main className="w-full max-w-6xl mx-auto flex-1 px-4 md:px-8 pt-28 pb-20">
          <div className="mb-10 rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-8 h-8" />
              <h1 className="text-3xl md:text-4xl font-extrabold">Team Chat</h1>
            </div>
            <p className="max-w-2xl text-white/80">Open a group chat for any Find Buddy trip you created or joined.</p>
          </div>

          {trips.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-2xl font-bold">No team chats yet</h2>
              <p className="mt-2 text-slate-500">Create a buddy trip or join one to start chatting with your team.</p>
              <Link href="/buddy" className="mt-6 inline-flex rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600">Find Buddy Trips</Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/chat/${trip.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">
                  <div className="flex min-h-44">
                    <div className="relative w-36 shrink-0 bg-gradient-to-br from-orange-400 to-rose-500 sm:w-44">
                      {trip.image_url ? <Image src={trip.image_url} alt="" fill className="object-cover" sizes="176px" /> : <MessageCircle className="absolute inset-0 m-auto h-12 w-12 text-white/40" />}
                    </div>
                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 font-extrabold text-slate-900 group-hover:text-orange-600">{trip.title}</h2>
                        {Number(trip.unread_count) > 0 && <span className="shrink-0 rounded-full bg-rose-500 px-2 py-1 text-xs font-bold text-white">{trip.unread_count}</span>}
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 text-orange-500" />{trip.destination}</p>
                      {trip.start_date && <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays className="h-4 w-4" />{new Date(trip.start_date).toLocaleDateString("en-IN")}</p>}
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500"><Users className="h-4 w-4" />{trip.participant_count} team member{Number(trip.participant_count) === 1 ? "" : "s"}</p>
                      <p className="mt-3 truncate text-sm font-medium text-slate-600">{trip.last_message || "No messages yet — say hello!"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </Page3DWrapper>
      <Footer />
    </div>
  );
}