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
import type { User } from "@supabase/supabase-js";
import {
  normalizeAcademyThumbnailUrl,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
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
>;

type AcademyContextValue = {
  isReady: boolean;
  errorMessage: string;
  currentUser: AcademyUser | null;
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
  createSection: (title: string, description: string) => void;
  updateSection: (
    sectionId: string,
    updates: Partial<Pick<AcademySection, "title" | "description" | "isVisible">>
  ) => void;
  deleteSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: "up" | "down") => void;
  createVideo: (input: VideoInput & { order?: number }) => Promise<void>;
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

type VideoRow = {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
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
const DEFAULT_CATEGORY = "General";

function slugifyCategory(category: string) {
  return category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general";
}

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

function getRoleFromUser(user: User, profile?: ProfileRow | null): UserRole {
  if (
    profile?.role === "admin" ||
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin"
  ) {
    return "admin";
  }

  return "student";
}

function toAcademyUserFromSupabase(user: User, profile?: ProfileRow | null): AcademyUser {
  return {
    id: user.id,
    name: getDisplayNameFromUser(user, profile),
    email: user.email ?? "",
    role: getRoleFromUser(user, profile)
  };
}

function toAcademyVideo(row: VideoRow, commentCount: number, viewCount: number): AcademyVideo {
  const category = row.category?.trim() || DEFAULT_CATEGORY;
  const normalizedVideoUrl = normalizeAcademyVideoUrl(row.video_url ?? "");
  const normalizedThumbnailUrl = normalizeAcademyThumbnailUrl(row.thumbnail_url ?? "");

  return {
    id: row.id,
    sectionId: slugifyCategory(category),
    title: row.title?.trim() || "Untitled tutorial",
    description: row.description?.trim() || "",
    category,
    videoUrl: normalizedVideoUrl,
    thumbnailUrl: normalizedThumbnailUrl,
    resolvedVideoUrl: normalizedVideoUrl,
    resolvedThumbnailUrl: normalizedThumbnailUrl,
    order: row.sort_order ?? 0,
    isVisible: row.is_published ?? false,
    isFeatured: false,
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

function isValidExternalVideoUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function AcademyProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<AcademyUser | null>(null);
  const [videos, setVideos] = useState<AcademyVideo[]>([]);
  const [comments, setComments] = useState<AcademyComment[]>([]);
  const [progress, setProgress] = useState<AcademyProgress[]>([]);

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
    }

    const academyUser = toAcademyUserFromSupabase(user, profile);
    setCurrentUser(academyUser);
    return academyUser;
  }, []);

  const refreshAcademyData = useCallback(async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setVideos([]);
      setComments([]);
      setProgress([]);
      setIsReady(true);
      return;
    }

    setErrorMessage("");

    const { data: videoRows, error: videosError } = await supabase
      .from("academy_videos")
      .select(
        "id, title, description, video_url, thumbnail_url, category, sort_order, is_published, created_by, created_at, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (videosError) {
      setErrorMessage(videosError.message);
      setVideos([]);
      setIsReady(true);
      return;
    }

    const videoIds = (videoRows ?? []).map((video) => video.id);
    let commentRows: CommentRow[] = [];
    let progressRows: ProgressRow[] = [];

    if (videoIds.length > 0) {
      const { data: commentsData } = await supabase
        .from("video_comments")
        .select("id, video_id, user_id, comment, created_at")
        .in("video_id", videoIds)
        .order("created_at", { ascending: false });

      commentRows = (commentsData ?? []) as CommentRow[];

      const { data: progressData } = await supabase
        .from("video_progress")
        .select("id, user_id, video_id, watched, watched_at, progress_seconds")
        .in("video_id", videoIds);

      progressRows = (progressData ?? []) as ProgressRow[];
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

    const mappedComments = commentRows.map((row) => ({
      id: row.id,
      videoId: row.video_id ?? "",
      userId: row.user_id ?? "",
      userName: profileNames.get(row.user_id ?? "") ?? "EV Academy Student",
      commentText: row.comment?.trim() || "",
      isVisible: true,
      createdAt: row.created_at ?? new Date().toISOString()
    }));
    const mappedProgress = progressRows.map(toAcademyProgress);

    setComments(mappedComments);
    setProgress(mappedProgress);
    setVideos(
      ((videoRows ?? []) as VideoRow[]).map((video) =>
        toAcademyVideo(
          video,
          mappedComments.filter((comment) => comment.videoId === video.id).length,
          mappedProgress.filter(
            (item) => item.videoId === video.id && item.watched
          ).length
        )
      )
    );
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
      await refreshAcademyData();
    };

    void boot();

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      void loadCurrentUser(session?.user ?? null).then(() => refreshAcademyData());
    });

    return () => {
      isMounted = false;
      authSubscription?.data.subscription.unsubscribe();
    };
  }, [loadCurrentUser, refreshAcademyData]);

  const sections = useMemo<AcademySection[]>(() => {
    const categories = Array.from(new Set(videos.map((video) => video.category)));

    return categories.map((category, index) => ({
      id: slugifyCategory(category),
      title: category,
      description: `${category} tutorials from EVs Driving Academy.`,
      order: index + 1,
      isVisible: videos.some(
        (video) => video.category === category && video.isVisible
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }, [videos]);

  const computedVideos = useMemo(
    () =>
      [...videos].sort((a, b) => {
        if (a.sectionId === b.sectionId) {
          return a.order - b.order;
        }

        return a.sectionId.localeCompare(b.sectionId);
      }),
    [videos]
  );
  const visibleSections = useMemo(
    () => sections.filter((section) => section.isVisible),
    [sections]
  );
  const visibleVideos = useMemo(
    () => computedVideos.filter((video) => video.isVisible),
    [computedVideos]
  );
  const featuredVideo = useMemo(() => visibleVideos[0] ?? null, [visibleVideos]);

  const analytics = useMemo<AcademyAnalytics>(() => {
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
      totalComments: comments.length,
      mostWatchedVideo,
      topPerformingSection,
      viewsPerVideo: [...computedVideos].sort((a, b) => b.viewCount - a.viewCount),
      recentComments
    };
  }, [comments, computedVideos, progress, sections]);

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

  const createVideo = async (input: VideoInput & { order?: number }) => {
    const supabase = getSupabaseClient();

    if (!supabase || !currentUser) {
      throw new Error("Please log in as an admin before adding videos.");
    }

    if (!isValidExternalVideoUrl(input.videoUrl)) {
      throw new Error("Please enter a valid YouTube, Vimeo, TikTok, or Instagram URL.");
    }

    const { error } = await supabase.from("academy_videos").insert({
      title: input.title.trim(),
      description: input.description.trim(),
      video_url: normalizeAcademyVideoUrl(input.videoUrl),
      thumbnail_url: normalizeAcademyThumbnailUrl(input.thumbnailUrl ?? ""),
      category: input.category.trim() || DEFAULT_CATEGORY,
      sort_order:
        input.order ??
        videos.filter((video) => video.category === input.category).length + 1,
      is_published: input.isVisible,
      created_by: currentUser.id
    });

    if (error) {
      throw new Error(error.message);
    }

    await refreshAcademyData();
  };

  const updateVideo: AcademyContextValue["updateVideo"] = async (videoId, updates) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const payload: Record<string, string | number | boolean | null> = {};

    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
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
      payload.category = updates.category.trim() || DEFAULT_CATEGORY;
    }
    if (updates.order !== undefined) payload.sort_order = updates.order;
    if (updates.isVisible !== undefined) payload.is_published = updates.isVisible;

    const { error } = await supabase
      .from("academy_videos")
      .update(payload)
      .eq("id", videoId);

    if (error) {
      throw new Error(error.message);
    }

    await refreshAcademyData();
  };

  const deleteVideo = async (videoId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.from("academy_videos").delete().eq("id", videoId);

    if (error) {
      throw new Error(error.message);
    }

    await refreshAcademyData();
  };

  const moveVideo = async (videoId: string, direction: "up" | "down") => {
    const video = videos.find((item) => item.id === videoId);

    if (!video) {
      return;
    }

    const nextOrder = direction === "up" ? video.order - 1 : video.order + 1;
    await updateVideo(videoId, { order: Math.max(0, nextOrder) });
  };

  const toggleVideoVisibility = async (videoId: string) => {
    const video = videos.find((item) => item.id === videoId);

    if (video) {
      await updateVideo(videoId, { isVisible: !video.isVisible });
    }
  };

  const addComment = async (videoId: string, commentText: string) => {
    const supabase = getSupabaseClient();

    if (!supabase || !currentUser || !commentText.trim()) {
      return;
    }

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

    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("video_comments").delete().eq("id", commentId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refreshAcademyData();
  };

  const incrementVideoView = async (videoId: string, progressSeconds = 0) => {
    const supabase = getSupabaseClient();

    if (!supabase || !currentUser) {
      return;
    }

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
      createSection: () => undefined,
      updateSection: () => undefined,
      deleteSection: () => undefined,
      moveSection: () => undefined,
      createVideo,
      updateVideo,
      deleteVideo,
      moveVideo,
      moveVideoToSection: async (videoId, sectionId) => {
        const section = sections.find((item) => item.id === sectionId);
        if (section) await updateVideo(videoId, { category: section.title });
      },
      setVideoFeatured: async () => undefined,
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
      progress,
      refreshAcademyData,
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
