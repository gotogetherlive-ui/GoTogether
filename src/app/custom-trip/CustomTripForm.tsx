"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, Check, CheckCircle2, Loader2, Map, MapPin, MessageCircle, Mountain, Palmtree, Plus, ShieldCheck, Sparkles, Trash2, Trees, Waves } from "lucide-react";
import { useSession } from "@/components/SessionProvider";

const placeTypes = [
  { value: "mountains", label: "Mountains", icon: Mountain, text: "Cool air, valleys and scenic roads" },
  { value: "beach", label: "Beach", icon: Waves, text: "Coasts, sunsets and a slower pace" },
  { value: "city", label: "City", icon: Building2, text: "Food, culture and urban discovery" },
  { value: "nature", label: "Nature", icon: Trees, text: "Forests, wildlife and quiet stays" },
  { value: "heritage", label: "Heritage", icon: Map, text: "History, architecture and local stories" },
  { value: "not_sure", label: "Surprise me", icon: Sparkles, text: "Let our team recommend the right fit" },
];

type FormState = {
  bookerName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  destination: string;
  alternateDestination: string;
  placeType: string;
  notes: string;
};

const emptyForm: FormState = { bookerName: "", email: "", phone: "", whatsappNumber: "", destination: "", alternateDestination: "", placeType: "", notes: "" };

