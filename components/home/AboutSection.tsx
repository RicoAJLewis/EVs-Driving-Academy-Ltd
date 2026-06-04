"use client";

import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { MutableRefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type AboutSectionProps = {
  paragraphs: string[];
};

function createParagraphRefSetter(
  paragraphRefs: MutableRefObject<Array<HTMLParagraphElement | null>>,
  index: number
) {
  return (element: HTMLParagraphElement | null) => {
    paragraphRefs.current[index] = element;
  };
}

export function AboutSection({ paragraphs }: AboutSectionProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useLayoutEffect(() => {
    if (reducedMotion || !sectionRef.current) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const desktopOrLaptop = window.matchMedia("(min-width: 960px)").matches;
    const tabletUp = window.matchMedia("(min-width: 700px)").matches;

    const ctx = gsap.context(() => {
      const visibleParagraphs = paragraphRefs.current.filter(Boolean);

      gsap.set(headingRef.current, { opacity: 0, y: 34 });
      gsap.set(visibleParagraphs, { opacity: 0, y: 28 });

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 78%",
          end: desktopOrLaptop ? "top 12%" : "top 22%",
          scrub: tabletUp ? 0.9 : 0.55,
          snap: desktopOrLaptop
            ? {
                snapTo: 1,
                duration: { min: 0.22, max: 0.6 },
                ease: "power2.inOut"
              }
            : undefined
        }
      });

      timeline
        .to(
          headingRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.78
          },
          0.06
        )
        .to(
          visibleParagraphs,
          {
            opacity: 1,
            y: 0,
            duration: 0.72,
            stagger: 0.11
          },
          0.18
        );
    }, sectionRef);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [paragraphs, reducedMotion]);

  return (
    <section
      id="about"
      ref={sectionRef}
      aria-labelledby="about-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: "4.5rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(10,20,32,0.98) 0%, rgba(8,17,29,1) 100%)"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0",
          background:
            "radial-gradient(circle at 20% 24%, rgba(127,193,255,0.12), transparent 28%), radial-gradient(circle at 78% 34%, rgba(246,193,91,0.12), transparent 26%)",
          pointerEvents: "none"
        }}
      />

      <div
        className="about-section-inner"
        style={{
          width: "min(1180px, calc(100% - 2rem))",
          margin: "0 auto",
          padding: "5rem 0 5.25rem"
        }}
      >
        <div className="about-section-grid">
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              alignContent: "center",
              gap: "1.05rem"
            }}
          >
            <h2
              id="about-heading"
              ref={headingRef}
              style={{
                margin: 0,
                color: "#eff6ff",
                fontSize: "clamp(2.25rem, 4.3vw, 3.7rem)",
                lineHeight: 0.98,
                textShadow: "0 10px 32px rgba(8,17,29,0.3)"
              }}
            >
              About EVs Driving Academy
            </h2>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                marginTop: "0.45rem"
              }}
            >
              {paragraphs.map((paragraph, index) => (
                <p
                  key={`${index}-${paragraph.slice(0, 24)}`}
                  ref={createParagraphRefSetter(paragraphRefs, index)}
                  style={{
                    margin: 0,
                    maxWidth: "40rem",
                    color: "rgba(239,246,255,0.82)",
                    fontSize: "1.02rem",
                    lineHeight: 1.9
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
