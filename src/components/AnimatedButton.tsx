"use client";

import { motion } from "framer-motion";
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

  const inner = (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.95, y: 2 }}
      className={`${displayClass} ${className} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      onClick={disabled ? undefined : onClick}
      title={title}
    >
      {children}
    </motion.div>
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
