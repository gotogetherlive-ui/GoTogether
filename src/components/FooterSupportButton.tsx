"use client";

import { useState } from "react";
import { Headset } from "lucide-react";
import ContactSupportModal from "./ContactSupportModal";

export default function FooterSupportButton({ className = "text-sm text-slate-300 hover:text-white transition-colors text-left" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        suppressHydrationWarning
      >
        <Headset className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Contact Support</span>
      </button>
      <ContactSupportModal open={open} onClose={() => setOpen(false)} defaultCategory="general" />
    </>
  );
}
