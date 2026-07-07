import { slugify } from "@/lib/seo";

export type Faq = { question: string; answer: string };

export const entityDescription =
  "GoTogether is an India-focused travel marketplace that helps users discover and book verified group trips, backpacking trips, weekend trips, trekking trips, bike trips, women-only trips, solo travel groups, and curated travel experiences from trusted organizers.";

export const destinations = [
  "Goa",
  "Manali",
  "Ladakh",
  "Kasol",
  "Spiti",
  "Rishikesh",
  "Meghalaya",
  "Kerala",
  "Andaman",
  "Jaipur",
  "Udaipur",
  "Jibhi",
  "Bir",
  "Mussoorie",
  "Gokarna",
  "Coorg",
  "Munnar",
  "Pondicherry",
  "Varanasi",
  "Himachal Pradesh",
  "Uttarakhand",
  "Rajasthan",
  "North East India",
].map((name) => ({
  name,
  slug: slugify(name),
  bestTime: bestTimeFor(name),
  experiences: experiencesFor(name),
}));

export const categories = [
  { name: "Group Trips", slug: "group-trips", bestFor: "travelers who want a shared itinerary, social energy, and organizer support" },
  { name: "Backpacking Trips", slug: "backpacking-trips", bestFor: "flexible travelers who prefer value, hostels or simple stays, and immersive routes" },
  { name: "Weekend Trips", slug: "weekend-trips", bestFor: "travelers looking for short escapes without taking long leave" },
  { name: "Bike Trips", slug: "bike-trips", bestFor: "experienced riders and pillions who want route-led adventure" },
  { name: "Trekking Trips", slug: "trekking-trips", bestFor: "active travelers who want guided trails, mountain routes, and outdoor stays" },
  { name: "Adventure Trips", slug: "adventure-trips", bestFor: "travelers looking for outdoor activities and higher-energy itineraries" },
  { name: "Camping Trips", slug: "camping-trips", bestFor: "travelers who enjoy nature stays, bonfires, simple facilities, and open-air experiences" },
  { name: "Budget Trips", slug: "budget-trips", bestFor: "travelers comparing affordable shared trips with transparent inclusions" },
  { name: "Solo Travel Groups", slug: "solo-travel-groups", bestFor: "solo travelers who want to join a group instead of planning alone" },
  { name: "Women-Only Trips", slug: "women-only-trips", bestFor: "women travelers looking for organizer-led women-only departures where available" },
];

export const cityPages = [
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Pune",
  "Hyderabad",
  "Ahmedabad",
  "Kolkata",
  "Chennai",
].map((city) => ({
  city,
  slug: `weekend-trips-from-${slugify(city)}`,
  destinations: cityDestinations(city),
}));

export const trustPages = [
  { path: "/about", title: "About GoTogether", summary: entityDescription },
  { path: "/how-it-works", title: "How GoTogether Works", summary: "Travelers discover trips, compare details, review organizer profiles, check itinerary and policies, and book securely when ready." },
  { path: "/verified-organizers", title: "Verified Organizers", summary: "Verified organizer pages help travelers review public business details, destinations, trip categories, policies, and trust indicators before booking." },
  { path: "/safety", title: "Traveler Safety", summary: "GoTogether surfaces organizer verification, trip details, safety notes, cancellation summaries, and support paths so travelers can make informed choices." },
  { path: "/cancellation-policy", title: "Cancellation Policy", summary: "Cancellation terms can vary by trip and organizer. Travelers should review the trip policy before booking and contact support for unclear cases." },
  { path: "/refund-policy", title: "Refund Policy", summary: "Refund eligibility depends on the organizer policy, trip status, payment state, and cancellation timing shown during booking." },
  { path: "/contact", title: "Contact GoTogether", summary: "Travelers and organizers can contact GoTogether for marketplace support, trip questions, organizer issues, and booking help." },
  { path: "/help", title: "GoTogether Help", summary: "Find help for choosing trips, checking organizers, understanding bookings, cancellation policies, safety, and support options." },
  { path: "/terms", title: "Terms", summary: "GoTogether terms explain platform usage, traveler responsibilities, organizer responsibilities, booking rules, and marketplace limits." },
  { path: "/privacy", title: "Privacy", summary: "GoTogether privacy information explains how user data is handled for accounts, bookings, support, safety, and marketplace operations." },
];

