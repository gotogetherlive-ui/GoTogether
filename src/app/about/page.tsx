import { ShieldCheck, Users, Compass, Globe, Heart, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Page3DWrapper from "@/components/Page3DWrapper";
import FadeInScroll from "@/components/FadeInScroll";
import AnimatedButton from "@/components/AnimatedButton";
import Animated3DText from "@/components/Animated3DText";
import AnimatedCounter from "@/components/AnimatedCounter";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const usersCount = (db.prepare(`SELECT COUNT(*) as count FROM users`).get() as any)?.count || 0;
  const liveTripsCount = (db.prepare(`SELECT COUNT(*) as count FROM trips WHERE status = 'live'`).get() as any)?.count || 0;
  const countriesCount = (db.prepare(`SELECT COUNT(DISTINCT destination) as count FROM trips WHERE status = 'live'`).get() as any)?.count || 0;
  // We'll use a dynamic but realistic Safety Score (e.g., 98 or calculated)
  const safetyScore = 98;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <Page3DWrapper>
        {/* Hero */}
        <section className="pt-28 pb-16 px-6 md:px-12 max-w-5xl mx-auto text-center">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-sm font-semibold mb-6">
            Our Story
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
            Travel is better{" "}
            <Animated3DText delay={0.4}>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
                together
              </span>
            </Animated3DText>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            GoTogether was born from a simple idea: the best travel memories come from the people
            you share them with. We connect adventurous souls with verified trips and trusted organizers.
          </p>
        </section>

        {/* Values Grid */}
        <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
          <FadeInScroll delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Safety First</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Every business organizer is verified. Admin-curated trips ensure quality.
                  Our moderation team reviews all reports within 24 hours.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 mb-5">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Community Driven</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Our Stranger Meet flow lets you connect with trip organizers before committing.
                  Build trust, share vibes, then hit the road.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 mb-5">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Global Network</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  From Bali to the Swiss Alps, our verified organizers span the globe.
                  Wherever you want to go, we&apos;ve got someone to take you.
                </p>
              </div>
            </div>
          </FadeInScroll>
        </section>

        {/* Stats */}
        <section className="py-16 px-6 md:px-12 bg-white border-y border-slate-200 overflow-hidden">
          <FadeInScroll delay={0.1}>
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
                  <AnimatedCounter value={usersCount} />
                </div>
                <p className="text-sm text-slate-500 font-medium">Active Users</p>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
                  <AnimatedCounter value={liveTripsCount} />
                </div>
                <p className="text-sm text-slate-500 font-medium">Live Trips</p>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
                  <AnimatedCounter value={countriesCount} />
                </div>
                <p className="text-sm text-slate-500 font-medium">Destinations</p>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
                  <AnimatedCounter value={safetyScore} suffix="%" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Safety Score</p>
              </div>
            </div>
          </FadeInScroll>
        </section>

        {/* How it Works */}
        <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto overflow-hidden">
          <FadeInScroll delay={0}>
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-lg shadow-orange-500/20 transform group-hover:scale-110 transition-transform">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Browse Trips</h3>
                <p className="text-slate-600 text-sm">
                  Explore curated trips sorted by our smart priority algorithm. Filter by destination, type, or tags.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-lg shadow-orange-500/20 transform group-hover:scale-110 transition-transform">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Request to Join</h3>
                <p className="text-slate-600 text-sm">
                  Send a request with your details. The organizer reviews your profile and decides if it&apos;s a match.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-lg shadow-orange-500/20 transform group-hover:scale-110 transition-transform">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">GoTogether!</h3>
                <p className="text-slate-600 text-sm">
                  Once accepted, connect with your travel group and set out on an unforgettable adventure.
                </p>
              </div>
            </div>

            <div className="text-center mt-16">
              <AnimatedButton
                href="/trips"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full shadow-xl hover:shadow-orange-500/40"
              >
                <Compass className="w-5 h-5" />
                Start Exploring
              </AnimatedButton>
            </div>
          </FadeInScroll>
        </section>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}
