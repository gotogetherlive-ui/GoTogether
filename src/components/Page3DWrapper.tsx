"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function Page3DWrapper({ children, className = "" }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10, rotateX: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 1.02, y: -10, rotateX: -5 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={{ perspective: "1000px" }}
    >
      {children}
    </motion.div>
  );
}
