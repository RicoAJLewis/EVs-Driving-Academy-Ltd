"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AcademyPageLayout } from "./AcademyPageLayout";

type CallbackStatus = "checking" | "success" | "error";

function getAuthErrorFromUrl() {
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

  return errorDescription ?? "This confirmation link could not be used.";
}

export function AcademyAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>("checking");
  const [message, setMessage] = useState("Confirming your email...");

  useEffect(() => {
    let isMounted = true;

    const confirmEmail = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        setStatus("error");
        setMessage("Supabase is not configured yet.");
        return;
      }

      const authError = getAuthErrorFromUrl();

      if (authError) {
        setStatus("error");
        setMessage(authError);
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!isMounted) {
          return;
        }

        if (error) {
          setStatus("error");
          setMessage(
            error.message.toLowerCase().includes("expired")
              ? "This link has expired or has already been used. Please request a new one."
              : error.message
          );
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          setStatus("error");
          setMessage("This confirmation link could not be used.");
          return;
        }
      }

      setStatus("success");
      setMessage("Email confirmed successfully. You can now log in.");
      window.setTimeout(() => {
        router.replace("/academy/login?confirmed=1");
      }, 1800);
    };

    void confirmEmail();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <AcademyPageLayout
      eyebrow="Secure Access"
      title="EV Academy"
      subtitle="Confirming your EV Academy account."
    >
      <div
        style={{
          width: "min(560px, 100%)",
          margin: "0 auto",
          borderRadius: "1.6rem",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
          padding: "1.6rem",
          display: "grid",
          gap: "1rem"
        }}
      >
        <strong style={{ color: status === "error" ? "#fecaca" : "#eff6ff" }}>
          {message}
        </strong>

        {status === "success" ? (
          <span style={{ color: "rgba(239,246,255,0.72)", lineHeight: 1.7 }}>
            Redirecting you back to the login page...
          </span>
        ) : null}

        {status === "error" ? (
          <Link href="/academy/login" className="reviews-submit-button">
            Back to Login
          </Link>
        ) : null}
      </div>
    </AcademyPageLayout>
  );
}
