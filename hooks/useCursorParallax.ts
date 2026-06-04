"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";

type UseCursorParallaxOptions = {
  enabled: boolean;
  reducedMotion: boolean;
};

type PointerHandlers = {
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
};

export function useCursorParallax({
  enabled,
  reducedMotion
}: UseCursorParallaxOptions) {
  const [canUseFinePointer, setCanUseFinePointer] = useState(false);
  const [hasPointer, setHasPointer] = useState(false);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);

  const smoothX = useSpring(cursorX, { stiffness: 110, damping: 22, mass: 0.8 });
  const smoothY = useSpring(cursorY, { stiffness: 110, damping: 22, mass: 0.8 });
  const smoothGlowX = useSpring(glowX, { stiffness: 180, damping: 28, mass: 0.45 });
  const smoothGlowY = useSpring(glowY, { stiffness: 180, damping: 28, mass: 0.45 });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updatePreference = () => setCanUseFinePointer(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!enabled || reducedMotion || !canUseFinePointer) {
      cursorX.set(0);
      cursorY.set(0);
    }
  }, [canUseFinePointer, cursorX, cursorY, enabled, reducedMotion]);

  const interactive = enabled && canUseFinePointer && !reducedMotion;

  const handlers = useMemo<PointerHandlers>(
    () => ({
      onPointerMove: (event) => {
        if (!interactive) {
          return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const relativeX = (event.clientX - bounds.left) / bounds.width;
        const relativeY = (event.clientY - bounds.top) / bounds.height;
        const normalizedX = relativeX * 2 - 1;
        const normalizedY = relativeY * 2 - 1;

        cursorX.set(normalizedX);
        cursorY.set(normalizedY);
        glowX.set(event.clientX - bounds.left);
        glowY.set(event.clientY - bounds.top);
        setHasPointer(true);
      },
      onPointerLeave: () => {
        cursorX.set(0);
        cursorY.set(0);
        setHasPointer(false);
      }
    }),
    [cursorX, cursorY, glowX, glowY, interactive]
  );

  return {
    interactive: interactive && hasPointer,
    handlers,
    glowStyle: {
      left: smoothGlowX,
      top: smoothGlowY
    },
    backgroundStyle: {
      x: useTransform(smoothX, [-1, 1], [-5, 5]),
      y: useTransform(smoothY, [-1, 1], [-3, 3])
    },
    middleStyle: {
      x: useTransform(smoothX, [-1, 1], [-10, 10]),
      y: useTransform(smoothY, [-1, 1], [-7, 7])
    },
    carStyle: {
      x: useTransform(smoothX, [-1, 1], [-16, 16]),
      y: useTransform(smoothY, [-1, 1], [-10, 10])
    },
    foregroundStyle: {
      x: useTransform(smoothX, [-1, 1], [-20, 20]),
      y: useTransform(smoothY, [-1, 1], [-14, 14])
    },
    textStyle: {
      x: useTransform(smoothX, [-1, 1], [-4, 4]),
      y: useTransform(smoothY, [-1, 1], [-2, 2])
    }
  };
}
