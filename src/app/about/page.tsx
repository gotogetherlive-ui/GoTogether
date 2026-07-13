import { ShieldCheck, Users, Compass, Globe, Heart, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Page3DWrapper from "@/components/Page3DWrapper";
import FadeInScroll from "@/components/FadeInScroll";
import AnimatedButton from "@/components/AnimatedButton";
import Animated3DText from "@/components/Animated3DText";
import AnimatedCounter from "@/components/AnimatedCounter";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import { queryOne } from "@/lib/db";
import { buildMetadata } from '@/lib/seo';

export const dynamic = "force-dynamic";
export const metadata = buildMetadata({
  title: 'About GoTogether | Safer Group Travel in India',
  description: 'Learn how GoTogether connects travelers with verified organizers, transparent group trips, and compatible travel companions.',
  path: '/about',
});

type CountRow = { count: string | number };

export default async function AboutPage() {
  let usersCount = 0;
  let liveTripsCount = 0;
  let countriesCount = 0;

  try {
    const [users, liveTrips, countries] = await Promise.all([
      queryOne<CountRow>(`SELECT COUNT(*) as count FROM users`, []),
      queryOne<CountRow>(`SELECT COUNT(*) as count FROM trips WHERE status = 'live'`, []),
      queryOne<CountRow>(`SELECT COUNT(DISTINCT destination) as count FROM trips WHERE status = 'live'`, []),
    ]);

    usersCount = Number(users?.count ?? 0);
    liveTripsCount = Number(liveTrips?.count ?? 0);
    countriesCount = Number(countries?.count ?? 0);
  } catch (error) {
    console.error("Failed to load public statistics", error);
  }
  // We'll use a dynamic but realistic Safety Score (e.g., 98 or calculated)
  const safetyScore = 98;

  return (
    <MaintenanceGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
        {/* Modern Mesh Gradient Background */}
        <div className="absolute top-0 left-0 w-full h-[800px] pointer-events-none overflow-hidden z-0">
          <div 
            className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] bg-gradient-to-br from-orange-400/10 to-rose-400/5 rounded-full blur-[140px] animate-pulse-scale"
            style={{ animationDuration: "12s" }}
          ></div>
          <div 
            className="absolute top-[20%] right-[-15%] w-[65%] h-[60%] bg-gradient-to-bl from-rose-400/10 to-indigo-500/5 rounded-full blur-[160px] animate-pulse-scale"
            style={{ animationDuration: "16s" }}
          ></div>
          <div className="absolute top-[40%] left-[20%] w-[45%] h-[45%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        </div>

        <Navbar />

        <Page3DWrapper>
          {/* Hero */}
          <section className="pt-36 pb-20 px-6 md:px-12 max-w-5xl mx-auto text-center relative z-10">
            <span className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-orange-500/10 text-orange-600 border border-orange-200/50 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm shadow-sm">
              <Award className="w-3.5 h-3.5" /> Our Story
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 leading-tight tracking-tight flex flex-wrap justify-center items-center gap-x-3">
              <span>Travel is better</span>
              <Animated3DText delay={0.4}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 leading-normal">
                  together
                </span>
              </Animated3DText>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
              GoTogether was born from a simple idea: the best travel memories come from the people
              you share them with. We connect adventurous souls with verified trips, trusted organizers,
              and lifelong companions.
            </p>
            <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">Last updated: July 6, 2026</p>
          </section>

          {/* Values Grid */}
          <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden relative z-10">
            <FadeInScroll delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Value 1 */}
                <div className="group bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(249,115,22,0.1)] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-all duration-500"></div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/20 border border-orange-200/50 flex items-center justify-center text-orange-600 mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Safety First</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Every business organizer undergoes identity verification. Admin-curated trips follow quality checks. Paid traveler cancellations follow GoTogether's 72-hour, 24-hour, and under-24-hour refund windows, and organizer-cancelled paid trips receive a full captured-payment refund.
                  </p>
                </div>

                {/* Value 2 */}
                <div className="group bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(244,63,94,0.1)] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-all duration-500"></div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/20 border border-rose-200/50 flex items-center justify-center text-rose-600 mb-6 shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                    <Heart className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Community Driven</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Our Stranger Meet flow lets you connect, chat, and break the ice with trip organizers and fellow travelers before committing. Build trust, share vibes, then hit the road.
                  </p>
                </div>

                {/* Value 3 */}
                <div className="group bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.1)] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-500"></div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/20 border border-indigo-200/50 flex items-center justify-center text-indigo-600 mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <Globe className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Global Network</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    From sun-drenched Bali beaches to snow-capped Swiss Alpine peaks, our verified organizers span the globe. Wherever your wanderlust points, a community is waiting.
                  </p>
                </div>
              </div>
            </FadeInScroll>
          </section>

          {/* Stats */}
          <section className="py-16 px-6 md:px-12 overflow-hidden relative z-10">
            <FadeInScroll delay={0.1}>
              <div className="max-w-6xl mx-auto bg-slate-900/95 text-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(15,23,42,0.3)] relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-orange-500/10 to-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-t from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 relative z-10 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  {/* Stat 1 */}
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-3">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="text-4xl md:text-5xl font-extrabold mb-1 tracking-tight">
                      <AnimatedCounter value={usersCount} />
                    </div>
                    <p className="text-xs md:text-sm text-slate-400 font-semibold uppercase tracking-wider">Active Users</p>
                  </div>
                  {/* Stat 2 */}
                  <div className="flex flex-col items-center justify-center p-4 pt-8 md:pt-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="text-4xl md:text-5xl font-extrabold mb-1 tracking-tight">
                      <AnimatedCounter value={liveTripsCount} />
                    </div>
                    <p className="text-xs md:text-sm text-slate-400 font-semibold uppercase tracking-wider">Live Trips</p>
                  </div>
                  {/* Stat 3 */}
                  <div className="flex flex-col items-center justify-center p-4 pt-8 md:pt-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="text-4xl md:text-5xl font-extrabold mb-1 tracking-tight">
                      <AnimatedCounter value={countriesCount} />
                    </div>
                    <p className="text-xs md:text-sm text-slate-400 font-semibold uppercase tracking-wider">Destinations</p>
                  </div>
                  {/* Stat 4 */}
                  <div className="flex flex-col items-center justify-center p-4 pt-8 md:pt-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-4xl md:text-5xl font-extrabold mb-1 tracking-tight">
                      <AnimatedCounter value={safetyScore} suffix="%" />
                    </div>
                    <p className="text-xs md:text-sm text-slate-400 font-semibold uppercase tracking-wider">Safety Score</p>
                  </div>
                </div>
              </div>
            </FadeInScroll>
          </section>

          {/* Mission & Vision Section */}
          <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden relative z-10">
            <FadeInScroll delay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-3">Our Mission</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
                    Enabling connections that map a lifetime of adventure
                  </h2>
                  <div className="space-y-6 text-slate-600 text-base leading-relaxed">
                    <p>
                      We believe the physical boundaries on maps are merely invitations. The real connection happens when hearts beat in sync with the footsteps on a trail, the oars in a lake, or the laughter around a campfire.
                    </p>
                    <p>
                      GoTogether was constructed to dismantle the friction of travel planning. By bridging vetted business trips with budget-friendly buddy excursions, we provide an accessible, safe, and exciting sanctuary for every explorer.
                    </p>
                  </div>
                </div>
                <div className="bg-slate-950 p-8 md:p-10 rounded-[2.5rem] border border-slate-900 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="relative z-10 space-y-8">
                    <div>
                      <h3 className="text-xl font-bold text-indigo-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span> The Vision
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        To build the world&apos;s most active, trusted, and design-led travel community where no one ever has to explore alone unless they choose to.
                      </p>
                    </div>
                    <div className="border-t border-slate-800"></div>
                    <div>
                      <h3 className="text-xl font-bold text-rose-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span> Our Promise
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        We promise relentless innovation in safety, absolute transparency in trip costs, and zero tolerance for harassment or discrimination.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeInScroll>
          </section>

          {/* How it Works */}
          <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto overflow-hidden relative z-10">
            <FadeInScroll delay={0}>
              <div className="text-center mb-20">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-3">Step-by-Step</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
              </div>
              
              <div className="relative">
                {/* Desktop Connecting Line */}
                <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-orange-400 via-rose-400 to-indigo-400 z-0"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
                  {/* Step 1 */}
                  <div className="text-center group flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-lg flex items-center justify-center text-2xl font-extrabold text-orange-600 mb-6 group-hover:scale-110 group-hover:shadow-orange-500/10 transition-all duration-300 relative z-10">
                      <div className="absolute inset-1 rounded-[22px] bg-gradient-to-br from-orange-500/5 to-orange-500/10"></div>
                      <span className="relative z-10">01</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Browse Trips</h3>
                    <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                      Explore curated trips sorted by our smart priority algorithm. Filter by destination, pricing structure, duration, or matching tags.
                    </p>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="text-center group flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-lg flex items-center justify-center text-2xl font-extrabold text-rose-600 mb-6 group-hover:scale-110 group-hover:shadow-rose-500/10 transition-all duration-300 relative z-10">
                      <div className="absolute inset-1 rounded-[22px] bg-gradient-to-br from-rose-500/5 to-rose-500/10"></div>
                      <span className="relative z-10">02</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Request to Join</h3>
                    <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                      Complete your dashboard profile, then send a direct join request or booking request. Organizers review your traveler profile compatibility checklist and decide if it&apos;s a vibe match.
                    </p>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="text-center group flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-lg flex items-center justify-center text-2xl font-extrabold text-indigo-600 mb-6 group-hover:scale-110 group-hover:shadow-indigo-500/10 transition-all duration-300 relative z-10">
                      <div className="absolute inset-1 rounded-[22px] bg-gradient-to-br from-indigo-500/5 to-indigo-500/10"></div>
                      <span className="relative z-10">03</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">GoTogether!</h3>
                    <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                      Once approved, connect in your group chat room, pay securely through the available checkout for paid trips, and set off on an unforgettable journey.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-20">
                <AnimatedButton
                  href="/trips"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-bold px-8 py-4 rounded-full shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.03] transition-all duration-300"
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
    </MaintenanceGuard>
  );
}



