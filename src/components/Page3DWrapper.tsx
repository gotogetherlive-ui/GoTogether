"use client";

import { ReactNode } from "react";

export default function Page3DWrapper({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`animate-[pageIn_0.5s_ease-out] ${className}`}
      style={{ perspective: "1000px" }}
    >
      {children}
    </div>
  );
}
