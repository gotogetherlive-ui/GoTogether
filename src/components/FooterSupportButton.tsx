"use client";

import { useState } from "react";
import ContactSupportModal from "./ContactSupportModal";

export default function FooterSupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-slate-400 hover:text-white transition-colors text-left"
      >
        Contact Support
      </button>
      <ContactSupportModal open={open} onClose={() => setOpen(false)} defaultCategory="general" />
    </>
  );
}
