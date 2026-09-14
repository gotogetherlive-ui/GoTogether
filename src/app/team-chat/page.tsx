import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck2, CalendarDays, MapPin, MessageCircle, Users } from "lucide-react";
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
    <div className="gt-page-canvas min-h-screen text-slate-900 flex flex-col">
      <Navbar />
      <Page3DWrapper className="flex-1 flex flex-col">
        <main className="w-full max-w-6xl mx-auto flex-1 px-4 md:px-8 pt-28 pb-20">
          <header className="gt-hero-panel mb-8 flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-end sm:justify-between md:p-8">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Your conversations</p>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Team chat</h1>
              </div>
              <p className="mt-3 max-w-2xl text-slate-600">Coordinate with organizers and accepted travelers before, during, and after a trip.</p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              <MessageCircle className="h-4 w-4 text-orange-600" />
              {trips.length} conversation{trips.length === 1 ? "" : "s"}
            </div>
          </header>

          {trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-2xl font-bold">No team chats yet</h2>
              <p className="mt-2 text-slate-500">Create a buddy trip or join one to start chatting with your team.</p>
              <Link href="/buddy" className="gt-primary-action mt-6 inline-flex rounded-xl px-6 py-3 font-bold">Find buddy trips</Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/chat/${trip.id}`} className="gt-panel gt-card-lift group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                  <div className="flex min-h-44">
                    <div className="relative w-28 shrink-0 bg-slate-900 sm:w-44">
                      {trip.image_url ? <Image src={trip.image_url} alt="" fill className="object-cover" sizes="176px" /> : <MessageCircle className="absolute inset-0 m-auto h-12 w-12 text-white/40" />}
                    </div>
                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 font-bold text-slate-900 group-hover:text-orange-600">{trip.title}</h2>
                        <div className="flex shrink-0 items-center gap-2">
                          {trip.is_completed && <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Completed</span>}
                          {Number(trip.unread_count) > 0 && <span className="min-w-6 rounded-full bg-orange-600 px-2 py-1 text-center text-xs font-bold text-white">{trip.unread_count}</span>}
                        </div>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 text-orange-500" />{trip.destination}</p>
                      {trip.start_date && <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays className="h-4 w-4" />{new Date(trip.start_date).toLocaleDateString("en-IN")}</p>}
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500"><Users className="h-4 w-4" />{trip.participant_count} team member{Number(trip.participant_count) === 1 ? "" : "s"}</p>
                      {trip.is_completed && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CalendarCheck2 className="h-3.5 w-3.5" />{trip.is_chat_closed ? 'Chat closed - read-only' : `Chat closes ${trip.chat_closes_at ? new Date(trip.chat_closes_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' IST' : 'seven days after the trip'}`}</p>}
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
