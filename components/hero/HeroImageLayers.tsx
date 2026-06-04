"use client";

import { motion, type MotionStyle } from "framer-motion";
import type { BannerPhase } from "@/hooks/useBannerPhase";

type HeroImageLayersProps = {
  imageStyle: MotionStyle;
  phase: BannerPhase;
  reducedMotion: boolean;
};

export function HeroImageLayers({
  phase,
  reducedMotion,
  imageStyle
}: HeroImageLayersProps) {
  const imageClassName = [
    "hero-layer-image",
    "hero-scene-visible",
    !reducedMotion && phase === "landing" ? "hero-image-landing" : "",
    !reducedMotion && phase === "transition" ? "hero-image-transition" : "",
    !reducedMotion && phase === "idle" ? "hero-image-idle" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      <motion.div
        className="hero-full-layer"
        style={{
          position: "absolute",
          inset: 0,
          ...imageStyle
        }}
      >
        <img
          src="/images/landing-page/full_image.png"
          alt=""
          className={imageClassName}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "56% center",
            display: "block",
            userSelect: "none",
            pointerEvents: "none"
          }}
        />
      </motion.div>
    </div>
  );
}