export const guidePages = [
  { slug: "goa-group-trip-guide", title: "Goa Group Trip Guide", destination: "Goa" },
  { slug: "best-time-to-visit-goa", title: "Best Time to Visit Goa", destination: "Goa" },
  { slug: "goa-for-solo-travelers", title: "Goa for Solo Travelers", destination: "Goa" },
  { slug: "manali-group-trip-guide", title: "Manali Group Trip Guide", destination: "Manali" },
  { slug: "ladakh-bike-trip-checklist", title: "Ladakh Bike Trip Checklist", destination: "Ladakh" },
  { slug: "best-weekend-trips-from-delhi", title: "Best Weekend Trips from Delhi", destination: "Delhi" },
  { slug: "how-to-join-a-group-trip-alone", title: "How to Join a Group Trip Alone", destination: "India" },
  { slug: "solo-travel-group-safety", title: "Solo Travel Group Safety", destination: "India" },
  { slug: "women-only-group-trip-safety", title: "Women-Only Group Trip Safety", destination: "India" },
  { slug: "backpacking-trip-checklist", title: "Backpacking Trip Checklist", destination: "India" },
];

export const commonFaqs: Faq[] = [
  {
    question: "What should I check before booking a group trip?",
    answer: "Check the itinerary, dates, destination, price, inclusions, exclusions, pickup point, organizer profile, cancellation policy, refund policy, and public reviews where available.",
  },
  {
    question: "Does GoTogether guarantee every organizer experience?",
    answer: "GoTogether helps travelers compare verified organizers and public trip details, but travelers should still review each trip policy and contact support or the organizer when details are unclear.",
  },
  {
    question: "Are prices, reviews, and availability always shown?",
    answer: "GoTogether shows prices, reviews, and availability only when real public data is available for the trip. Unknown details should be checked with the organizer.",
  },
];

export function destinationBySlug(slug: string) {
  return destinations.find((destination) => destination.slug === slug);
}

export function categoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function cityPageBySlug(slug: string) {
  return cityPages.find((page) => page.slug === slug);
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function bestTimeFor(name: string) {
  if (["Goa", "Gokarna", "Andaman", "Kerala", "Munnar", "Coorg", "Pondicherry"].includes(name)) return "October to March";
  if (["Ladakh", "Spiti"].includes(name)) return "June to September";
  if (["Manali", "Kasol", "Jibhi", "Bir", "Mussoorie", "Himachal Pradesh", "Uttarakhand"].includes(name)) return "March to June and September to November";
  if (["Jaipur", "Udaipur", "Rajasthan", "Varanasi"].includes(name)) return "October to March";
  return "Check season, weather, and route conditions before booking";
}

function experiencesFor(name: string) {
  const map: Record<string, string[]> = {
    Goa: ["beaches", "cafes", "nightlife", "forts", "social travel"],
    Manali: ["mountains", "cafes", "snow-season routes", "adventure activities"],
    Ladakh: ["bike routes", "high passes", "monasteries", "mountain landscapes"],
    Rishikesh: ["rafting", "yoga", "camping", "Ganga views"],
    Jaipur: ["forts", "heritage walks", "food", "culture"],
    Meghalaya: ["waterfalls", "living root bridges", "caves", "scenic drives"],
  };
  return map[name] || ["local sightseeing", "group activities", "food stops", "scenic experiences"];
}

function cityDestinations(city: string) {
  const map: Record<string, string[]> = {
    Delhi: ["Rishikesh", "Jaipur", "Manali", "Kasol", "Jibhi", "Bir", "Mussoorie"],
    Mumbai: ["Goa", "Lonavala", "Alibaug", "Udaipur", "Gokarna"],
    Bangalore: ["Coorg", "Gokarna", "Pondicherry", "Munnar", "Goa"],
    Pune: ["Goa", "Lonavala", "Alibaug", "Gokarna"],
    Hyderabad: ["Hampi", "Goa", "Pondicherry"],
    Ahmedabad: ["Udaipur", "Jaipur", "Rajasthan", "Mount Abu"],
    Kolkata: ["Meghalaya", "North East India", "Varanasi"],
    Chennai: ["Pondicherry", "Munnar", "Kerala", "Coorg"],
  };
  return map[city] || ["nearby hill stations", "heritage cities", "beach escapes"];
}
