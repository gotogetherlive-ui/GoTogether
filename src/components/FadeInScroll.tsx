import { ReactNode } from "react";

// Keep content visible during server rendering and when JavaScript is unavailable.
export default function FadeInScroll({ children, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}
