"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PostgrestError, User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  getSupabaseConfigStatus,
  getSupabaseUrlHostname
} from "@/lib/supabaseClient";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { AcademyProtected } from "./AcademyProtected";
import { useAcademy } from "./AcademyProvider";

type ProfileDebug = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type TableCheck = {
  table: string;
  success: boolean;
  count: number | null;
  error?: DebugError;
};

type DebugError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type InsertResult = {
  tone: "success" | "error";
  message: string;
  insertedId?: string;
  error?: DebugError;
};

const academyTables = [
  "academy_sections",
  "academy_videos",
  "video_comments",
  "video_progress",
  "reviews"
] as const;

function toDebugError(error: unknown): DebugError {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};

  return {
    message:
      typeof record.message === "string"
        ? record.message
        : error instanceof Error
          ? error.message
          : "Unknown Supabase error.",
    code: typeof record.code === "string" ? record.code : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined
  };
}

function CheckCard({
  label,
  value,
  isGood
}: {
  label: string;
  value: string;
  isGood?: boolean;
}) {
  return (
    <div style={debugCardStyle}>
      <span style={labelStyle}>{label}</span>
      <strong
        style={{
          color: isGood === false ? "#fecaca" : "#eff6ff",
          overflowWrap: "anywhere"
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ErrorDetails({ error }: { error: DebugError }) {
  return (
    <div style={errorBoxStyle}>
      <div>Message: {error.message}</div>
      <div>Code: {error.code ?? "none"}</div>
      <div>Details: {error.details ?? "none"}</div>
      <div>Hint: {error.hint ?? "none"}</div>
    </div>
  );
}

export function AcademyDebugPage() {
  const { currentUser, isReady, refreshAdminDebugInfo } = useAcademy();
  const configStatus = getSupabaseConfigStatus();
  const supabaseHost = getSupabaseUrlHostname();
  const [sessionExists, setSessionExists] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileDebug | null>(null);
  const [profileError, setProfileError] = useState<DebugError | null>(null);
  const [isAdminRpc, setIsAdminRpc] = useState<boolean | null>(null);
  const [isAdminRpcError, setIsAdminRpcError] = useState<DebugError | null>(null);
  const [tableChecks, setTableChecks] = useState<TableCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [insertResult, setInsertResult] = useState<InsertResult | null>(null);

  const canRunInsertTest = useMemo(
    () =>
      Boolean(
        authUser &&
          (profile?.role === "admin" ||
            currentUser?.role === "admin" ||
            isAdminRpc === true)
      ),
    [authUser, currentUser?.role, isAdminRpc, profile?.role]
  );

  const runChecks = useCallback(async () => {
    setIsLoading(true);
    setProfileError(null);
    setIsAdminRpcError(null);
    setInsertResult(null);

    const supabase = getSupabaseClient();

    if (!supabase) {
      setSessionExists(false);
      setAuthUser(null);
      setProfile(null);
      setTableChecks(
        academyTables.map((table) => ({
          table,
          success: false,
          count: null,
          error: { message: "Supabase client is not configured." }
        }))
      );
      setIsLoading(false);
      return;
    }

    const [{ data: sessionData }, { data: userData, error: userError }] =
      await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);
    const user = userData.user ?? sessionData.session?.user ?? null;

    setSessionExists(Boolean(sessionData.session));
    setAuthUser(user);

    if (userError) {
      setProfileError(toDebugError(userError));
    }

    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      setProfile((data as ProfileDebug | null) ?? null);
      setProfileError(error ? toDebugError(error) : null);

      const rpcResult = await supabase.rpc("is_admin");
      setIsAdminRpc(typeof rpcResult.data === "boolean" ? rpcResult.data : null);
      setIsAdminRpcError(rpcResult.error ? toDebugError(rpcResult.error) : null);

      await refreshAdminDebugInfo();
    } else {
      setProfile(null);
      setIsAdminRpc(null);
    }

    const checks = await Promise.all(
      academyTables.map(async (table) => {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        return {
          table,
          success: !error,
          count: error ? null : count ?? 0,
          error: error ? toDebugError(error as PostgrestError) : undefined
        } satisfies TableCheck;
      })
    );

    setTableChecks(checks);
    setIsLoading(false);
  }, [refreshAdminDebugInfo]);

  useEffect(() => {
    if (!isReady) return;
    void runChecks();
  }, [isReady, runChecks]);

  const testInsertSection = async () => {
    setInsertResult(null);
    const supabase = getSupabaseClient();

    if (!supabase) {
      setInsertResult({
        tone: "error",
        message: "Supabase client is not configured."
      });
      return;
    }

    const payload = {
      title: "Debug Test Section",
      description: "Created from /academy/debug",
      sort_order: 999,
      is_published: false
    };
    const { data, error } = await supabase
      .from("academy_sections")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setInsertResult({
        tone: "error",
        message: "Insert failed.",
        error: toDebugError(error)
      });
      return;
    }

    setInsertResult({
      tone: "success",
      message: "Insert succeeded.",
      insertedId: data.id
    });
    await runChecks();
  };

  const deleteInsertedSection = async () => {
    if (!insertResult?.insertedId) return;
    const supabase = getSupabaseClient();

    if (!supabase) return;

    const { error } = await supabase
      .from("academy_sections")
      .delete()
      .eq("id", insertResult.insertedId);

    if (error) {
      setInsertResult({
        tone: "error",
        message: "Delete failed.",
        insertedId: insertResult.insertedId,
        error: toDebugError(error)
      });
      return;
    }

    setInsertResult({
      tone: "success",
      message: "Debug section deleted."
    });
    await runChecks();
  };

  return (
    <AcademyProtected allowedRoles={["admin"]}>
      <AcademyPageLayout
        title="EV Academy Debug"
        subtitle="Temporary Supabase diagnostics for the live Academy connection, session, profile, RLS, and EV Academy tables."
      >
        <div style={{ display: "grid", gap: "1.4rem" }}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionHeadingStyle}>Environment Checks</h2>
              <p style={mutedStyle}>
                Safe checks only. The anon key value is never displayed.
              </p>
            </div>
            <button type="button" onClick={() => void runChecks()} style={buttonStyle}>
              {isLoading ? "Checking..." : "Refresh Checks"}
            </button>
          </div>
          <div className="academy-admin-stats">
            <CheckCard
              label="Supabase URL exists"
              value={configStatus.supabaseUrlExists ? "Yes" : "No"}
              isGood={configStatus.supabaseUrlExists}
            />
            <CheckCard
              label="Anon key exists"
              value={configStatus.supabaseAnonKeyExists ? "Yes" : "No"}
              isGood={configStatus.supabaseAnonKeyExists}
            />
            <CheckCard
              label="Supabase hostname"
              value={supabaseHost || "Not available"}
              isGood={Boolean(supabaseHost)}
            />
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionHeadingStyle}>Auth Checks</h2>
          <div className="academy-admin-stats">
            <CheckCard
              label="Session exists"
              value={sessionExists ? "Yes" : "No"}
              isGood={sessionExists}
            />
            <CheckCard label="Current user id" value={authUser?.id ?? "Not logged in"} />
            <CheckCard label="Current user email" value={authUser?.email ?? "Not logged in"} />
            <CheckCard
              label="App metadata role"
              value={
                typeof authUser?.app_metadata?.role === "string"
                  ? authUser.app_metadata.role
                  : "Not set"
              }
            />
            <CheckCard
              label="User metadata name"
              value={
                typeof authUser?.user_metadata?.name === "string"
                  ? authUser.user_metadata.name
                  : typeof authUser?.user_metadata?.full_name === "string"
                    ? authUser.user_metadata.full_name
                    : "Not set"
              }
            />
            <CheckCard
              label="public.is_admin()"
              value={String(isAdminRpc ?? "Not checked")}
              isGood={isAdminRpc === true}
            />
          </div>
          {isAdminRpcError ? <ErrorDetails error={isAdminRpcError} /> : null}
        </section>

        <section style={panelStyle}>
          <h2 style={sectionHeadingStyle}>Profile Checks</h2>
          <div className="academy-admin-stats">
            <CheckCard
              label="Profile row found"
              value={profile ? "Yes" : "No"}
              isGood={Boolean(profile)}
            />
            <CheckCard label="Profile full name" value={profile?.full_name ?? "Not found"} />
            <CheckCard
              label="Profile role"
              value={profile?.role ?? "Not found"}
              isGood={profile?.role === "admin"}
            />
            <CheckCard
              label="Profile id matches user"
              value={profile?.id && authUser?.id ? String(profile.id === authUser.id) : "Unknown"}
              isGood={Boolean(profile?.id && authUser?.id && profile.id === authUser.id)}
            />
          </div>
          {profileError ? <ErrorDetails error={profileError} /> : null}
        </section>

        <section style={panelStyle}>
          <h2 style={sectionHeadingStyle}>Database Read Checks</h2>
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {tableChecks.map((check) => (
              <article key={check.table} style={debugCardStyle}>
                <strong style={{ color: "#eff6ff" }}>{check.table}</strong>
                <span style={labelStyle}>
                  {check.success ? `Success. Row count: ${check.count}` : "Failed"}
                </span>
                {check.error ? <ErrorDetails error={check.error} /> : null}
              </article>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionHeadingStyle}>Admin Insert Test</h2>
              <p style={mutedStyle}>
                Inserts an unpublished test section into `academy_sections`. Available
                only when the page can see an admin session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void testInsertSection()}
              style={buttonStyle}
              disabled={!canRunInsertTest}
            >
              Test Insert Section
            </button>
          </div>
          {!canRunInsertTest ? (
            <div style={errorBoxStyle}>
              Insert test disabled because the current session is not confirmed as admin.
            </div>
          ) : null}
          {insertResult ? (
            <div
              style={{
                ...debugCardStyle,
                border:
                  insertResult.tone === "success"
                    ? "1px solid rgba(74,222,128,0.25)"
                    : "1px solid rgba(248,113,113,0.28)"
              }}
            >
              <strong
                style={{
                  color: insertResult.tone === "success" ? "#dcfce7" : "#fecaca"
                }}
              >
                {insertResult.message}
              </strong>
              {insertResult.insertedId ? (
                <>
                  <span style={labelStyle}>Inserted row id: {insertResult.insertedId}</span>
                  <button
                    type="button"
                    onClick={() => void deleteInsertedSection()}
                    style={dangerButtonStyle}
                  >
                    Delete Test Row
                  </button>
                </>
              ) : null}
              {insertResult.error ? <ErrorDetails error={insertResult.error} /> : null}
            </div>
          ) : null}
        </section>
        </div>
      </AcademyPageLayout>
    </AcademyProtected>
  );
}

