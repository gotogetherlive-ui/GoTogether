"use client";

import Tilt from "react-parallax-tilt";
import { ReactNode } from "react";

interface TiltWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function TiltWrapper({ children, className = "" }: TiltWrapperProps) {
  return (
    <Tilt
      tiltMaxAngleX={5}
      tiltMaxAngleY={5}
      scale={1.02}
      transitionSpeed={2500}
      className={className}
      glareEnable={true}
      glareMaxOpacity={0.1}
      glarePosition="bottom"
    >
      {children}
    </Tilt>
  );
}
