"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { HeroMenu } from "@/components/hero/HeroMenu";
import { getAcademyRedirectForRole } from "@/lib/academy-auth";
import { useAcademy } from "./AcademyProvider";

type AcademyPageLayoutProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AcademyPageLayout({
  eyebrow,
  title,
  subtitle,
  actions,
  children
}: AcademyPageLayoutProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion() ?? false;
  const { currentUser, logout } = useAcademy();

  const topRightControl = currentUser ? (
    <div
      className="academy-top-right-control"
      style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}
    >
      <Link
        href={getAcademyRedirectForRole(currentUser.role)}
        style={topRightButtonStyle}
      >
        {currentUser.role === "admin" ? "Admin Panel" : "My Dashboard"}
      </Link>
      <button
        type="button"
        onClick={logout}
        style={{ ...topRightButtonStyle, cursor: "pointer" }}
      >
        Logout
      </button>
    </div>
  ) : pathname === "/academy/login" ? (
    <Link href="/academy" style={topRightButtonStyle}>
      Browse Tutorials
    </Link>
  ) : (
    <Link href="/academy/login" style={topRightButtonStyle}>
      Optional Login
    </Link>
  );

  return (
    <main
      className="academy-shell"
      style={{
        background:
          "radial-gradient(circle at top, rgba(127,193,255,0.16), transparent 35%), linear-gradient(180deg, #09131f 0%, #08111d 100%)",
        minHeight: "100vh"
      }}
    >
      <section
        className="academy-hero-shell"
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(145deg, rgba(6,12,22,0.98) 0%, rgba(10,28,48,0.92) 58%, rgba(13,74,126,0.35) 100%)"
        }}
      >
        <HeroMenu reducedMotion={reducedMotion} />
        <div
          className="academy-top-right"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 45
          }}
        >
          {topRightControl}
        </div>
        <div
          className="academy-hero-inner"
          style={{
            width: "min(1180px, calc(100% - 2rem))",
            margin: "0 auto",
            padding: "7.8rem 0 3.6rem"
          }}
        >
          <div
            className="academy-hero-copy"
            style={{
              maxWidth: "46rem",
              display: "grid",
              gap: "1rem"
            }}
          >
            {eyebrow ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  width: "fit-content",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "999px",
                  padding: "0.45rem 0.85rem",
                  fontSize: "0.8rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(239,246,255,0.78)",
                  background: "rgba(255,255,255,0.04)"
                }}
              >
                {eyebrow}
              </span>
            ) : null}

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.6rem, 5vw, 4.3rem)",
                lineHeight: 0.96,
                color: "#eff6ff",
                textShadow: "0 10px 36px rgba(8,17,29,0.35)"
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "42rem",
                fontSize: "1.08rem",
                lineHeight: 1.8,
                color: "rgba(239,246,255,0.82)"
              }}
            >
              {subtitle}
            </p>
            {actions ? (
              <div
                className="academy-hero-actions"
                style={{
                  marginTop: "0.4rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.9rem",
                  alignItems: "center"
                }}
              >
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="academy-page-content"
        style={{
          width: "min(1180px, calc(100% - 2rem))",
          margin: "0 auto",
          padding: "2.2rem 0 4rem"
        }}
      >
        {children}
      </section>
    </main>
  );
}

const topRightButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.85rem",
  padding: "0.75rem 1rem",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(8,17,29,0.44)",
  color: "#eff6ff",
  textDecoration: "none",
  fontWeight: 700,
  backdropFilter: "blur(12px)"
} as const;
