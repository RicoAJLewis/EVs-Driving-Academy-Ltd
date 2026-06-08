"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { User } from "@supabase/supabase-js";
import { academyStorageKeys } from "@/lib/academy-auth";
import {
  createAcademyId,
  defaultAcademyComments,
  defaultAcademySections,
  defaultAcademyVideos,
  sortSections
} from "@/lib/academy-data";
import {
  normalizeAcademyThumbnailUrl,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import {
  isAcademyMediaRef,
  readAcademyMediaData,
  saveAcademyMediaData
} from "@/lib/academy-media-storage";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  AcademyAnalytics,
  AcademyComment,
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

type AcademyContextValue = {
  isReady: boolean;
  currentUser: AcademyUser | null;
  sections: AcademySection[];
  videos: AcademyVideo[];
  comments: AcademyComment[];
  visibleSections: AcademySection[];
  visibleVideos: AcademyVideo[];
  featuredVideo: AcademyVideo | null;
  analytics: AcademyAnalytics;
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
  createVideo: (
    input: Omit<
      AcademyVideo,
      "id" | "order" | "createdAt" | "updatedAt" | "viewCount" | "commentCount"
    >
  ) => void;
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
      >
    >
  ) => void;
  deleteVideo: (videoId: string) => void;
  moveVideo: (videoId: string, direction: "up" | "down") => void;
  moveVideoToSection: (videoId: string, sectionId: string) => void;
  setVideoFeatured: (videoId: string) => void;
  toggleVideoVisibility: (videoId: string) => void;
  addComment: (videoId: string, commentText: string) => void;
  deleteOwnComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  toggleCommentVisibility: (commentId: string) => void;
  incrementVideoView: (videoId: string) => void;
  getSectionById: (sectionId: string) => AcademySection | undefined;
  getVideoById: (videoId: string) => AcademyVideo | undefined;
  getVideosForSection: (sectionId: string, visibleOnly?: boolean) => AcademyVideo[];
  getCommentsForVideo: (videoId: string, includeHidden?: boolean) => AcademyComment[];
};

const AcademyContext = createContext<AcademyContextValue | null>(null);

function toSortedVideos(videos: AcademyVideo[]) {
  return [...videos].sort((a, b) => {
    if (a.sectionId === b.sectionId) {
      return a.order - b.order;
    }

    return a.sectionId.localeCompare(b.sectionId);
  });
}

function normalizeSectionOrders(sections: AcademySection[]) {
  return sortSections(sections).map((section, index) => ({
    ...section,
    order: index + 1
  }));
}

function normalizeVideoOrders(videos: AcademyVideo[], sectionId: string) {
  let nextOrder = 1;

  return videos.map((video) => {
    if (video.sectionId !== sectionId) {
      return video;
    }

    return {
      ...video,
      order: nextOrder++
    };
  });
}

function parseStoredValue<T>(value: string | null, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getDisplayNameFromUser(user: User) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return (
    metadataName.trim() ||
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "EV Academy Visitor"
  );
}

function toAcademyUserFromSupabase(user: User): AcademyUser {
  const role = user.user_metadata?.role === "admin" ? "admin" : "visitor";

  return {
    id: user.id,
    name: getDisplayNameFromUser(user),
    email: user.email ?? "",
    role
  };
}

