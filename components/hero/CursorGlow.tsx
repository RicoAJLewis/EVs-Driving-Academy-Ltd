"use client";

import { motion, type MotionStyle } from "framer-motion";

type CursorGlowProps = {
  active: boolean;
  glowStyle: MotionStyle;
};

export function CursorGlow({ active, glowStyle }: CursorGlowProps) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <motion.div
        className="absolute h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.38)_0%,_rgba(127,193,255,0.26)_35%,_rgba(127,193,255,0)_72%)] blur-2xl"
        style={glowStyle}
      />
    </motion.div>
  );
}
