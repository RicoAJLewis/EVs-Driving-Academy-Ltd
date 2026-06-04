"use client";

import { motion, type MotionStyle } from "framer-motion";
import type { BannerPhase } from "@/hooks/useBannerPhase";

type HeroContentProps = {
  phase: BannerPhase;
  reducedMotion: boolean;
  style: MotionStyle;
};

export function HeroContent({
  phase,
  reducedMotion,
  style
}: HeroContentProps) {
  const roadPlaneClassName = [
    "hero-copy-visible",
    "hero-road-plane",
    !reducedMotion ? "hero-road-settle hero-road-settle-delay-1" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const headlineClassName = ["hero-copy-visible", "hero-road-heading"].join(" ");

  return (
    <motion.div
      style={{
        position: "absolute",
        zIndex: 20,
        display: "flex",
        inset: 0,
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "40px 20px 108px",
        ...style
      }}
      className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center px-5 pb-28 pt-10 sm:px-8 sm:pb-32 lg:px-12 lg:pb-36"
    >
      <div
        className="hero-road-shell"
        style={{
          width: "100%",
          maxWidth: "1320px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end"
        }}
      >
        <div
          className={roadPlaneClassName}
          data-phase={phase}
          style={{
            position: "relative",
            width: "min(78rem, 96vw)",
            maxWidth: "78rem",
            padding: "1.2rem 2rem 0.45rem",
            textAlign: "center",
            transformOrigin: "center bottom"
          }}
        >
          <div
            aria-hidden="true"
            className="hero-road-sheen"
            style={{
              position: "absolute",
              inset: "7% 7% 10%",
              borderRadius: "2rem",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0)), radial-gradient(circle at 50% 18%, rgba(255,255,255,0.05), transparent 58%)",
              filter: "blur(12px)",
              opacity: 0.5
            }}
          />

          <h1
            className={headlineClassName}
            style={{
              margin: 0,
              color: "rgba(228, 232, 235, 0.9)",
              fontSize: "clamp(3.35rem, 7vw, 7.3rem)",
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: "-0.038em",
              textTransform: "uppercase",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.16), 0 -1px 0 rgba(6,10,15,0.78), 0 2px 18px rgba(6,10,15,0.28), 0 22px 30px rgba(8,17,29,0.16)"
            }}
          >
            <span className="hero-road-line hero-road-line-far">
              Learn to Drive
            </span>
            <span className="hero-road-line hero-road-line-near">
              with Confidence
            </span>
          </h1>
        </div>
      </div>
    </motion.div>
  );
}