function normalizeStoredVideos(videos: AcademyVideo[]) {
  return Promise.all(
    videos.map(async (video) => {
      let normalizedVideoUrl = normalizeAcademyVideoUrl(video.videoUrl);
      let normalizedThumbnailUrl = normalizeAcademyThumbnailUrl(
        video.thumbnailUrl ?? ""
      );

      if (normalizedVideoUrl.startsWith("data:video/")) {
        const mimeType = normalizedVideoUrl.slice(5, normalizedVideoUrl.indexOf(";"));
        normalizedVideoUrl = await saveAcademyMediaData(
          "video",
          normalizedVideoUrl,
          mimeType || "video/mp4"
        );
      }

      if (normalizedThumbnailUrl.startsWith("data:image/")) {
        const mimeType = normalizedThumbnailUrl.slice(
          5,
          normalizedThumbnailUrl.indexOf(";")
        );
        normalizedThumbnailUrl = await saveAcademyMediaData(
          "thumbnail",
          normalizedThumbnailUrl,
          mimeType || "image/png"
        );
      }

      const resolvedVideoUrl = isAcademyMediaRef(normalizedVideoUrl)
        ? (await readAcademyMediaData(normalizedVideoUrl))?.dataUrl ?? ""
        : normalizedVideoUrl;
      const resolvedThumbnailUrl = isAcademyMediaRef(normalizedThumbnailUrl)
        ? (await readAcademyMediaData(normalizedThumbnailUrl))?.dataUrl ?? ""
        : normalizedThumbnailUrl;

      return {
        ...video,
        videoUrl: normalizedVideoUrl,
        thumbnailUrl: normalizedThumbnailUrl,
        resolvedVideoUrl,
        resolvedThumbnailUrl
      };
    })
  );
}

function stripResolvedVideoFields(videos: AcademyVideo[]) {
  return videos.map(
    ({ resolvedThumbnailUrl, resolvedVideoUrl, ...video }) => video
  );
}

