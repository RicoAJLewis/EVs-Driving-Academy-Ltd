"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

type HeroLocationLinkProps = {
  href: string;
  reducedMotion: boolean;
  inline?: boolean;
};

export function HeroLocationLink({
  href,
  reducedMotion,
  inline = false
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
        position: inline ? "relative" : "absolute",
        top: inline ? "auto" : "clamp(0.75rem, 2.4vw, 1.75rem)",
        right: inline ? "auto" : "clamp(0.75rem, 2.4vw, 1.75rem)",
        zIndex: inline ? "auto" : 40,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.55rem",
        minHeight: inline ? "2.55rem" : "clamp(2.6rem, 6vw, 3rem)",
        padding: inline
          ? "0.55rem 0.8rem"
          : "clamp(0.6rem, 1.8vw, 0.78rem) clamp(0.78rem, 2.2vw, 1rem)",
        borderRadius: inline ? "0.85rem" : "999px",
        border: inline
          ? "1px solid rgba(8,17,29,0.1)"
          : "1px solid rgba(246,193,91,0.22)",
        background: inline
          ? "rgba(255,255,255,0.68)"
          : "linear-gradient(135deg, rgba(15,33,54,0.88), rgba(10,21,33,0.78))",
        color: inline ? "#08111d" : "#fff3d6",
        fontWeight: 700,
        fontSize: inline ? "0.92rem" : "clamp(0.82rem, 2vw, 0.95rem)",
        letterSpacing: "0.01em",
        textDecoration: "none",
        boxShadow: inline ? "none" : "0 18px 44px rgba(8,17,29,0.24)",
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
          borderRadius: inline ? "0.7rem" : "999px",
          background: inline ? "rgba(8,17,29,0.06)" : "rgba(246,193,91,0.14)",
          border: inline
            ? "1px solid rgba(8,17,29,0.08)"
            : "1px solid rgba(246,193,91,0.18)",
          color: inline ? "#08111d" : "#f6c15b",
          flexShrink: 0
        }}
      >
        <MapPin size={15} strokeWidth={2.2} />
      </span>

      <span className="hero-location-label">Location</span>
    </motion.a>
  );
}
