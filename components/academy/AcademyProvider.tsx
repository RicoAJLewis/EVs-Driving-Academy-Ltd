"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { PostgrestError, User } from "@supabase/supabase-js";
import {
  normalizeAcademyThumbnailUrl,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import { isAdminRole, normalizeUserRole } from "@/lib/academy-roles";
import { getSupabaseClient, getSupabaseConfigStatus } from "@/lib/supabaseClient";
import type {
  AcademyAdminActionError,
  AcademyAdminDebugInfo,
  AcademyAnalytics,
  AcademyComment,
  AcademyProgress,
  AcademySection,
  AcademyUser,
  AcademyVideo,
  UserRole
} from "@/types/academy";

type LoginResult = {
  success: boolean;
  error?: string;
  user?: AcademyUser;
  emailConfirmationRequired?: boolean;
};

type RegisterResult = LoginResult;

type VideoInput = Omit<
  AcademyVideo,
  "id" | "order" | "createdAt" | "updatedAt" | "viewCount" | "commentCount"
> & { order?: number };

type AcademyContextValue = {
  isReady: boolean;
  errorMessage: string;
  currentUser: AcademyUser | null;
  adminDebugInfo: AcademyAdminDebugInfo | null;
  lastAdminActionError: AcademyAdminActionError | null;
  sections: AcademySection[];
  videos: AcademyVideo[];
  comments: AcademyComment[];
  progress: AcademyProgress[];
  visibleSections: AcademySection[];
  visibleVideos: AcademyVideo[];
  featuredVideo: AcademyVideo | null;
  analytics: AcademyAnalytics;
  refreshAcademyData: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  registerVisitor: (
    name: string,
    email: string,
    password: string
  ) => Promise<RegisterResult>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshAdminDebugInfo: () => Promise<AcademyAdminDebugInfo>;
  testAdminSectionInsert: () => Promise<void>;
  createSection: (title: string, description: string) => Promise<void>;
  updateSection: (
    sectionId: string,
    updates: Partial<Pick<AcademySection, "title" | "description" | "isVisible" | "order">>
  ) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  moveSection: (sectionId: string, direction: "up" | "down") => Promise<void>;
  createVideo: (input: VideoInput) => Promise<void>;
  updateVideo: (
    videoId: string,
    updates: Partial<
      Pick<
        AcademyVideo,
        | "sectionId"
        | "title"
        | "description"
        | "category"
        | "videoUrl"
        | "thumbnailUrl"
        | "resolvedVideoUrl"
        | "resolvedThumbnailUrl"
        | "isVisible"
        | "isFeatured"
        | "order"
      >
    >
  ) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  moveVideo: (videoId: string, direction: "up" | "down") => Promise<void>;
  moveVideoToSection: (videoId: string, sectionId: string) => Promise<void>;
  setVideoFeatured: (videoId: string) => Promise<void>;
  toggleVideoVisibility: (videoId: string) => Promise<void>;
  addComment: (videoId: string, commentText: string) => Promise<void>;
  deleteOwnComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleCommentVisibility: (commentId: string) => Promise<void>;
  incrementVideoView: (videoId: string, progressSeconds?: number) => Promise<void>;
  getSectionById: (sectionId: string) => AcademySection | undefined;
  getVideoById: (videoId: string) => AcademyVideo | undefined;
  getVideosForSection: (sectionId: string, visibleOnly?: boolean) => AcademyVideo[];
  getCommentsForVideo: (videoId: string, includeHidden?: boolean) => AcademyComment[];
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole | null;
};

type SectionRow = {
  id: string;
  title: string | null;
  description: string | null;
  sort_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type VideoRow = {
  id: string;
  section_id: string | null;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CommentRow = {
  id: string;
  video_id: string | null;
  user_id: string | null;
  comment: string | null;
  created_at: string | null;
};

type ProgressRow = {
  id: string;
  user_id: string | null;
  video_id: string | null;
  watched: boolean | null;
  watched_at: string | null;
  progress_seconds: number | null;
};

const AcademyContext = createContext<AcademyContextValue | null>(null);
const DEFAULT_SECTION_TITLE = "General";
const UNCATEGORIZED_SECTION_ID = "uncategorized";
const UNCATEGORIZED_SECTION: AcademySection = {
  id: UNCATEGORIZED_SECTION_ID,
  title: "Uncategorized",
  description: "Published tutorials that are not assigned to a section yet.",
  order: 9999,
  isVisible: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString()
};

function getDisplayNameFromUser(user: User, profile?: ProfileRow | null) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return (
    profile?.full_name?.trim() ||
    metadataName.trim() ||
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "EV Academy Student"
  );
}

function getDefaultProfileNameFromUser(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return (
    metadataName.trim() ||
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Student"
  );
}

function getRoleFromUser(user: User, profile?: ProfileRow | null): UserRole {
  const profileRole = normalizeUserRole(profile?.role);
  const appMetadataRole = normalizeUserRole(user.app_metadata?.role);
  const userMetadataRole = normalizeUserRole(user.user_metadata?.role);

  if (profileRole === "admin" || profileRole === "owner") {
    return profileRole;
  }

  if (appMetadataRole === "admin" || appMetadataRole === "owner") {
    return appMetadataRole;
  }

  if (userMetadataRole === "admin" || userMetadataRole === "owner") {
    return userMetadataRole;
  }

  return "student";
}

function toAcademyUserFromSupabase(user: User, profile?: ProfileRow | null): AcademyUser {
  return {
    id: user.id,
    name: getDisplayNameFromUser(user, profile),
    email: user.email ?? "",
    role: getRoleFromUser(user, profile),
    profileRole: profile?.role ?? null
  };
}

function isValidExternalVideoUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getUnknownErrorField(error: unknown, field: keyof PostgrestError) {
  if (error && typeof error === "object" && field in error) {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

function createAdminActionError({
  table,
  action,
  payload,
  error,
  debugInfo
}: {
  table: string;
  action: string;
  payload: Record<string, unknown> | null;
  error: unknown;
  debugInfo: AcademyAdminDebugInfo;
}): AcademyAdminActionError {
  const fallbackMessage =
    error instanceof Error ? error.message : "Supabase admin action failed.";

  return {
    table,
    action,
    payload,
    message: getUnknownErrorField(error, "message") ?? fallbackMessage,
    code: getUnknownErrorField(error, "code"),
    details: getUnknownErrorField(error, "details"),
    hint: getUnknownErrorField(error, "hint"),
    userId: debugInfo.userId,
    userEmail: debugInfo.userEmail,
    profileRole: debugInfo.profileRole,
    checkedAt: new Date().toISOString()
  };
}

function formatAdminActionError(error: AcademyAdminActionError) {
  const lines = [
    `${error.message}`,
    `Table: ${error.table}`,
    `Action: ${error.action}`,
    `User: ${error.userEmail ?? "not loaded"} (${error.userId ?? "no user id"})`,
    `Profile role: ${error.profileRole ?? "not loaded"}`,
    `Payload: ${JSON.stringify(error.payload)}`
  ];

  if (error.code) lines.push(`Code: ${error.code}`);
  if (error.details) lines.push(`Details: ${error.details}`);
  if (error.hint) lines.push(`Hint: ${error.hint}`);

  return lines.join("\n");
}

function toAcademySection(row: SectionRow): AcademySection {
  return {
    id: row.id,
    title: row.title?.trim() || DEFAULT_SECTION_TITLE,
    description: row.description?.trim() || "",
    order: row.sort_order ?? 0,
    isVisible: row.is_published ?? true,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString()
  };
}

function toAcademyVideo(
  row: VideoRow,
  fallbackSectionTitle: string,
  commentCount: number,
  viewCount: number
): AcademyVideo {
  const normalizedVideoUrl = normalizeAcademyVideoUrl(row.video_url ?? "");
  const normalizedThumbnailUrl = normalizeAcademyThumbnailUrl(row.thumbnail_url ?? "");
  const sectionId = row.section_id ?? UNCATEGORIZED_SECTION_ID;
  const category = row.category?.trim() || fallbackSectionTitle || DEFAULT_SECTION_TITLE;

  return {
    id: row.id,
    sectionId,
    title: row.title?.trim() || "Untitled tutorial",
    description: row.description?.trim() || "",
    category,
    videoUrl: normalizedVideoUrl,
    thumbnailUrl: normalizedThumbnailUrl,
    resolvedVideoUrl: normalizedVideoUrl,
    resolvedThumbnailUrl: normalizedThumbnailUrl,
    order: row.sort_order ?? 0,
    isVisible: row.is_published ?? false,
    isFeatured: row.is_featured ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    viewCount,
    commentCount
  };
}

function toAcademyProgress(row: ProgressRow): AcademyProgress {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    videoId: row.video_id ?? "",
    watched: row.watched ?? false,
    watchedAt: row.watched_at ?? undefined,
    progressSeconds: row.progress_seconds ?? 0
  };
}

export function AcademyProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<AcademyUser | null>(null);
  const [adminDebugInfo, setAdminDebugInfo] =
    useState<AcademyAdminDebugInfo | null>(null);
  const [lastAdminActionError, setLastAdminActionError] =
    useState<AcademyAdminActionError | null>(null);
  const [sections, setSections] = useState<AcademySection[]>([]);
  const [videos, setVideos] = useState<AcademyVideo[]>([]);
  const [comments, setComments] = useState<AcademyComment[]>([]);
  const [progress, setProgress] = useState<AcademyProgress[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  const loadCurrentUser = useCallback(async (user: User | null) => {
    if (!user) {
      setCurrentUser(null);
      return null;
    }

    const supabase = getSupabaseClient();
    let profile: ProfileRow | null = null;

    if (supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      profile = data as ProfileRow | null;

      if (!profile) {
        const { data: createdProfile, error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: getDefaultProfileNameFromUser(user),
            role: "student"
          })
          .select("id, full_name, role")
          .maybeSingle();

        if (error) {
          console.warn("EV Academy profile auto-create skipped", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            userId: user.id,
            userEmail: user.email ?? null
          });
        } else {
          profile = createdProfile as ProfileRow | null;
        }
      }
    }

    const academyUser = toAcademyUserFromSupabase(user, profile);
    setCurrentUser(academyUser);
    return academyUser;
  }, []);

  const refreshAdminDebugInfo = useCallback(async () => {
    const configStatus = getSupabaseConfigStatus();
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (!supabase) {
      const info: AcademyAdminDebugInfo = {
        ...configStatus,
        sessionExists: false,
        userId: null,
        userEmail: null,
        profileId: null,
        profileRole: null,
        appMetadataRole: null,
        userMetadataRole: null,
        profileMatchesSession: false,
        isAdminRpc: null,
        isAdminRpcError: "Supabase client is not configured.",
        checkedAt: now
      };
      setAdminDebugInfo(info);
      return info;
    }

    const [{ data: sessionData }, { data: userData, error: userError }] =
      await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);
    const user = userData.user ?? sessionData.session?.user ?? null;
    let profile: ProfileRow | null = null;
    let profileError: string | null = null;
    let isAdminRpc: boolean | null = null;
    let isAdminRpcError: string | null = null;

    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      profile = (data as ProfileRow | null) ?? null;
      profileError = error?.message ?? null;

      const rpcResult = await supabase.rpc("is_admin");
      isAdminRpc =
        typeof rpcResult.data === "boolean" ? rpcResult.data : null;
      isAdminRpcError = rpcResult.error?.message ?? null;
    }

    const info: AcademyAdminDebugInfo = {
      ...configStatus,
      sessionExists: Boolean(sessionData.session),
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      profileId: profile?.id ?? null,
      profileRole: profile?.role ?? null,
      appMetadataRole:
        typeof user?.app_metadata?.role === "string"
          ? user.app_metadata.role
          : null,
      userMetadataRole:
        typeof user?.user_metadata?.role === "string"
          ? user.user_metadata.role
          : null,
      profileMatchesSession: Boolean(profile?.id && user?.id && profile.id === user.id),
      isAdminRpc,
      isAdminRpcError: userError?.message ?? profileError ?? isAdminRpcError,
      checkedAt: now
    };

    setAdminDebugInfo(info);
    return info;
  }, []);

  const refreshAcademyData = useCallback(async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setIsReady(true);
      return;
    }

    setErrorMessage("");

    const [
      sectionsResult,
      videosResult,
      progressResult,
      studentsResult
    ] = await Promise.all([
      supabase
        .from("academy_sections")
        .select("id, title, description, sort_order, is_published, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("academy_videos")
        .select(
          "id, section_id, title, description, video_url, thumbnail_url, category, sort_order, is_published, is_featured, created_by, created_at, updated_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("video_progress")
        .select("id, user_id, video_id, watched, watched_at, progress_seconds"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student")
    ]);

    if (sectionsResult.error || videosResult.error) {
      setErrorMessage(
        sectionsResult.error?.message ??
          videosResult.error?.message ??
          "Unable to load Academy data."
      );
      setSections([]);
      setVideos([]);
      setComments([]);
      setProgress([]);
      setIsReady(true);
      return;
    }

    const sectionRows = (sectionsResult.data ?? []) as SectionRow[];
    const videoRows = (videosResult.data ?? []) as VideoRow[];
    const videoIds = videoRows.map((video) => video.id);
    let commentRows: CommentRow[] = [];

    if (videoIds.length > 0) {
      const { data: commentsData, error: commentsError } = await supabase
        .from("video_comments")
        .select("id, video_id, user_id, comment, created_at")
        .in("video_id", videoIds)
        .order("created_at", { ascending: false });

      if (commentsError) {
        setErrorMessage(commentsError.message);
      } else {
        commentRows = (commentsData ?? []) as CommentRow[];
      }
    }

    const commentUserIds = Array.from(
      new Set(commentRows.map((comment) => comment.user_id).filter(Boolean))
    ) as string[];
    const profileNames = new Map<string, string>();

    if (commentUserIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", commentUserIds);

      (profileRows ?? []).forEach((profile) => {
        profileNames.set(profile.id, profile.full_name || "EV Academy Student");
      });
    }

    const mappedSections = sectionRows.map(toAcademySection);
    const fallbackSection = UNCATEGORIZED_SECTION;
    const mappedComments = commentRows.map((row) => ({
      id: row.id,
      videoId: row.video_id ?? "",
      userId: row.user_id ?? "",
      userName: profileNames.get(row.user_id ?? "") ?? "EV Academy Student",
      commentText: row.comment?.trim() || "",
      isVisible: true,
      createdAt: row.created_at ?? new Date().toISOString()
    }));
    const mappedProgress = ((progressResult.data ?? []) as ProgressRow[]).map(
      toAcademyProgress
    );

    const mappedVideos = videoRows.map((video) => {
      const section = mappedSections.find((item) => item.id === video.section_id);

        return toAcademyVideo(
          video,
          section?.title ?? fallbackSection.title,
          mappedComments.filter((comment) => comment.videoId === video.id).length,
        mappedProgress.filter(
          (item) => item.videoId === video.id && item.watched
        ).length
      );
    });
    const publishedVideos = mappedVideos.filter((video) => video.isVisible);
    const videosBySection = publishedVideos.reduce<Record<string, number>>(
      (summary, video) => {
        summary[video.sectionId] = (summary[video.sectionId] ?? 0) + 1;
        return summary;
      },
      {}
    );

    if (typeof window !== "undefined") {
      console.info("EV Academy public data", {
        sectionsFetched: mappedSections.length,
        videosFetched: mappedVideos.length,
        publishedVideos: publishedVideos.length,
        videosBySection
      });
    }

    setSections(mappedSections);
    setComments(mappedComments);
    setProgress(mappedProgress);
    setStudentCount(studentsResult.count ?? 0);
    setVideos(mappedVideos);
    setIsReady(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const boot = async () => {
      if (!supabase) {
        await refreshAcademyData();
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      await loadCurrentUser(data.session?.user ?? null);
      await refreshAdminDebugInfo();
      await refreshAcademyData();
    };

    void boot();

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      void loadCurrentUser(session?.user ?? null).then(async () => {
        await refreshAdminDebugInfo();
        await refreshAcademyData();
      });
    });

    return () => {
      isMounted = false;
      authSubscription?.data.subscription.unsubscribe();
    };
  }, [loadCurrentUser, refreshAcademyData, refreshAdminDebugInfo]);

  const computedVideos = useMemo(
    () => {
      const sectionOrder = new Map(
        sections.map((section) => [section.id, section.order])
      );

      return [...videos].sort((a, b) => {
        const sectionComparison =
          (sectionOrder.get(a.sectionId) ?? 9999) -
          (sectionOrder.get(b.sectionId) ?? 9999);

        if (sectionComparison !== 0) {
          return sectionComparison;
        }

        if (a.sectionId === b.sectionId && a.order !== b.order) {
          return a.order - b.order;
        }

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    },
    [sections, videos]
  );
  const visibleSections = useMemo(
    () => {
      const publishedSections = sections.filter((section) => section.isVisible);
      const hasUncategorizedVideos = computedVideos.some(
        (video) => video.isVisible && video.sectionId === UNCATEGORIZED_SECTION_ID
      );

      return hasUncategorizedVideos
        ? [...publishedSections, UNCATEGORIZED_SECTION]
        : publishedSections;
    },
    [computedVideos, sections]
  );
  const visibleVideos = useMemo(
    () =>
      computedVideos.filter(
        (video) =>
          video.isVisible &&
          (video.sectionId === UNCATEGORIZED_SECTION_ID ||
            sections.some(
              (section) => section.id === video.sectionId && section.isVisible
            ))
      ),
    [computedVideos, sections]
  );
  const featuredVideo = useMemo(
    () => visibleVideos.find((video) => video.isFeatured) ?? visibleVideos[0] ?? null,
    [visibleVideos]
  );

  const analytics = useMemo<AcademyAnalytics>(() => {
    const publishedVideos = computedVideos.filter((video) => video.isVisible).length;
    const totalViews = progress.filter((item) => item.watched).length;
    const mostWatchedVideo =
      [...computedVideos].sort((a, b) => b.viewCount - a.viewCount)[0] ?? null;
    const topPerformingSection =
      [...sections]
        .map((section) => ({
          section,
          views: computedVideos
            .filter((video) => video.sectionId === section.id)
            .reduce((sum, video) => sum + video.viewCount, 0)
        }))
        .sort((a, b) => b.views - a.views)[0]?.section ?? null;
    const recentComments = [...comments]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((comment) => ({
        ...comment,
        videoTitle:
          computedVideos.find((video) => video.id === comment.videoId)?.title ??
          "Unknown video"
      }));

    return {
      totalViews,
      totalVideos: computedVideos.length,
      publishedVideos,
      unpublishedVideos: computedVideos.length - publishedVideos,
      totalSections: sections.length,
      totalComments: comments.length,
      totalStudents: studentCount,
      watchedCount: totalViews,
      mostWatchedVideo,
      topPerformingSection,
      viewsPerVideo: [...computedVideos].sort((a, b) => b.viewCount - a.viewCount),
      recentComments
    };
  }, [comments, computedVideos, progress, sections, studentCount]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error:
          "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error || !data.user) {
      const message = error?.message ?? "Invalid email or password.";

      return {
        success: false,
        error: message.toLowerCase().includes("invalid login credentials")
          ? "Invalid login credentials. Please make sure this account exists in Supabase Auth."
          : message
      };
    }

    const user = await loadCurrentUser(data.user);
    await refreshAcademyData();

    return { success: true, user: user ?? undefined };
  };

  const registerVisitor = async (
    name: string,
    email: string,
    password: string
  ): Promise<RegisterResult> => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error:
          "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/academy/auth/callback`
            : undefined,
        data: {
          name: name.trim() || "EV Academy Student",
          full_name: name.trim() || "EV Academy Student",
          role: "student"
        }
      }
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message ?? "Unable to create account."
      };
    }

    if (!data.session) {
      return { success: true, emailConfirmationRequired: true };
    }

    const user = await loadCurrentUser(data.user);
    await refreshAcademyData();

    return { success: true, user: user ?? undefined };
  };

  const requestPasswordReset = async (
    email: string,
    redirectTo: string
  ): Promise<LoginResult> => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error:
          "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    return error ? { success: false, error: error.message } : { success: true };
  };

  const logout = async () => {
    const supabase = getSupabaseClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    setCurrentUser(null);
    await refreshAcademyData();
  };

  const ensureAdminSession = async () => {
    const debugInfo = await refreshAdminDebugInfo();

    if (!debugInfo.sessionExists || !debugInfo.userId) {
      throw new Error("Admin session not loaded. Please log out and log back in.");
    }

    if (!isAdminRole(debugInfo.profileRole) || debugInfo.isAdminRpc !== true) {
      throw new Error(
        [
          "Admin permissions are not active for this session.",
          `User: ${debugInfo.userEmail ?? "unknown"} (${debugInfo.userId})`,
          `Profile id: ${debugInfo.profileId ?? "not found"}`,
          `Profile role: ${debugInfo.profileRole ?? "not found"}`,
          `App metadata role: ${debugInfo.appMetadataRole ?? "not set"}`,
          `User metadata role: ${debugInfo.userMetadataRole ?? "not set"}`,
          `public.is_admin(): ${String(debugInfo.isAdminRpc)}`,
          "Please confirm public.profiles.id matches this user id and role is admin/owner, then log out and log back in."
        ].join("\n")
      );
    }

    return debugInfo;
  };

  const throwAdminMutationError = ({
    table,
    action,
    payload,
    error,
    debugInfo
  }: {
    table: string;
    action: string;
    payload: Record<string, unknown> | null;
    error: unknown;
    debugInfo: AcademyAdminDebugInfo;
  }) => {
    const actionError = createAdminActionError({
      table,
      action,
      payload,
      error,
      debugInfo
    });

    setLastAdminActionError(actionError);
    console.error("EV Academy Supabase admin action failed", actionError);
    throw new Error(formatAdminActionError(actionError));
  };

  const testAdminSectionInsert = async () => {
    const supabase = getSupabaseClient();

    if (!supabase) throw new Error("Supabase is not configured.");

    const debugInfo = await ensureAdminSession();
    const payload = {
      title: `Debug test section ${new Date().toISOString()}`,
      description: "Temporary RLS test section. Safe to delete.",
      sort_order: 9999,
      is_published: false
    };
    const { data, error } = await supabase
      .from("academy_sections")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      throwAdminMutationError({
        table: "academy_sections",
        action: "debug insert",
        payload,
        error,
        debugInfo
      });
    }

    if (data?.id) {
      await supabase.from("academy_sections").delete().eq("id", data.id);
    }

    setLastAdminActionError(null);
    await refreshAdminDebugInfo();
  };

  const createSection = async (title: string, description: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) throw new Error("Supabase is not configured.");

    const debugInfo = await ensureAdminSession();
    const payload = {
      title: title.trim(),
      description: description.trim(),
      sort_order: sections.length + 1,
      is_published: true
    };
    const { error } = await supabase.from("academy_sections").insert(payload);

    if (error) {
      throwAdminMutationError({
        table: "academy_sections",
        action: "insert",
        payload,
        error,
        debugInfo
      });
    }

    setLastAdminActionError(null);
    await refreshAcademyData();
  };

  const updateSection: AcademyContextValue["updateSection"] = async (
    sectionId,
    updates
  ) => {
    const supabase = getSupabaseClient();

    if (!supabase) throw new Error("Supabase is not configured.");
    const debugInfo = await ensureAdminSession();

    const payload: Record<string, string | number | boolean | null> = {};
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) {
      payload.description = updates.description.trim();
    }
    if (updates.order !== undefined) payload.sort_order = updates.order;
    if (updates.isVisible !== undefined) payload.is_published = updates.isVisible;

    const { error } = await supabase
      .from("academy_sections")
      .update(payload)
      .eq("id", sectionId);

    if (error) {
      throwAdminMutationError({
        table: "academy_sections",
        action: "update",
        payload: { id: sectionId, ...payload },
        error,
        debugInfo
      });
    }

    setLastAdminActionError(null);
    await refreshAcademyData();
  };

  const deleteSection = async (sectionId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) throw new Error("Supabase is not configured.");
    const debugInfo = await ensureAdminSession();

    const { error } = await supabase
      .from("academy_sections")
      .delete()
      .eq("id", sectionId);

    if (error) {
      throwAdminMutationError({
        table: "academy_sections",
        action: "delete",
        payload: { id: sectionId },
        error,
        debugInfo
      });
    }

    setLastAdminActionError(null);
    await refreshAcademyData();
  };

  const moveSection = async (sectionId: string, direction: "up" | "down") => {
    const section = sections.find((item) => item.id === sectionId);

    if (!section) return;

    await updateSection(sectionId, {
      order: Math.max(0, section.order + (direction === "up" ? -1 : 1))
    });
  };

  const createVideo = async (input: VideoInput) => {
    const supabase = getSupabaseClient();

    if (!supabase || !currentUser) {
      throw new Error("Please log in as an admin before adding videos.");
    }

    if (!isValidExternalVideoUrl(input.videoUrl)) {
      throw new Error("Please enter a valid YouTube, Vimeo, TikTok, or Instagram URL.");
    }

    const debugInfo = await ensureAdminSession();
    const section = sections.find((item) => item.id === input.sectionId);

    const payload = {
      section_id: section?.id ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      video_url: normalizeAcademyVideoUrl(input.videoUrl),
      thumbnail_url: normalizeAcademyThumbnailUrl(input.thumbnailUrl ?? ""),
      category: input.category.trim() || section?.title || DEFAULT_SECTION_TITLE,
      sort_order:
        input.order ??
        videos.filter((video) => video.sectionId === input.sectionId).length + 1,
      is_published: input.isVisible,
      is_featured: input.isFeatured,
      created_by: currentUser.id
    };
    const { error } = await supabase.from("academy_videos").insert(payload);

    if (error) {
      throwAdminMutationError({
        table: "academy_videos",
        action: "insert",
        payload,
        error,
        debugInfo
      });
    }

    setLastAdminActionError(null);
    await refreshAcademyData();
  };

  const updateVideo: AcademyContextValue["updateVideo"] = async (videoId, updates) => {
    const supabase = getSupabaseClient();

    if (!supabase) throw new Error("Supabase is not configured.");
    const debugInfo = await ensureAdminSession();

    const payload: Record<string, string | number | boolean | null> = {};

    if (updates.sectionId !== undefined) payload.section_id = updates.sectionId || null;
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) {
      payload.description = updates.description.trim();
    }
    if (updates.videoUrl !== undefined) {
      if (!isValidExternalVideoUrl(updates.videoUrl)) {
        throw new Error("Please enter a valid external video URL.");
      }
      payload.video_url = normalizeAcademyVideoUrl(updates.videoUrl);
    }
    if (updates.thumbnailUrl !== undefined) {
      payload.thumbnail_url = normalizeAcademyThumbnailUrl(updates.thumbnailUrl);
    }
    if (updates.category !== undefined) {
      payload.category = updates.category.trim() || DEFAULT_SECTION_TITLE;
    }
    if (updates.order !== undefined) payload.sort_order = updates.order;
    if (updates.isVisible !== undefined) payload.is_published = updates.isVisible;
    if (updates.isFeatured !== undefined) payload.is_featured = updates.isFeatured;

    const { error } = await supabase
      .from("academy_videos")
      .update(payload)
      .eq("id", videoId);

    if (error) {
      throwAdminMutationError({
        table: "academy_videos",
        action: "update",
        payload: { id: videoId, ...payload },
        error,
        debugInfo
      });
    }

    setLastAdminActionError(null);
    await refreshAcademyData();
  };

  const deleteVideo = async (videoId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) throw new Error("Supabase is not configured.");
    const debugInfo = await ensureAdminSession();

    const { error } = await supabase.from("academy_videos").delete().eq("id", videoId);

    if (error) {
      throwAdminMutationError({
        table: "academy_videos",
        action: "delete",
        payload: { id: videoId },
        error,
        debugInfo
      });
    }

    setLastAdminActionError(null);
    await refreshAcademyData();
  };

  const moveVideo = async (videoId: string, direction: "up" | "down") => {
    const video = videos.find((item) => item.id === videoId);

    if (!video) return;

    await updateVideo(videoId, {
      order: Math.max(0, video.order + (direction === "up" ? -1 : 1))
    });
  };

  const moveVideoToSection = async (videoId: string, sectionId: string) => {
    const section = sections.find((item) => item.id === sectionId);

    await updateVideo(videoId, {
      sectionId,
      category: section?.title ?? DEFAULT_SECTION_TITLE
    });
  };

  const setVideoFeatured = async (videoId: string) => {
    const video = videos.find((item) => item.id === videoId);

    if (!video) return;

    await updateVideo(videoId, { isFeatured: !video.isFeatured });
  };

  const toggleVideoVisibility = async (videoId: string) => {
    const video = videos.find((item) => item.id === videoId);

    if (video) await updateVideo(videoId, { isVisible: !video.isVisible });
  };

  const addComment = async (videoId: string, commentText: string) => {
    const supabase = getSupabaseClient();

    if (!supabase || !currentUser || !commentText.trim()) return;

    const { error } = await supabase.from("video_comments").insert({
      video_id: videoId,
      user_id: currentUser.id,
      comment: commentText.trim()
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refreshAcademyData();
  };

  const deleteComment = async (commentId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) return;
    const debugInfo = isAdminRole(currentUser?.role) ? await ensureAdminSession() : null;

    const { error } = await supabase.from("video_comments").delete().eq("id", commentId);

    if (error) {
      if (debugInfo) {
        throwAdminMutationError({
          table: "video_comments",
          action: "delete",
          payload: { id: commentId },
          error,
          debugInfo
        });
      }

      setErrorMessage(error.message);
      return;
    }

    await refreshAcademyData();
  };

  const incrementVideoView = async (videoId: string, progressSeconds = 0) => {
    const supabase = getSupabaseClient();

    if (!supabase || !currentUser) return;

    await supabase.from("video_progress").upsert(
      {
        user_id: currentUser.id,
        video_id: videoId,
        watched: true,
        watched_at: new Date().toISOString(),
        progress_seconds: progressSeconds
      },
      { onConflict: "user_id,video_id" }
    );
    await refreshAcademyData();
  };

  const getSectionById = useCallback(
    (sectionId: string) => sections.find((section) => section.id === sectionId),
    [sections]
  );
  const getVideoById = useCallback(
    (videoId: string) => computedVideos.find((video) => video.id === videoId),
    [computedVideos]
  );
  const getVideosForSection = useCallback(
    (sectionId: string, visibleOnly = false) =>
      (visibleOnly ? visibleVideos : computedVideos).filter(
        (video) => video.sectionId === sectionId
      ),
    [computedVideos, visibleVideos]
  );
  const getCommentsForVideo = useCallback(
    (videoId: string) => comments.filter((comment) => comment.videoId === videoId),
    [comments]
  );

  const value = useMemo<AcademyContextValue>(
    () => ({
      isReady,
      errorMessage,
      currentUser,
      adminDebugInfo,
      lastAdminActionError,
      sections,
      videos: computedVideos,
      comments,
      progress,
      visibleSections,
      visibleVideos,
      featuredVideo,
      analytics,
      refreshAcademyData,
      login,
      registerVisitor,
      requestPasswordReset,
      logout,
      refreshAdminDebugInfo,
      testAdminSectionInsert,
      createSection,
      updateSection,
      deleteSection,
      moveSection,
      createVideo,
      updateVideo,
      deleteVideo,
      moveVideo,
      moveVideoToSection,
      setVideoFeatured,
      toggleVideoVisibility,
      addComment,
      deleteOwnComment: deleteComment,
      deleteComment,
      toggleCommentVisibility: async () => undefined,
      incrementVideoView,
      getSectionById,
      getVideoById,
      getVideosForSection,
      getCommentsForVideo
    }),
    [
      adminDebugInfo,
      analytics,
      comments,
      computedVideos,
      currentUser,
      errorMessage,
      featuredVideo,
      getCommentsForVideo,
      getSectionById,
      getVideoById,
      getVideosForSection,
      isReady,
      lastAdminActionError,
      progress,
      refreshAcademyData,
      refreshAdminDebugInfo,
      sections,
      visibleSections,
      visibleVideos
    ]
  );

  return (
    <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>
  );
}

export function useAcademy() {
  const context = useContext(AcademyContext);

  if (!context) {
    throw new Error("useAcademy must be used inside AcademyProvider.");
  }

  return context;
}
