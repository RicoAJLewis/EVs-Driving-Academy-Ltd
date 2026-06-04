"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getAcademyRedirectForRole } from "@/lib/academy-auth";
import { useAcademy } from "./AcademyProvider";
import { AcademyPageLayout } from "./AcademyPageLayout";

export function AcademyLogin() {
  const router = useRouter();
  const { currentUser, isReady, login, registerVisitor } = useAcademy();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isReady && currentUser) {
      router.replace(getAcademyRedirectForRole(currentUser.role));
    }
  }, [currentUser, isReady, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const result =
      mode === "login"
        ? login(email, password)
        : registerVisitor(name, email, password);

    if (!result.success || !result.user) {
      setErrorMessage(result.error ?? "Unable to continue.");
      return;
    }

    router.replace(getAcademyRedirectForRole(result.user.role));
  };

  return (
    <AcademyPageLayout
      eyebrow="Secure Access"
      title="Login to EV Academy"
      subtitle="Access driving tutorials, lesson videos, and road safety content from EVs Driving Academy."
    >
      <div
        style={{
          width: "min(560px, 100%)",
          margin: "0 auto",
          borderRadius: "1.6rem",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
          padding: "1.6rem"
        }}
      >
        <div style={{ display: "grid", gap: "0.45rem", marginBottom: "1.4rem" }}>
          <strong style={{ color: "#eff6ff", fontSize: "1.05rem" }}>
            {mode === "login" ? "Welcome back" : "Create a visitor account"}
          </strong>
          <span style={{ color: "rgba(239,246,255,0.72)", lineHeight: 1.7 }}>
            {mode === "login"
              ? "Sign in to manage your learning space, continue watching tutorials, and stay connected with EV Academy."
              : "Create your visitor account to save your place, join the Academy, and take part in the learning experience."}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          {mode === "register" ? (
            <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
              <span>Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                style={{
                  minHeight: "3rem",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(8,17,29,0.45)",
                  color: "#eff6ff",
                  padding: "0.85rem 1rem"
                }}
              />
            </label>
          ) : null}

          <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{
                minHeight: "3rem",
                borderRadius: "0.9rem",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(8,17,29,0.45)",
                color: "#eff6ff",
                padding: "0.85rem 1rem"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{
                minHeight: "3rem",
                borderRadius: "0.9rem",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(8,17,29,0.45)",
                color: "#eff6ff",
                padding: "0.85rem 1rem"
              }}
            />
          </label>

          {errorMessage ? (
            <p
              style={{
                margin: 0,
                color: "#fecaca",
                lineHeight: 1.6
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            style={{
              minHeight: "3.2rem",
              borderRadius: "999px",
              border: 0,
              background:
                "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
              color: "#0f172a",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {mode === "login" ? "Login" : "Create Visitor Account"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.3rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <button
            type="button"
            onClick={() =>
              setMode((currentMode) =>
                currentMode === "login" ? "register" : "login"
              )
            }
            style={{
              border: 0,
              background: "none",
              color: "#7fc1ff",
              padding: 0,
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            {mode === "login" ? "Create visitor account" : "Back to login"}
          </button>

          <Link
            href="/academy/login"
            onClick={(event) => event.preventDefault()}
            style={{
              color: "rgba(239,246,255,0.72)",
              textDecoration: "underline",
              textUnderlineOffset: "0.24rem"
            }}
          >
            Forgot password?
          </Link>
        </div>

        <p
          style={{
            margin: "1rem 0 0",
            color: "rgba(239,246,255,0.62)",
            lineHeight: 1.7
          }}
        >
          Password reset is a placeholder right now. This mock login flow is
          structured so a real auth provider can be connected later.
        </p>
      </div>
    </AcademyPageLayout>
  );
}
