"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useBannerPhase } from "@/hooks/useBannerPhase";
import { useCursorParallax } from "@/hooks/useCursorParallax";
import { CursorGlow } from "./CursorGlow";
import { HeroContent } from "./HeroContent";
import { HeroAuthLink } from "./HeroAuthLink";
import { HeroImageLayers } from "./HeroImageLayers";
import { HeroLocationLink } from "./HeroLocationLink";
import { HeroMenu } from "./HeroMenu";

type HeroBannerProps = {
  locationUrl: string;
};

export function HeroBanner({ locationUrl }: HeroBannerProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const phase = useBannerPhase({ reducedMotion });
  const {
    interactive,
    handlers,
    glowStyle,
    backgroundStyle: imageStyle,
    textStyle
  } = useCursorParallax({
    enabled: phase === "idle",
    reducedMotion
  });

  return (
    <section
      id="home"
      className="relative isolate min-h-screen overflow-hidden bg-academy-ink"
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: "100vh",
        overflow: "hidden",
        backgroundColor: "#08111d"
      }}
      aria-label="EVs Driving Academy introduction"
      {...handlers}
    >
      <HeroMenu
        reducedMotion={reducedMotion}
        rightContent={
          <>
            <HeroAuthLink reducedMotion={reducedMotion} />
            <HeroLocationLink
              href={locationUrl}
              reducedMotion={reducedMotion}
              inline
            />
          </>
        }
      />
      <HeroImageLayers
        phase={phase}
        reducedMotion={reducedMotion}
        imageStyle={imageStyle}
      />

      <motion.div
        className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(6,12,22,0.44)_0%,_rgba(6,12,22,0.18)_20%,_rgba(6,12,22,0.03)_38%,_rgba(6,12,22,0)_58%),radial-gradient(circle_at_top_right,_rgba(255,241,216,0.14),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.03)_0%,_rgba(255,255,255,0)_44%,_rgba(6,12,22,0.16)_100%)]"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(6,12,22,0.44) 0%, rgba(6,12,22,0.18) 20%, rgba(6,12,22,0.03) 38%, rgba(6,12,22,0) 58%), radial-gradient(circle at top right, rgba(255,241,216,0.14), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 44%, rgba(6,12,22,0.16) 100%)"
        }}
        animate={{ opacity: phase === "landing" ? 0.44 : 0.56 }}
        transition={{ duration: reducedMotion ? 0.3 : 0.7, ease: "easeOut" }}
      />

      <HeroContent phase={phase} reducedMotion={reducedMotion} style={textStyle} />
      <CursorGlow active={interactive} glowStyle={glowStyle} />
    </section>
  );
}
