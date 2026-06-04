"use client";

import { useEffect, useState } from "react";

export type BannerPhase = "landing" | "transition" | "idle";

type UseBannerPhaseOptions = {
  reducedMotion: boolean;
  landingDurationMs?: number;
  transitionDurationMs?: number;
};

export function useBannerPhase({
  reducedMotion,
  landingDurationMs = 1900,
  transitionDurationMs = 1100
}: UseBannerPhaseOptions) {
  const [phase, setPhase] = useState<BannerPhase>("landing");

  useEffect(() => {
    setPhase("landing");

    const landingTimer = window.setTimeout(
      () => setPhase("transition"),
      reducedMotion ? 700 : landingDurationMs
    );
    const idleTimer = window.setTimeout(
      () => setPhase("idle"),
      (reducedMotion ? 700 : landingDurationMs) +
        (reducedMotion ? 350 : transitionDurationMs)
    );

    return () => {
      window.clearTimeout(landingTimer);
      window.clearTimeout(idleTimer);
    };
  }, [landingDurationMs, reducedMotion, transitionDurationMs]);

  return phase;
}
