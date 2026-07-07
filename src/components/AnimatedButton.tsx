"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface AnimatedButtonProps {
  href?: string;
  onClick?: (e: any) => void;
  children: ReactNode;
  className?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function AnimatedButton({ href, onClick, children, className = "", title, type = "button", disabled }: AnimatedButtonProps) {
  const hasDisplayClass = /\b(flex|inline-flex|block|inline-block|grid|inline-grid|hidden)\b/.test(className);
  const displayClass = hasDisplayClass ? "" : "inline-block";

  const innerClass = `${displayClass} ${className} transition-transform duration-200 ${disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0.5"}`;

  const inner = (
    <div
      className={innerClass}
      onClick={disabled ? undefined : onClick}
      title={title}
    >
      {children}
    </div>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={displayClass || "block"}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className="inline-block p-0 bg-transparent border-none cursor-pointer disabled:cursor-not-allowed w-full text-left"
      title={title}
    >
      {inner}
    </button>
  );
}
