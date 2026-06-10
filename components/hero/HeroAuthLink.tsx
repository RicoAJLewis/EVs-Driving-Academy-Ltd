"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getAcademyRedirectForRole } from "@/lib/academy-auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { UserRole } from "@/types/academy";

type HeroAuthLinkProps = {
  reducedMotion: boolean;
};

type HeaderUser = {
  label: string;
  role: UserRole;
};

function getHeaderUser(user: User): HeaderUser {
  const role =
    user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin"
      ? "admin"
      : "student";
  const name =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";
  const label = name.trim() || user.email?.split("@")[0] || "Profile";

  return { label, role };
}

export function HeroAuthLink({ reducedMotion }: HeroAuthLinkProps) {
  const [headerUser, setHeaderUser] = useState<HeaderUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    if (!supabase) {
      setIsReady(true);
      return;
    }

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setHeaderUser(data.session?.user ? getHeaderUser(data.session.user) : null);
      setIsReady(true);
    };

    void loadSession();

    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setHeaderUser(session?.user ? getHeaderUser(session.user) : null);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    setHeaderUser(null);
  };

  if (!isReady) {
    return (
      <span
        aria-hidden="true"
        className="hero-auth-link hero-auth-link-placeholder"
      />
    );
  }

  if (!headerUser) {
    return (
      <Link
        href="/academy/login"
        className={`hero-auth-link ${!reducedMotion ? "hero-fade-down hero-fade-down-delay-1" : ""}`}
      >
        Login
      </Link>
    );
  }

  return (
    <div
      className={`hero-auth-group ${!reducedMotion ? "hero-fade-down hero-fade-down-delay-1" : ""}`}
    >
      <Link
        href={getAcademyRedirectForRole(headerUser.role)}
        className="hero-auth-link"
        aria-label={`Open ${headerUser.label}'s EV Academy profile`}
      >
        <span className="hero-auth-profile-label">{headerUser.label}</span>
      </Link>
      <button type="button" className="hero-auth-link" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
