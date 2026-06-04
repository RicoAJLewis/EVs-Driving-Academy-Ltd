"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

type HeroLocationLinkProps = {
  href: string;
  reducedMotion: boolean;
};

export function HeroLocationLink({
  href,
  reducedMotion
}: HeroLocationLinkProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Open academy location in Google Maps"
      className={`hero-location-link ${!reducedMotion ? "hero-fade-down hero-fade-down-delay-1" : ""}`}
      initial={reducedMotion ? false : { opacity: 0, y: -10 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        top: "clamp(0.75rem, 2.4vw, 1.75rem)",
        right: "clamp(0.75rem, 2.4vw, 1.75rem)",
        zIndex: 40,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.55rem",
        minHeight: "clamp(2.6rem, 6vw, 3rem)",
        padding: "clamp(0.6rem, 1.8vw, 0.78rem) clamp(0.78rem, 2.2vw, 1rem)",
        borderRadius: "999px",
        border: "1px solid rgba(246,193,91,0.22)",
        background:
          "linear-gradient(135deg, rgba(15,33,54,0.88), rgba(10,21,33,0.78))",
        color: "#fff3d6",
        fontWeight: 700,
        fontSize: "clamp(0.82rem, 2vw, 0.95rem)",
        letterSpacing: "0.01em",
        textDecoration: "none",
        boxShadow: "0 18px 44px rgba(8,17,29,0.24)",
        backdropFilter: "blur(12px)"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2rem",
          height: "2rem",
          borderRadius: "999px",
          background: "rgba(246,193,91,0.14)",
          border: "1px solid rgba(246,193,91,0.18)",
          color: "#f6c15b",
          flexShrink: 0
        }}
      >
        <MapPin size={15} strokeWidth={2.2} />
      </span>

      <span className="hero-location-label">Location</span>
    </motion.a>
  );
}
