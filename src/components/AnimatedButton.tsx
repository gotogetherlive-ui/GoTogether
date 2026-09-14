"use client";

import Link from "next/link";
import { ReactNode, type MouseEventHandler } from "react";

interface AnimatedButtonProps {
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  children: ReactNode;
  className?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function AnimatedButton({ href, onClick, children, className = "", title, type = "button", disabled }: AnimatedButtonProps) {
  const hasDisplayClass = /\b(flex|inline-flex|block|inline-block|grid|inline-grid|hidden)\b/.test(className);
  const displayClass = hasDisplayClass ? "" : "inline-block";

  const buttonClass = `${displayClass} ${className} transition-colors duration-150 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`;
  if (href && !disabled) {
    return <Link href={href} onClick={onClick} className={buttonClass} title={title}>{children}</Link>;
  }
  return <button type={type} disabled={disabled} onClick={onClick} className={buttonClass} title={title}>{children}</button>;
}
