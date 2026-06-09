"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AcademyPageLayout } from "./AcademyPageLayout";

function getResetErrorFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const errorCode = hashParams.get("error_code") ?? queryParams.get("error_code");
  const errorDescription =
    hashParams.get("error_description") ?? queryParams.get("error_description");

  if (!errorCode && !errorDescription) {
    return "";
  }

  if (errorCode === "otp_expired") {
    return "This link has expired or has already been used. Please request a new one.";
  }

  return errorDescription ?? "This password reset link could not be used.";
}

export function AcademyResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const prepareResetSession = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        setErrorMessage("Supabase is not configured yet.");
        return;
      }

      const authError = getResetErrorFromUrl();

      if (authError) {
        setErrorMessage(authError);
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(
            error.message.toLowerCase().includes("expired")
              ? "This link has expired or has already been used. Please request a new one."
              : error.message
          );
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!data.session) {
        setErrorMessage("This password reset link could not be used.");
        return;
      }

      setIsReady(true);
    };

    void prepareResetSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage("Supabase is not configured yet.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage("Password updated successfully. You can now log in.");
  };

  return (
    <AcademyPageLayout
      eyebrow="Secure Access"
      title="Reset Password"
      subtitle="Create a new password for your EV Academy account."
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
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={!isReady || Boolean(successMessage)}
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
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={!isReady || Boolean(successMessage)}
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
            <p style={{ margin: 0, color: "#fecaca", lineHeight: 1.6 }}>
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p style={{ margin: 0, color: "#bbf7d0", lineHeight: 1.6 }}>
              {successMessage}
            </p>
          ) : null}

          {successMessage ? (
            <Link href="/academy/login" className="reviews-submit-button">
              Back to Login
            </Link>
          ) : (
            <button
              type="submit"
              disabled={!isReady || isSubmitting}
              style={{
                minHeight: "3.2rem",
                borderRadius: "999px",
                border: 0,
                background:
                  "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
                color: "#0f172a",
                fontWeight: 700,
                cursor: !isReady || isSubmitting ? "wait" : "pointer",
                opacity: !isReady || isSubmitting ? 0.72 : 1
              }}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          )}
        </form>
      </div>
    </AcademyPageLayout>
  );
}