const panelStyle = {
  borderRadius: "1.4rem",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
  padding: "1.3rem",
  display: "grid",
  gap: "1rem"
} as const;

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  alignItems: "center",
  flexWrap: "wrap" as const
};

const sectionHeadingStyle = {
  margin: 0,
  color: "#eff6ff",
  fontSize: "1.3rem"
} as const;

const mutedStyle = {
  margin: "0.35rem 0 0",
  color: "rgba(239,246,255,0.72)",
  lineHeight: 1.7
} as const;

const debugCardStyle = {
  borderRadius: "1rem",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  padding: "1rem",
  display: "grid",
  gap: "0.35rem"
} as const;

const labelStyle = {
  color: "rgba(239,246,255,0.68)",
  lineHeight: 1.6,
  overflowWrap: "anywhere" as const
};

const errorBoxStyle = {
  borderRadius: "0.85rem",
  border: "1px solid rgba(248,113,113,0.28)",
  background: "rgba(239,68,68,0.12)",
  color: "#fee2e2",
  padding: "0.8rem",
  display: "grid",
  gap: "0.25rem",
  lineHeight: 1.6,
  overflowWrap: "anywhere" as const
};

const buttonStyle = {
  minHeight: "2.75rem",
  borderRadius: "999px",
  padding: "0.7rem 1rem",
  border: "1px solid rgba(246,193,91,0.35)",
  background: "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer"
} as const;

const dangerButtonStyle = {
  width: "fit-content",
  minHeight: "2.5rem",
  borderRadius: "999px",
  padding: "0.6rem 0.9rem",
  border: "1px solid rgba(248,113,113,0.36)",
  background: "rgba(255,255,255,0.06)",
  color: "#fecaca",
  fontWeight: 700,
  cursor: "pointer"
} as const;
