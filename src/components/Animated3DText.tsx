"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Animated3DTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function Animated3DText({ children, className = "", delay = 0 }: Animated3DTextProps) {
  // A subtle 3D text effect that pops out of the screen
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 90, z: -100 }}
      animate={{ opacity: 1, rotateX: 0, z: 0 }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-block ${className}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {children}
    </motion.div>
  );
}
