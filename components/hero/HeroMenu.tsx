"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type HeroMenuProps = {
  reducedMotion: boolean;
  rightContent?: ReactNode;
};

type MenuItem = {
  label: string;
  href: string;
  external?: boolean;
  isActive?: (pathname: string) => boolean;
};

const menuItems: MenuItem[] = [
  {
    label: "Bookings",
    href: "https://evsdrivingacademy.setmore.com/",
    external: true
  },
  {
    label: "Academy",
    href: "/academy",
    isActive: (pathname) => pathname.startsWith("/academy")
  },
  {
    label: "About",
    href: "/#about"
  },
  {
    label: "Reviews",
    href: "/#reviews"
  }
];

const softPulseEase = [0.22, 1, 0.36, 1] as const;

export function HeroMenu({ reducedMotion, rightContent }: HeroMenuProps) {
  const pathname = usePathname();
  const logoSrc = "/images/logo/website-logo.png";
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(!reducedMotion);
  const cooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setHeartbeatActive(false);
      return;
    }

    setHeartbeatActive(true);
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const clearCooldownTimer = () => {
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  };

  const pauseHeartbeat = () => {
    clearCooldownTimer();
    setIsLogoHovered(true);
    setHeartbeatActive(false);
  };

  const resumeHeartbeatWithCooldown = () => {
    setIsLogoHovered(false);

    if (reducedMotion) {
      setHeartbeatActive(false);
      return;
    }

    clearCooldownTimer();
    cooldownTimerRef.current = window.setTimeout(() => {
      setHeartbeatActive(true);
      cooldownTimerRef.current = null;
    }, 4000);
  };

  const logoAnimation = reducedMotion
    ? { scale: 1 }
    : isLogoHovered
      ? { scale: 1.03 }
      : heartbeatActive
        ? { scale: [1, 1.05, 1, 1.025, 1] }
        : { scale: 1 };

  const logoTransition = reducedMotion
    ? { duration: 0 }
    : isLogoHovered
      ? { duration: 0.2, ease: softPulseEase }
      : heartbeatActive
        ? {
            duration: 1.35,
            ease: softPulseEase,
            times: [0, 0.18, 0.48, 0.7, 1],
            repeat: Infinity,
            repeatDelay: 2.4
          }
        : { duration: 0.2, ease: softPulseEase };

  const navClassName = [
    "hero-primary-nav",
    !reducedMotion ? "hero-fade-down hero-fade-down-delay-1" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      aria-label="Primary"
      className={navClassName}
      style={{
        position: "absolute",
        top: "clamp(0.75rem, 2.4vw, 1.75rem)",
        left: "clamp(0.75rem, 2.4vw, 1.75rem)",
        right: "clamp(0.75rem, 2.4vw, 1.75rem)",
        zIndex: 40
      }}
    >
      <div
        className="hero-primary-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div
          className="hero-primary-header-left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.65rem, 1.8vw, 1rem)"
          }}
        >
          <Link
            href="/"
            aria-label="Return to the homepage"
            className="hero-home-logo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.25rem",
              borderRadius: "1rem",
              textDecoration: "none"
            }}
            onMouseEnter={pauseHeartbeat}
            onMouseLeave={resumeHeartbeatWithCooldown}
            onFocus={pauseHeartbeat}
            onBlur={resumeHeartbeatWithCooldown}
          >
            <motion.span
              className="relative inline-flex items-center justify-center"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              animate={logoAnimation}
              transition={logoTransition}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 scale-[1.03] bg-center bg-no-repeat opacity-70 blur-[1.4px]"
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: "scale(1.03)",
                  backgroundImage: `url('${logoSrc}')`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  opacity: 0.7,
                  filter: "blur(1.4px)"
                }}
              />
              <Image
                src={logoSrc}
                alt="EVs Driving Academy Ltd logo"
                width={168}
                height={168}
                className="relative h-16 w-auto drop-shadow-[0_12px_30px_rgba(8,17,29,0.35)] sm:h-20 lg:h-24"
                style={{
                  position: "relative",
                  height: "clamp(3.6rem, 12vw, 6rem)",
                  width: "auto",
                  filter: "drop-shadow(0 12px 30px rgba(8,17,29,0.35))"
                }}
                priority
              />
            </motion.span>
          </Link>

          <div
            className="hero-primary-nav-links"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.2rem"
            }}
          >
            {menuItems.map((item) => {
              const isActive = item.isActive?.(pathname) ?? false;
              const linkStyle = {
                color: isActive ? "#08111d" : "rgba(8,17,29,0.76)"
              } as const;

              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hero-primary-nav-link"
                    style={linkStyle}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="hero-primary-nav-link"
                  style={linkStyle}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {rightContent ? (
          <div
            className="hero-primary-header-right"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end"
            }}
          >
            {rightContent}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
