import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SafetyContent from "./SafetyContent";
import Page3DWrapper from "@/components/Page3DWrapper";

export const metadata = {
  title: "Safety Guidelines — GoTogether",
  description: "GoTogether safety guidelines for travelers. Learn how to stay safe, verify organizers, and report issues.",
};

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />
      <Page3DWrapper className="flex-1 flex flex-col">
        <SafetyContent />
      </Page3DWrapper>
      <Footer />
    </div>
  );
}
