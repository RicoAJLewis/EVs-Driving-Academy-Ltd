"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent } from "react";

type HeroMenuProps = {
  reducedMotion: boolean;
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
  },
  {
    label: "Home",
    href: "/",
    isActive: (pathname) => pathname === "/"
  }
];

const softPulseEase = [0.22, 1, 0.36, 1] as const;

export function HeroMenu({ reducedMotion }: HeroMenuProps) {
  const pathname = usePathname();
  const logoSrc = "/images/logo/website-logo.png";
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(!reducedMotion);
  const cooldownTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navClassName = [
    "absolute left-4 top-4 z-40 sm:left-6 sm:top-6 lg:left-8 lg:top-8",
    !reducedMotion ? "hero-fade-down hero-fade-down-delay-1" : ""
  ]
    .filter(Boolean)
    .join(" ");

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

  const handleBlurWithin = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && menuRef.current?.contains(nextFocusedElement)) {
      return;
    }

    setIsOpen(false);
    resumeHeartbeatWithCooldown();
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

  return (
    <nav
      aria-label="Primary"
      className={navClassName}
      style={{
        position: "absolute",
        top: "clamp(0.75rem, 2.4vw, 1.75rem)",
        left: "clamp(0.75rem, 2.4vw, 1.75rem)",
        zIndex: 40
      }}
    >
      <div
        ref={menuRef}
        className="group relative inline-block"
        style={{ position: "relative", display: "inline-block" }}
        onMouseEnter={() => {
          setIsOpen(true);
          pauseHeartbeat();
        }}
        onMouseLeave={() => {
          setIsOpen(false);
          resumeHeartbeatWithCooldown();
        }}
        onFocusCapture={() => {
          setIsOpen(true);
          pauseHeartbeat();
        }}
        onBlurCapture={handleBlurWithin}
      >
        <Link
          href="/"
          aria-label="Return to the homepage"
          className="flex items-center rounded-2xl p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.25rem",
            borderRadius: "1rem",
            textDecoration: "none"
          }}
        >
          <motion.span
            className="relative inline-flex items-center justify-center"
            style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
              className="relative h-16 w-auto drop-shadow-[0_12px_30px_rgba(8,17,29,0.35)] transition duration-300 group-hover:scale-[1.03] sm:h-20 lg:h-24"
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
          className="pointer-events-none absolute left-1 top-full flex min-w-[10rem] origin-top flex-col gap-2 pt-3 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          style={{
            position: "absolute",
            top: "100%",
            left: "0.25rem",
            display: "flex",
            minWidth: "10rem",
            flexDirection: "column",
            gap: "0.5rem",
            paddingTop: "0.75rem",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: "opacity 0.2s ease"
          }}
        >
          {menuItems.map((item) => {
            const isActive = item.isActive?.(pathname) ?? false;
            const menuStyle = {
              width: "fit-content",
              color: isActive ? "#f6c15b" : "rgba(255,255,255,0.92)",
              fontSize: "clamp(1rem, 3vw, 1.35rem)",
              fontWeight: 600,
              textDecoration: isActive ? "underline" : "none",
              textUnderlineOffset: "0.28rem",
              textShadow: "0 10px 24px rgba(8,17,29,0.5)",
              transition: "transform 0.2s ease, color 0.2s ease"
            } as const;

            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={menuStyle}
                  className={`w-fit text-left text-lg font-semibold text-white/92 drop-shadow-[0_10px_24px_rgba(8,17,29,0.5)] transition hover:text-white focus-visible:text-white focus-visible:outline-none sm:text-xl ${
                    !reducedMotion
                      ? "hover:translate-x-1.5 hover:scale-[1.12] focus-visible:translate-x-1.5 focus-visible:scale-[1.12]"
                      : ""
                  }`}
                >
                  {item.label}
                </a>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                style={menuStyle}
                className={`w-fit text-left text-lg font-semibold text-white/92 drop-shadow-[0_10px_24px_rgba(8,17,29,0.5)] transition hover:text-white focus-visible:text-white focus-visible:outline-none sm:text-xl ${
                  !reducedMotion
                    ? "hover:translate-x-1.5 hover:scale-[1.12] focus-visible:translate-x-1.5 focus-visible:scale-[1.12]"
                    : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