export default function CustomTripForm() {
  const { user } = useSession();
  const [destinationKnown, setDestinationKnown] = useState(true);
  const [phoneIsWhatsapp, setPhoneIsWhatsapp] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [travelers, setTravelers] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      bookerName: current.bookerName || user.full_name || "",
      email: current.email || user.email || "",
      phone: current.phone || user.phone_number || "",
    }));
  }, [user]);

  const updateForm = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateTraveler = (index: number, value: string) => setTravelers((current) => current.map((name, itemIndex) => itemIndex === index ? value : name));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/custom-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          whatsappNumber: phoneIsWhatsapp ? form.phone : form.whatsappNumber,
          destination: destinationKnown ? form.destination : "",
          alternateDestination: destinationKnown ? form.alternateDestination : "",
          placeType: destinationKnown ? "" : form.placeType,
          travelerNames: travelers,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit your request.");
      setRequestId(data.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (requestId) {
    return (
      <section className="relative flex min-h-[82vh] items-center overflow-hidden px-5 pb-20 pt-32 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffedd5_0,transparent_32%),radial-gradient(circle_at_80%_60%,#dbeafe_0,transparent_32%)]" />
        <div className="relative mx-auto max-w-2xl rounded-xl border border-white bg-white/90 p-8 text-center shadow-[0_30px_100px_-30px_rgba(15,23,42,.28)] backdrop-blur sm:p-14">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[.2em] text-orange-600">Request received</p>
          <h1 className="gt-page-title mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your dream trip starts here.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">Our support team will review your preferences and call you to discuss destinations, dates, itinerary, stays and the final price.</p>
          <div className="mt-8 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-500">Reference: <span className="font-mono font-bold text-slate-800">{requestId.slice(0, 8).toUpperCase()}</span></div>
          <Link href="/trips" className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 font-bold text-white hover:bg-orange-600">Explore trips while you wait <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 px-5 pb-28 pt-32 sm:px-8 lg:pb-36 lg:pt-40">
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.14em] text-orange-600 shadow-sm"><Sparkles className="h-4 w-4" />Personalized group travel</span>
            <h1 className="gt-page-title mt-7 text-balance text-5xl font-bold leading-[1.08] tracking-[-.045em] text-slate-950 sm:text-6xl lg:text-[4.35rem]">A trip designed around the people you love.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Share your group and your idea. A GoTogether travel specialist will help shape the destination, stays, route and budget—then you decide.</p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-700">
              {["Free consultation", "2+ travelers", "No payment today"].map((item) => <span key={item} className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3.5 w-3.5" /></span>{item}</span>)}
            </div>
          </div>

          <div className="relative hidden h-[470px] lg:block" aria-label="Popular Indian travel destinations">
            <div className="absolute left-0 top-7 h-[400px] w-[58%] overflow-hidden rounded-[1.75rem] bg-slate-200 shadow-[0_25px_60px_-20px_rgba(15,23,42,.35)]">
              <Image src="/hero_india_munnar.png" alt="Munnar tea gardens for a custom mountain holiday" fill priority sizes="(max-width: 1200px) 32vw, 390px" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent px-5 pb-5 pt-20 text-white"><p className="text-xs font-semibold text-white/75">Mountains & nature</p><p className="mt-1 text-lg font-bold">Munnar</p></div>
            </div>
            <div className="absolute right-0 top-0 h-[215px] w-[39%] overflow-hidden rounded-[1.5rem] bg-slate-200 shadow-[0_20px_50px_-20px_rgba(15,23,42,.3)]">
              <Image src="/hero_india_goa.png" alt="Goa beach for a custom coastal holiday" fill priority sizes="260px" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-4 pb-4 pt-14 text-white"><p className="text-sm font-bold">Goa</p></div>
            </div>
            <div className="absolute bottom-0 right-6 h-[225px] w-[43%] overflow-hidden rounded-[1.5rem] border-[6px] border-[#f7f8fa] bg-slate-200 shadow-[0_20px_50px_-20px_rgba(15,23,42,.3)]">
              <Image src="/hero_india_jaipur.png" alt="Jaipur heritage architecture for a custom city holiday" fill priority sizes="280px" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-4 pb-4 pt-14 text-white"><p className="text-sm font-bold">Jaipur</p></div>
            </div>
            <div className="absolute -left-5 bottom-0 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl"><p className="text-xs font-semibold text-slate-500">Not sure where to go?</p><p className="mt-1 font-bold text-slate-900">We&apos;ll help you choose.</p></div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:hidden">
            {[{ src: "/hero_india_munnar.png", alt: "Munnar tea gardens" }, { src: "/hero_india_goa.png", alt: "Goa beach" }, { src: "/hero_india_jaipur.png", alt: "Jaipur architecture" }].map((image) => <div key={image.src} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-200 shadow-lg"><Image src={image.src} alt={image.alt} fill sizes="33vw" className="object-cover" /></div>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 max-w-7xl px-5 pb-24 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_22px_60px_-32px_rgba(15,23,42,.35)] sm:p-9 lg:p-11">
            <div className="flex items-start gap-4 border-b border-slate-100 pb-6"><span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-orange-50 text-xs font-bold text-orange-600 ring-1 ring-orange-200">1</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Contact details</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Who should we speak with?</h2></div></div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">Your name<span className="text-orange-500"> *</span><input name={'booker-name'} required maxLength={120} value={form.bookerName} onChange={(e) => updateForm("bookerName", e.target.value)} className="premium-input mt-2" placeholder="Your full name" /></label>
              <label className="text-sm font-bold text-slate-700">Email address<span className="text-orange-500"> *</span><input name={'email'} required type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="premium-input mt-2" placeholder="Enter your email address" /></label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Active phone number<span className="text-orange-500"> *</span><input name={'phone'} required type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} className="premium-input mt-2" placeholder="Enter your active phone number" /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Our travel specialist will use this number to discuss your trip.</span></label>
            </div>

            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <label className="flex cursor-pointer items-start gap-3"><input name={'custom-trip-form-checkbox'} type="checkbox" checked={phoneIsWhatsapp} onChange={(event) => setPhoneIsWhatsapp(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-emerald-300 accent-emerald-600" /><span><span className="flex items-center gap-2 text-sm font-bold text-emerald-900"><MessageCircle className="h-4 w-4" />This phone number is also on WhatsApp</span><span className="mt-1 block text-xs leading-5 text-emerald-800/75">WhatsApp helps our team share itinerary options and trip details conveniently.</span></span></label>
              {!phoneIsWhatsapp && <label className="mt-4 block border-t border-emerald-200 pt-4 text-sm font-bold text-slate-700">WhatsApp number<span className="text-orange-500"> *</span><input name={'whatsapp-number'} required type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.whatsappNumber} onChange={(e) => updateForm("whatsappNumber", e.target.value)} className="premium-input mt-2" placeholder="Enter your WhatsApp number" /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Include the country code if this WhatsApp number is different from your calling number.</span></label>}
            </div>

            <div className="mt-12 flex items-start gap-4 border-b border-slate-100 pb-6"><span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-orange-50 text-xs font-bold text-orange-600 ring-1 ring-orange-200">2</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Your group · minimum two</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Who is traveling?</h2></div></div>
            <div className="mt-7 space-y-3">
              {travelers.map((traveler, index) => <div key={index} className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">{index + 1}</span><input name={`traveler-${index + 1}`} required maxLength={120} value={traveler} onChange={(e) => updateTraveler(index, e.target.value)} className="premium-input" placeholder={index === 0 ? "Lead traveler name" : "Traveler name"} aria-label={`Traveler ${index + 1} name`} />{travelers.length > 2 && <button type="button" onClick={() => setTravelers((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-rose-500 hover:bg-rose-50" aria-label={`Remove traveler ${index + 1}`}><Trash2 className="h-4 w-4" /></button>}</div>)}
              {travelers.length < 20 && <button type="button" onClick={() => setTravelers((current) => [...current, ""])} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-dashed border-orange-300 px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50"><Plus className="h-4 w-4" />Add another traveler</button>}
            </div>

            <div className="mt-12 flex items-start gap-4 border-b border-slate-100 pb-6"><span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-orange-50 text-xs font-bold text-orange-600 ring-1 ring-orange-200">3</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Your travel idea</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Where would you like to go?</h2></div></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setDestinationKnown(true)} className={`rounded-2xl border p-5 text-left transition ${destinationKnown ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-slate-300"}`}><MapPin className={`h-6 w-6 ${destinationKnown ? "text-orange-500" : "text-slate-400"}`} /><span className="mt-4 block font-semibold">I know the destination</span><span className="mt-1 block text-sm text-slate-500">Share your first and alternate choice</span></button>
              <button type="button" onClick={() => setDestinationKnown(false)} className={`rounded-2xl border p-5 text-left transition ${!destinationKnown ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-slate-300"}`}><Palmtree className={`h-6 w-6 ${!destinationKnown ? "text-orange-500" : "text-slate-400"}`} /><span className="mt-4 block font-semibold">Help me choose</span><span className="mt-1 block text-sm text-slate-500">Tell us the kind of place you want</span></button>
            </div>

            {destinationKnown ? <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Preferred destination<span className="text-orange-500"> *</span><input name={'destination'} required value={form.destination} maxLength={160} onChange={(e) => updateForm("destination", e.target.value)} className="premium-input mt-2" placeholder="e.g. Goa, Manali, Kerala" /></label><label className="text-sm font-bold text-slate-700">Alternate destination <span className="font-normal text-slate-400">(optional)</span><input name={'alternate-destination'} value={form.alternateDestination} maxLength={160} onChange={(e) => updateForm("alternateDestination", e.target.value)} className="premium-input mt-2" placeholder="Your second choice" /></label></div> : <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{placeTypes.map(({ value, label, icon: Icon, text }) => <button key={value} type="button" onClick={() => updateForm("placeType", value)} className={`rounded-2xl border p-4 text-left transition ${form.placeType === value ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-200"}`}><div className="flex items-center justify-between"><Icon className={`h-5 w-5 ${form.placeType === value ? "text-emerald-600" : "text-slate-400"}`} />{form.placeType === value && <Check className="h-4 w-4 text-emerald-600" />}</div><span className="mt-3 block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span></button>)}</div>}

            <label className="mt-8 block text-sm font-bold text-slate-700">Anything else we should know? <span className="font-normal text-slate-400">(optional)</span><textarea name={'notes'} value={form.notes} maxLength={2000} onChange={(e) => updateForm("notes", e.target.value)} rows={4} className="premium-input mt-2 resize-y" placeholder="Tell us about your celebration, pace, accessibility needs or must-have experiences." /></label>

            {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
            <button disabled={submitting || (!destinationKnown && !form.placeType)} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-slate-900/15 transition  hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Sending request...</> : <>Book my free consultation <ArrowRight className="h-5 w-5" /></>}</button>
            <p className="mt-4 text-center text-xs leading-5 text-slate-400">No payment today. Our team will discuss and confirm the itinerary and final price with you first.</p>
          </form>

          <aside className="self-start space-y-5 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-32px_rgba(15,23,42,.35)]">
              <div className="relative h-44">
                <Image src="/hero_india_ladakh.png" alt="Scenic mountain road on a personalized India journey" fill sizes="340px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 to-transparent" />
                <div className="absolute bottom-4 left-5 text-white"><p className="text-xs font-semibold text-white/75">Your dedicated travel specialist</p><p className="mt-1 text-lg font-bold">Planning with you, not for you</p></div>
              </div>
              <div className="p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-orange-600"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-xl font-bold">What happens next</h2><p className="text-xs text-slate-500">A simple, no-pressure process</p></div></div><ol className="mt-6 space-y-5">{[
              ["1", "We review your request", "A support specialist checks your group and preferences."],
              ["2", "We call and collaborate", "Together, we decide the destination, dates, route, stays and budget."],
              ["3", "You approve the plan", "Nothing is finalized until the itinerary and price work for you."],
            ].map(([number, title, text]) => <li key={number} className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-orange-200 bg-orange-50 text-xs font-bold text-orange-600">{number}</span><div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></li>)}</ol></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="font-bold">Great for every kind of group</p><div className="mt-4 flex flex-wrap gap-2">{["Friends", "Families", "Couples", "Celebrations", "Small teams"].map((item) => <span key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">{item}</span>)}</div></div>
          </aside>
        </div>
      </section>
    </>
  );
}
