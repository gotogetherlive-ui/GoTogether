import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SafetyContent from "./SafetyContent";
import Page3DWrapper from "@/components/Page3DWrapper";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Safety Guidelines — GoTogether",
  description: "GoTogether safety guidelines for travelers. Learn how to stay safe, verify organizers, and report issues.",
  path: "/safety",
});

export default function SafetyPage() {
  return (
    <MaintenanceGuard>
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      {/* Modern emerald/teal blobs */}

      <Navbar />
      <Page3DWrapper className="flex-1 flex flex-col relative z-10">
        <SafetyContent />
      </Page3DWrapper>
      <Footer />
    </div>
    </MaintenanceGuard>
  );
}