export function AcademyProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AcademyUser | null>(null);
  const [sections, setSections] = useState<AcademySection[]>(defaultAcademySections);
  const [videos, setVideos] = useState<AcademyVideo[]>(defaultAcademyVideos);
  const [comments, setComments] = useState<AcademyComment[]>(defaultAcademyComments);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadAcademyState = async () => {
      const storedData = parseStoredValue<{
        sections: AcademySection[];
        videos: AcademyVideo[];
        comments: AcademyComment[];
      }>(window.localStorage.getItem(academyStorageKeys.data), {
        sections: defaultAcademySections,
        videos: defaultAcademyVideos,
          comments: defaultAcademyComments
        });
      const hydratedVideos = await normalizeStoredVideos(storedData.videos);
      const sessionResult = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };

      if (!isMounted) {
        return;
      }

      setSections(storedData.sections);
      setVideos(hydratedVideos);
      setComments(storedData.comments);
      setCurrentUser(
        sessionResult.data.session?.user
          ? toAcademyUserFromSupabase(sessionResult.data.session.user)
          : null
      );

      setIsReady(true);
    };

    void loadAcademyState();

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setCurrentUser(session?.user ? toAcademyUserFromSupabase(session.user) : null);
    });

    return () => {
      isMounted = false;
      authSubscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(
      academyStorageKeys.data,
      JSON.stringify({
        sections,
        videos: stripResolvedVideoFields(videos),
        comments
      })
    );
  }, [comments, isReady, sections, videos]);

  const computedVideos = useMemo(() => {
    return toSortedVideos(
      videos.map((video) => ({
        ...video,
        commentCount: comments.filter(
          (comment) => comment.videoId === video.id && comment.isVisible
        ).length
      }))
    );
  }, [comments, videos]);

  const sortedSections = useMemo(() => normalizeSectionOrders(sections), [sections]);
  const visibleSections = useMemo(
    () => sortedSections.filter((section) => section.isVisible),
    [sortedSections]
  );
  const visibleVideos = useMemo(
    () => computedVideos.filter((video) => video.isVisible),
    [computedVideos]
  );
  const featuredVideo = useMemo(
    () => visibleVideos.find((video) => video.isFeatured) ?? visibleVideos[0] ?? null,
    [visibleVideos]
  );

  const analytics = useMemo<AcademyAnalytics>(() => {
    const totalViews = computedVideos.reduce((sum, video) => sum + video.viewCount, 0);
    const totalComments = comments.filter((comment) => comment.isVisible).length;
    const mostWatchedVideo =
      [...computedVideos].sort((a, b) => b.viewCount - a.viewCount)[0] ?? null;

    const topPerformingSection =
      [...sortedSections]
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
      totalComments,
      mostWatchedVideo,
      topPerformingSection,
      viewsPerVideo: [...computedVideos].sort((a, b) => b.viewCount - a.viewCount),
      recentComments
    };
  }, [comments, computedVideos, sortedSections]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error:
          "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error || !data.user) {
      const errorMessage = error?.message ?? "Invalid email or password.";
      const invalidCredentials = errorMessage
        .toLowerCase()
        .includes("invalid login credentials");

      return {
        success: false,
        error: invalidCredentials
          ? "Invalid login credentials. Please make sure this account was created through the new visitor account system."
          : errorMessage
      };
    }

    const publicUser = toAcademyUserFromSupabase(data.user);
    setCurrentUser(publicUser);

    return { success: true, user: publicUser };
  };

  const registerVisitor = (
    name: string,
    email: string,
    password: string
  ): Promise<RegisterResult> => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return Promise.resolve({
        success: false,
        error:
          "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    return supabase.auth
      .signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/academy/login`
              : undefined,
          data: {
            name: name.trim() || "EV Academy Visitor",
            role: "visitor"
          }
        }
      })
      .then(({ data, error }) => {
        if (error || !data.user) {
          return {
            success: false,
            error: error?.message ?? "Unable to create account."
          };
        }

        if (!data.session) {
          return {
            success: true,
            emailConfirmationRequired: true
          };
        }

        const publicUser = toAcademyUserFromSupabase(data.user);
        setCurrentUser(publicUser);
        return {
          success: true,
          user: publicUser
        };
      });
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

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  };

  const logout = async () => {
    const supabase = getSupabaseClient();

    if (supabase) {
      await supabase.auth.signOut();
    }

    setCurrentUser(null);
  };

  const createSection = (title: string, description: string) => {
    const nextTimestamp = new Date().toISOString();
    const nextSection: AcademySection = {
      id: createAcademyId("section"),
      title,
      description,
      order: sections.length + 1,
      isVisible: true,
      createdAt: nextTimestamp,
      updatedAt: nextTimestamp
    };

    setSections((prevSections) => normalizeSectionOrders([...prevSections, nextSection]));
  };

  const updateSection = (
    sectionId: string,
    updates: Partial<Pick<AcademySection, "title" | "description" | "isVisible">>
  ) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          : section
      )
    );
  };

  const deleteSection = (sectionId: string) => {
    const videoIdsInSection = videos
      .filter((video) => video.sectionId === sectionId)
      .map((video) => video.id);

    setSections((prevSections) =>
      normalizeSectionOrders(prevSections.filter((section) => section.id !== sectionId))
    );
    setVideos((prevVideos) =>
      prevVideos.filter((video) => video.sectionId !== sectionId)
    );
    setComments((prevComments) =>
      prevComments.filter((comment) => !videoIdsInSection.includes(comment.videoId))
    );
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((prevSections) => {
      const orderedSections = normalizeSectionOrders(prevSections);
      const currentIndex = orderedSections.findIndex(
        (section) => section.id === sectionId
      );
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= orderedSections.length
      ) {
        return prevSections;
      }

      const nextSections = [...orderedSections];
      [nextSections[currentIndex], nextSections[targetIndex]] = [
        nextSections[targetIndex],
        nextSections[currentIndex]
      ];

      return normalizeSectionOrders(nextSections);
    });
  };

  const createVideo: AcademyContextValue["createVideo"] = (input) => {
    const timestamp = new Date().toISOString();
    const normalizedVideoUrl = normalizeAcademyVideoUrl(input.videoUrl);
    const normalizedThumbnailUrl = normalizeAcademyThumbnailUrl(
      input.thumbnailUrl ?? ""
    );
    const nextVideo: AcademyVideo = {
      ...input,
      videoUrl: normalizedVideoUrl,
      thumbnailUrl: normalizedThumbnailUrl,
      resolvedVideoUrl: input.resolvedVideoUrl ?? normalizedVideoUrl,
      resolvedThumbnailUrl: input.resolvedThumbnailUrl ?? normalizedThumbnailUrl,
      id: createAcademyId("video"),
      order:
        videos.filter((video) => video.sectionId === input.sectionId).length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      viewCount: 0,
      commentCount: 0
    };

    setVideos((prevVideos) => {
      let nextVideos = [...prevVideos];

      if (input.isFeatured) {
        nextVideos = nextVideos.map((video) => ({ ...video, isFeatured: false }));
      }

      return toSortedVideos([...nextVideos, nextVideo]);
    });
  };

  const updateVideo: AcademyContextValue["updateVideo"] = (videoId, updates) => {
    const currentVideo = videos.find((video) => video.id === videoId);

    if (!currentVideo) {
      return;
    }

    setVideos((prevVideos) => {
      let nextVideos = prevVideos.map((video) =>
        video.id === videoId
          ? {
              ...video,
              ...updates,
              videoUrl:
                updates.videoUrl !== undefined
                  ? normalizeAcademyVideoUrl(updates.videoUrl)
                  : video.videoUrl,
              thumbnailUrl:
                updates.thumbnailUrl !== undefined
                  ? normalizeAcademyThumbnailUrl(updates.thumbnailUrl)
                  : video.thumbnailUrl,
              resolvedVideoUrl:
                updates.resolvedVideoUrl !== undefined
                  ? updates.resolvedVideoUrl
                  : updates.videoUrl !== undefined
                    ? normalizeAcademyVideoUrl(updates.videoUrl)
                    : video.resolvedVideoUrl ?? video.videoUrl,
              resolvedThumbnailUrl:
                updates.resolvedThumbnailUrl !== undefined
                  ? updates.resolvedThumbnailUrl
                  : updates.thumbnailUrl !== undefined
                    ? normalizeAcademyThumbnailUrl(updates.thumbnailUrl)
                    : video.resolvedThumbnailUrl ?? video.thumbnailUrl,
              updatedAt: new Date().toISOString()
            }
          : updates.isFeatured
            ? { ...video, isFeatured: false }
            : video
      );

      const originalSectionId = currentVideo.sectionId;
      const targetSectionId = updates.sectionId ?? originalSectionId;

      nextVideos = normalizeVideoOrders(nextVideos, originalSectionId);
      if (targetSectionId !== originalSectionId) {
        const maxOrder = nextVideos
          .filter((video) => video.sectionId === targetSectionId)
          .reduce((max, video) => Math.max(max, video.order), 0);

        nextVideos = nextVideos.map((video) =>
          video.id === videoId
            ? {
                ...video,
                order: maxOrder + 1
              }
            : video
        );
        nextVideos = normalizeVideoOrders(nextVideos, targetSectionId);
      }

      return toSortedVideos(nextVideos);
    });
  };

  const deleteVideo = (videoId: string) => {
    const targetVideo = videos.find((video) => video.id === videoId);

    if (!targetVideo) {
      return;
    }

    setVideos((prevVideos) =>
      normalizeVideoOrders(
        prevVideos.filter((video) => video.id !== videoId),
        targetVideo.sectionId
      )
    );
    setComments((prevComments) =>
      prevComments.filter((comment) => comment.videoId !== videoId)
    );
  };

  const moveVideo = (videoId: string, direction: "up" | "down") => {
    const targetVideo = videos.find((video) => video.id === videoId);

    if (!targetVideo) {
      return;
    }

    setVideos((prevVideos) => {
      const sectionVideos = prevVideos
        .filter((video) => video.sectionId === targetVideo.sectionId)
        .sort((a, b) => a.order - b.order);
      const currentIndex = sectionVideos.findIndex((video) => video.id === videoId);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= sectionVideos.length
      ) {
        return prevVideos;
      }

      const reorderedSectionVideos = [...sectionVideos];
      [reorderedSectionVideos[currentIndex], reorderedSectionVideos[targetIndex]] = [
        reorderedSectionVideos[targetIndex],
        reorderedSectionVideos[currentIndex]
      ];

      const reorderedMap = new Map(
        reorderedSectionVideos.map((video, index) => [
          video.id,
          { ...video, order: index + 1 }
        ])
      );

      return toSortedVideos(
        prevVideos.map((video) => reorderedMap.get(video.id) ?? video)
      );
    });
  };

  const moveVideoToSection = (videoId: string, sectionId: string) => {
    updateVideo(videoId, { sectionId });
  };

  const setVideoFeatured = (videoId: string) => {
    setVideos((prevVideos) =>
      prevVideos.map((video) => ({
        ...video,
        isFeatured: video.id === videoId,
        updatedAt: video.id === videoId ? new Date().toISOString() : video.updatedAt
      }))
    );
  };

  const toggleVideoVisibility = (videoId: string) => {
    setVideos((prevVideos) =>
      prevVideos.map((video) =>
        video.id === videoId
          ? {
              ...video,
              isVisible: !video.isVisible,
              updatedAt: new Date().toISOString()
            }
          : video
      )
    );
  };

  const addComment = (videoId: string, commentText: string) => {
    if (!currentUser || !commentText.trim()) {
      return;
    }

    const nextComment: AcademyComment = {
      id: createAcademyId("comment"),
      videoId,
      userId: currentUser.id,
      userName: currentUser.name,
      commentText: commentText.trim(),
      isVisible: true,
      createdAt: new Date().toISOString()
    };

    setComments((prevComments) => [nextComment, ...prevComments]);
  };

  const deleteOwnComment = (commentId: string) => {
    if (!currentUser) {
      return;
    }

    setComments((prevComments) =>
      prevComments.filter(
        (comment) =>
          !(comment.id === commentId && comment.userId === currentUser.id)
      )
    );
  };

  const deleteComment = (commentId: string) => {
    setComments((prevComments) =>
      prevComments.filter((comment) => comment.id !== commentId)
    );
  };

  const toggleCommentVisibility = (commentId: string) => {
    setComments((prevComments) =>
      prevComments.map((comment) =>
        comment.id === commentId
          ? { ...comment, isVisible: !comment.isVisible }
          : comment
      )
    );
  };

  const incrementVideoView = (videoId: string) => {
    setVideos((prevVideos) =>
      prevVideos.map((video) =>
        video.id === videoId
          ? { ...video, viewCount: video.viewCount + 1 }
          : video
      )
    );
  };

  const getSectionById = (sectionId: string) =>
    sortedSections.find((section) => section.id === sectionId);

  const getVideoById = (videoId: string) =>
    computedVideos.find((video) => video.id === videoId);

  const getVideosForSection = (sectionId: string, visibleOnly = false) =>
    (visibleOnly ? visibleVideos : computedVideos).filter(
      (video) => video.sectionId === sectionId
    );

  const getCommentsForVideo = (videoId: string, includeHidden = false) =>
    comments
      .filter(
        (comment) =>
          comment.videoId === videoId && (includeHidden || comment.isVisible)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

  const value = useMemo<AcademyContextValue>(
    () => ({
      isReady,
      currentUser,
      sections: sortedSections,
      videos: computedVideos,
      comments,
      visibleSections,
      visibleVideos,
      featuredVideo,
      analytics,
      login,
      registerVisitor,
      requestPasswordReset,
      logout,
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
      deleteOwnComment,
      deleteComment,
      toggleCommentVisibility,
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
      featuredVideo,
      isReady,
      sections,
      sortedSections,
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
