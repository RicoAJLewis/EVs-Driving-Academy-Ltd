"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  detectAcademyVideoPlatform,
  getAcademyThumbnailUrl,
  getAcademyVideoPlatformLabel
} from "@/lib/academy-media";
import {
  formatAdminSenderLabel,
  isAdminRole,
  isOwnerRole
} from "@/lib/academy-roles";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  AcademySection,
  AcademyVideo,
  ChatMessage,
  ChatThread,
  UserRole
} from "@/types/academy";
import {
  SkeletonAdminRows,
  SkeletonMessageBubble,
  SkeletonMessageThread
} from "@/components/ui/Skeleton";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { AcademyProtected } from "./AcademyProtected";
import { useAcademy } from "./AcademyProvider";
import { AcademyVideoPlayer } from "./AcademyVideoPlayer";

type AdminTab =
  | "overview"
  | "admins"
  | "sections"
  | "videos"
  | "reviews"
  | "messages"
  | "comments"
  | "analytics";
type Feedback = {
  tone: "success" | "error";
  message: string;
};

type AdminReviewRow = {
  id: string;
  user_id: string | null;
  reviewer_name: string | null;
  rating: number | null;
  comment: string | null;
  source: string | null;
  is_published: boolean | null;
  created_at: string | null;
};

type AdminChatThreadRow = {
  id: string;
  student_id: string;
  admin_id: string | null;
  student_name: string | null;
  student_email: string | null;
  status: "open" | "archived";
  last_message: string | null;
  last_message_at: string | null;
  student_unread_count: number | null;
  admin_unread_count: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_by_admin_at: string | null;
};

type AdminChatMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  receiver_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};

type AdminManagedProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole | null;
  created_at: string | null;
};

type ChatSenderProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole | null;
};

type AdminUnreadThreadRow = {
  admin_unread_count: number | null;
};

type MessageFilter = "all" | "unread" | "archived";
type AdminRoleFilter = "all" | "student" | "admin" | "owner";

type SupabaseErrorDetails = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "admins", label: "Admins" },
  { id: "sections", label: "Sections" },
  { id: "videos", label: "Videos / Playlists" },
  { id: "reviews", label: "Reviews" },
  { id: "messages", label: "Messages" },
  { id: "comments", label: "Comments" },
  { id: "analytics", label: "Analytics" }
];

const emptyVideoForm = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  category: "Beginner Lessons",
  sectionId: "",
  sortOrder: 0,
  isPublished: true,
  isFeatured: false
};
const UNCATEGORIZED_SECTION_ID = "uncategorized";

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

type ThumbnailResolveResponse = {
  thumbnailUrl?: string;
  message?: string;
  platformLabel?: string;
};

async function resolveAcademyThumbnailFromVideoUrl(videoUrl: string) {
  const trimmedUrl = videoUrl.trim();

  if (!isValidUrl(trimmedUrl)) {
    return { thumbnailUrl: "", message: "Add a valid video URL first." };
  }

  const localThumbnail = getAcademyThumbnailUrl(trimmedUrl);

  if (localThumbnail) {
    return {
      thumbnailUrl: localThumbnail,
      message: "Thumbnail resolved from the video platform."
    };
  }

  try {
    const response = await fetch("/api/academy/resolve-thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: trimmedUrl })
    });
    const result = (await response.json()) as ThumbnailResolveResponse;

    if (!response.ok) {
      return {
        thumbnailUrl: "",
        message: result.message || "Unable to resolve a thumbnail for this URL."
      };
    }

    return {
      thumbnailUrl: result.thumbnailUrl?.trim() || "",
      message:
        result.message ||
        (result.thumbnailUrl
          ? "Thumbnail resolved from the video platform."
          : "No platform thumbnail was returned.")
    };
  } catch (error) {
    return {
      thumbnailUrl: "",
      message:
        error instanceof Error
          ? `Thumbnail lookup failed: ${error.message}`
          : "Thumbnail lookup failed."
    };
  }
}

function getSectionOptionLabel(section: AcademySection) {
  return section.isVisible ? section.title : `${section.title} (unpublished)`;
}

function formatSupabaseAdminError(error: SupabaseErrorDetails | null | undefined) {
  if (!error) {
    return "Supabase action failed.";
  }

  return [
    error.message,
    error.code ? `Code: ${error.code}` : "",
    error.details ? `Details: ${error.details}` : "",
    error.hint ? `Hint: ${error.hint}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function mapAdminChatThread(row: AdminChatThreadRow): ChatThread {
  return {
    id: row.id,
    studentId: row.student_id,
    adminId: row.admin_id,
    studentName: row.student_name || "EV Academy Student",
    studentEmail: row.student_email || "",
    status: row.status,
    lastMessage: row.last_message || "",
    lastMessageAt: row.last_message_at,
    studentUnreadCount: row.student_unread_count ?? 0,
    adminUnreadCount: row.admin_unread_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedByAdminAt: row.deleted_by_admin_at
  };
}

function mapAdminChatMessage(
  row: AdminChatMessageRow,
  profileById: Map<string, ChatSenderProfileRow> = new Map()
): ChatMessage {
  const senderProfile = profileById.get(row.sender_id);
  const senderLabel = isAdminRole(senderProfile?.role)
    ? formatAdminSenderLabel(senderProfile?.full_name)
    : senderProfile?.full_name || "EV Academy Student";

  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    senderName: senderProfile?.full_name ?? undefined,
    senderRole: senderProfile?.role ?? null,
    senderLabel
  };
}

function getAdminUnreadMessageTotal(threads: ChatThread[]) {
  return threads.reduce((total, thread) => {
    if (thread.status === "archived" || thread.deletedByAdminAt) {
      return total;
    }

    return total + Math.max(0, thread.adminUnreadCount);
  }, 0);
}

function getUnreadBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function formatMessageTime(value: string | null) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function logAdminMessageDiagnostic({
  step,
  error,
  currentUser,
  payload
}: {
  step: string;
  error: unknown;
  currentUser: ReturnType<typeof useAcademy>["currentUser"];
  payload?: Record<string, unknown> | null;
}) {
  const supabaseError = error as SupabaseErrorDetails | null;

  console.error("EV Academy admin messages failure", {
    step,
    message:
      supabaseError?.message ||
      (error instanceof Error ? error.message : "Unknown messages error"),
    code: supabaseError?.code ?? null,
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
    currentUser: currentUser
      ? {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          profileRole: currentUser.profileRole ?? null
        }
      : null,
    payload: payload ?? null
  });
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderRadius: "1rem",
        border:
          feedback.tone === "success"
            ? "1px solid rgba(74,222,128,0.28)"
            : "1px solid rgba(248,113,113,0.28)",
        background:
          feedback.tone === "success"
            ? "rgba(34,197,94,0.12)"
            : "rgba(239,68,68,0.12)",
        color: feedback.tone === "success" ? "#dcfce7" : "#fee2e2",
        padding: "0.9rem 1rem",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap"
      }}
    >
      {feedback.message}
    </div>
  );
}

function VideoPreview({
  title,
  videoUrl,
  thumbnailUrl
}: {
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
}) {
  const platform = detectAcademyVideoPlatform(videoUrl);
  const platformLabel = getAcademyVideoPlatformLabel(platform);

  return (
    <div style={previewPanelStyle}>
      <span style={previewLabelStyle}>Live preview</span>
      <AcademyVideoPlayer
        title={title || "Academy tutorial"}
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        variant="preview"
      />
      {thumbnailUrl.trim() ? (
        <div
          style={{
            display: "grid",
            gap: "0.45rem",
            borderRadius: "0.9rem",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(8,17,29,0.34)",
            padding: "0.75rem"
          }}
        >
          <span style={{ color: "rgba(239,246,255,0.72)", fontSize: "0.85rem" }}>
            Saved card thumbnail
          </span>
          <div
            aria-hidden="true"
            style={{
              minHeight: platform === "tiktok" || platform === "instagram" ? "180px" : "130px",
              borderRadius: "0.8rem",
              backgroundImage: `linear-gradient(180deg, rgba(8,17,29,0.05), rgba(8,17,29,0.58)), url('${thumbnailUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
        </div>
      ) : null}
      <p style={{ margin: 0, color: "rgba(239,246,255,0.68)", lineHeight: 1.6 }}>
        External videos are saved as links only. Detected platform:{" "}
        <strong style={{ color: "#eff6ff" }}>{platformLabel}</strong>.
        TikTok and Instagram previews use a vertical layout and may need to open
        externally if the platform blocks inline playback.
      </p>
      {platform === "tiktok" ? (
        <>
          {!thumbnailUrl.trim() ? (
            <p style={{ margin: 0, color: "#ffe7ae", lineHeight: 1.6 }}>
              When this TikTok link is saved, EV Academy will try to pull the
              exact TikTok poster from TikTok oEmbed and store it as this
              video&apos;s thumbnail. If TikTok does not return one, paste a
              Thumbnail URL manually.
            </p>
          ) : null}
          <p style={{ margin: 0, color: "#ffe7ae", lineHeight: 1.6 }}>
            TikTok embeds may include platform controls or branding. For a fully
            native EV Academy player with skip, mute, and custom controls, use a
            direct playback URL from a video hosting service.
          </p>
        </>
      ) : null}
    </div>
  );
}

function getVideoPublicStatus(video: AcademyVideo, sections: AcademySection[]) {
  const section = sections.find((item) => item.id === video.sectionId);
  const reasons: string[] = [];

  if (!video.isVisible) {
    reasons.push("video unpublished");
  }

  if (!section) {
    if (video.sectionId !== UNCATEGORIZED_SECTION_ID) {
      reasons.push("missing section");
    }
  } else if (!section.isVisible) {
    reasons.push("section unpublished");
  }

  if (!isValidUrl(video.videoUrl)) {
    reasons.push("invalid video URL");
  }

  return {
    isPublic: reasons.length === 0,
    sectionName:
      section?.title ??
      (video.sectionId === UNCATEGORIZED_SECTION_ID
        ? "Uncategorized"
        : "Missing section"),
    reasons
  };
}

function SectionEditor({
  section,
  onSave,
  onDelete,
  onMove
}: {
  section: AcademySection;
  onSave: (
    sectionId: string,
    updates: Partial<Pick<AcademySection, "title" | "description" | "isVisible" | "order">>
  ) => Promise<void>;
  onDelete: (sectionId: string) => Promise<void>;
  onMove: (sectionId: string, direction: "up" | "down") => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: section.title,
    description: section.description,
    sortOrder: section.order,
    isPublished: section.isVisible
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.title.trim()) {
      setFeedback({ tone: "error", message: "Section title is required." });
      return;
    }

    try {
      await onSave(section.id, {
        title: draft.title,
        description: draft.description,
        order: Number(draft.sortOrder) || 0,
        isVisible: draft.isPublished
      });
      setFeedback({ tone: "success", message: "Section updated." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to update section."
      });
    }
  };

  return (
    <article style={cardStyle}>
      <form onSubmit={handleSave} style={{ display: "grid", gap: "1rem" }}>
        <div className="academy-form-grid academy-form-grid-3">
          <label style={fieldStyle}>
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>Sort order</span>
            <input
              type="number"
              value={draft.sortOrder}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value)
                }))
              }
              style={inputStyle}
            />
          </label>
          <label style={{ ...fieldStyle, justifyContent: "end" }}>
            <span>Visibility</span>
            <label style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isPublished: event.target.checked
                  }))
                }
              />
              Published
            </label>
          </label>
        </div>
        <label style={fieldStyle}>
          <span>Description</span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value
              }))
            }
            style={textareaStyle}
          />
        </label>
        {feedback ? <FeedbackBanner feedback={feedback} /> : null}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="submit" style={secondaryButtonStyle}>
            Save Section
          </button>
          <button type="button" onClick={() => onMove(section.id, "up")} style={secondaryButtonStyle}>
            Move Up
          </button>
          <button type="button" onClick={() => onMove(section.id, "down")} style={secondaryButtonStyle}>
            Move Down
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this section? Videos in this section will be unassigned.")) {
                void onDelete(section.id);
              }
            }}
            style={dangerButtonStyle}
          >
            Delete
          </button>
        </div>
      </form>
    </article>
  );
}

function VideoEditor({
  video,
  sections,
  onSave,
  onDelete,
  onTogglePublish,
  onSetFeatured,
  onMove
}: {
  video: AcademyVideo;
  sections: AcademySection[];
  onSave: (
    videoId: string,
    updates: Partial<
      Pick<
        AcademyVideo,
        | "sectionId"
        | "title"
        | "description"
        | "videoUrl"
        | "thumbnailUrl"
        | "category"
        | "order"
      >
    >
  ) => Promise<void>;
  onDelete: (videoId: string) => Promise<void>;
  onTogglePublish: (videoId: string) => Promise<void>;
  onSetFeatured: (videoId: string) => Promise<void>;
  onMove: (videoId: string, direction: "up" | "down") => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl ?? "",
    category: video.category,
    sectionId: video.sectionId,
    sortOrder: video.order
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResolvingThumbnail, setIsResolvingThumbnail] = useState(false);
  const publicStatus = getVideoPublicStatus(video, sections);

  const fillDraftThumbnail = async () => {
    if (draft.thumbnailUrl.trim()) {
      setFeedback({
        tone: "success",
        message: "This video already has a thumbnail URL."
      });
      return;
    }

    setIsResolvingThumbnail(true);
    const result = await resolveAcademyThumbnailFromVideoUrl(draft.videoUrl);
    setIsResolvingThumbnail(false);

    if (result.thumbnailUrl) {
      setDraft((current) => ({ ...current, thumbnailUrl: result.thumbnailUrl }));
      setFeedback({
        tone: "success",
        message: "Thumbnail fetched from the video platform."
      });
      return;
    }

    setFeedback({
      tone: "error",
      message:
        result.message ||
        "No automatic thumbnail was returned. You can still paste a thumbnail URL manually."
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!draft.title.trim() || !isValidUrl(draft.videoUrl)) {
      setFeedback({
        tone: "error",
        message: "Please add a title and a valid external video URL."
      });
      return;
    }

    setIsSaving(true);

    try {
      const selectedSection = sections.find((section) => section.id === draft.sectionId);
      const resolvedThumbnail = draft.thumbnailUrl.trim()
        ? draft.thumbnailUrl.trim()
        : (await resolveAcademyThumbnailFromVideoUrl(draft.videoUrl)).thumbnailUrl;

      await onSave(video.id, {
        title: draft.title,
        description: draft.description,
        videoUrl: draft.videoUrl,
        thumbnailUrl: resolvedThumbnail,
        category: draft.category || selectedSection?.title || "General",
        sectionId: draft.sectionId,
        order: Number(draft.sortOrder) || 0
      });
      if (resolvedThumbnail && !draft.thumbnailUrl.trim()) {
        setDraft((current) => ({ ...current, thumbnailUrl: resolvedThumbnail }));
      }
      setFeedback({ tone: "success", message: "Video updated successfully." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to update video."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article style={cardStyle}>
      <form onSubmit={handleSave} style={{ display: "grid", gap: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center"
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#eff6ff", fontSize: "1.2rem" }}>
              {video.title}
            </h3>
            <div
              style={{
                marginTop: "0.6rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap"
              }}
            >
              <span style={statusPillStyle}>
                {video.isVisible ? "Published" : "Unpublished"}
              </span>
              <span style={statusPillStyle}>Section: {publicStatus.sectionName}</span>
              <span style={statusPillStyle}>
                {video.isFeatured ? "Featured" : "Not featured"}
              </span>
              <span
                style={{
                  ...statusPillStyle,
                  border: publicStatus.isPublic
                    ? "1px solid rgba(74,222,128,0.32)"
                    : "1px solid rgba(248,113,113,0.34)",
                  color: publicStatus.isPublic ? "#dcfce7" : "#fecaca"
                }}
              >
                Publicly visible: {publicStatus.isPublic ? "Yes" : "No"}
              </span>
            </div>
            {!publicStatus.isPublic ? (
              <p style={{ margin: "0.55rem 0 0", color: "#fecaca", lineHeight: 1.6 }}>
                Hidden because: {publicStatus.reasons.join(", ")}
              </p>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => onMove(video.id, "up")} style={secondaryButtonStyle}>
              Move Up
            </button>
            <button type="button" onClick={() => onMove(video.id, "down")} style={secondaryButtonStyle}>
              Move Down
            </button>
            <button type="button" onClick={() => onSetFeatured(video.id)} style={secondaryButtonStyle}>
              {video.isFeatured ? "Remove Featured" : "Set Featured"}
            </button>
            <button type="button" onClick={() => onTogglePublish(video.id)} style={secondaryButtonStyle}>
              {video.isVisible ? "Unpublish" : "Publish"}
            </button>
            <button type="submit" style={secondaryButtonStyle} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this video record? This cannot be undone.")) {
                  void onDelete(video.id);
                }
              }}
              style={dangerButtonStyle}
            >
              Delete
            </button>
          </div>
        </div>

        {feedback ? <FeedbackBanner feedback={feedback} /> : null}

        <div className="academy-form-grid academy-form-grid-3">
          <label style={fieldStyle}>
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>Section</span>
            <select
              value={draft.sectionId}
              onChange={(event) => {
                const selectedSection = sections.find(
                  (section) => section.id === event.target.value
                );

                setDraft((current) => ({
                  ...current,
                  sectionId: event.target.value,
                  category: selectedSection?.title ?? current.category
                }));
              }}
              style={inputStyle}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {getSectionOptionLabel(section)}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Sort order</span>
            <input
              type="number"
              value={draft.sortOrder}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value)
                }))
              }
              style={inputStyle}
            />
          </label>
        </div>

        <div className="academy-form-grid">
          <label style={fieldStyle}>
            <span>Video URL / embed link</span>
            <input
              value={draft.videoUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, videoUrl: event.target.value }))
              }
              onBlur={() => {
                if (!draft.thumbnailUrl.trim() && isValidUrl(draft.videoUrl)) {
                  void fillDraftThumbnail();
                }
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>Thumbnail URL</span>
            <input
              value={draft.thumbnailUrl}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  thumbnailUrl: event.target.value
                }))
              }
              placeholder="Optional thumbnail image URL"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => void fillDraftThumbnail()}
              disabled={isResolvingThumbnail || !isValidUrl(draft.videoUrl)}
              style={{
                ...secondaryButtonStyle,
                justifySelf: "start",
                opacity:
                  isResolvingThumbnail || !isValidUrl(draft.videoUrl) ? 0.58 : 1
              }}
            >
              {isResolvingThumbnail ? "Fetching..." : "Fetch platform thumbnail"}
            </button>
          </label>
        </div>

        <label style={fieldStyle}>
          <span>Description</span>
          <textarea
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value
              }))
            }
            rows={4}
            style={textareaStyle}
          />
        </label>

        <VideoPreview
          title={draft.title}
          videoUrl={draft.videoUrl}
          thumbnailUrl={draft.thumbnailUrl}
        />
      </form>
    </article>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const {
    analytics,
    comments,
    createSection,
    createVideo,
    currentUser,
    deleteComment,
    deleteSection,
    deleteVideo,
    errorMessage,
    featuredVideo,
    isReady,
    logout,
    moveSection,
    moveVideo,
    sections,
    setVideoFeatured,
    toggleVideoVisibility,
    updateSection,
    updateVideo,
    videos
  } = useAcademy();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [newVideo, setNewVideo] = useState(emptyVideoForm);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isResolvingNewThumbnail, setIsResolvingNewThumbnail] = useState(false);
  const [reviewRows, setReviewRows] = useState<AdminReviewRow[]>([]);
  const [reviewsFeedback, setReviewsFeedback] = useState<Feedback | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [messageThreads, setMessageThreads] = useState<ChatThread[]>([]);
  const [selectedMessageThreadId, setSelectedMessageThreadId] = useState("");
  const [messageRows, setMessageRows] = useState<ChatMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [messageSearch, setMessageSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messagesFeedback, setMessagesFeedback] = useState<Feedback | null>(null);
  const [isLoadingMessageThreads, setIsLoadingMessageThreads] = useState(false);
  const [isLoadingMessageRows, setIsLoadingMessageRows] = useState(false);
  const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false);
  const [adminUnreadMessageCount, setAdminUnreadMessageCount] = useState(0);
  const [adminProfileRows, setAdminProfileRows] = useState<AdminManagedProfileRow[]>([]);
  const [adminProfilesFeedback, setAdminProfilesFeedback] =
    useState<Feedback | null>(null);
  const [isLoadingAdminProfiles, setIsLoadingAdminProfiles] = useState(false);
  const [adminProfileSearch, setAdminProfileSearch] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] =
    useState<AdminRoleFilter>("all");
  const [mutatingProfileId, setMutatingProfileId] = useState<string | null>(null);

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.order - b.order),
    [videos]
  );
  const filteredMessageThreads = useMemo(() => {
    const normalizedSearch = messageSearch.trim().toLowerCase();

    return messageThreads.filter((thread) => {
      const matchesFilter =
        messageFilter === "all"
          ? thread.status !== "archived"
          : messageFilter === "unread"
            ? thread.status !== "archived" && thread.adminUnreadCount > 0
            : thread.status === "archived";

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return `${thread.studentName} ${thread.studentEmail}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [messageFilter, messageSearch, messageThreads]);
  const selectedMessageThread =
    messageThreads.find((thread) => thread.id === selectedMessageThreadId) ??
    filteredMessageThreads[0] ??
    null;
  const adminUnreadBadgeLabel = getUnreadBadgeLabel(adminUnreadMessageCount);
  const filteredAdminProfiles = useMemo(() => {
    const normalizedSearch = adminProfileSearch.trim().toLowerCase();

    return adminProfileRows.filter((profile) => {
      const role = profile.role ?? "student";
      const matchesRole =
        adminRoleFilter === "all"
          ? true
          : adminRoleFilter === "admin"
            ? role === "admin"
            : role === adminRoleFilter;

      if (!matchesRole) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return `${profile.full_name ?? ""} ${profile.email ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [adminProfileRows, adminProfileSearch, adminRoleFilter]);

  useEffect(() => {
    setNewVideo((current) => {
      if (sections.length === 0) {
        return current.sectionId ? { ...current, sectionId: "" } : current;
      }

      const selectedSectionStillExists = sections.some(
        (section) => section.id === current.sectionId
      );

      if (selectedSectionStillExists) {
        return current;
      }

      const firstSection = sections[0];

      return {
        ...current,
        sectionId: firstSection.id,
        category: firstSection.title
      };
    });
  }, [sections]);

  const loadAdminReviews = async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setReviewsFeedback({
        tone: "error",
        message: "Supabase is not configured for review moderation."
      });
      return;
    }

    setIsLoadingReviews(true);
    setReviewsFeedback(null);

    const { data, error } = await supabase
      .from("reviews")
      .select(
        "id, user_id, reviewer_name, rating, comment, source, is_published, created_at"
      )
      .order("created_at", { ascending: false });

    setIsLoadingReviews(false);

    if (error) {
      console.error("EV Academy admin reviews load failed", {
        table: "reviews",
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        currentUser: currentUser
          ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
          : null
      });
      setReviewsFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
      return;
    }

    setReviewRows((data ?? []) as AdminReviewRow[]);
  };

  useEffect(() => {
    if (activeTab === "reviews") {
      void loadAdminReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadAdminProfiles = async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setAdminProfilesFeedback({
        tone: "error",
        message: "Supabase is not configured for profile management."
      });
      return;
    }

    setIsLoadingAdminProfiles(true);
    setAdminProfilesFeedback(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false });

    setIsLoadingAdminProfiles(false);

    if (error) {
      console.error("EV Academy admin profile load failed", {
        table: "profiles",
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        currentUser: currentUser
          ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
          : null
      });
      setAdminProfilesFeedback({
        tone: "error",
        message: formatSupabaseAdminError(error)
      });
      return;
    }

    setAdminProfileRows((data ?? []) as AdminManagedProfileRow[]);
  };

  useEffect(() => {
    if (activeTab === "admins") {
      void loadAdminProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const promoteProfileToAdmin = async (profile: AdminManagedProfileRow) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setAdminProfilesFeedback({
        tone: "error",
        message: "Supabase is not configured for profile management."
      });
      return;
    }

    const label = profile.full_name || profile.email || "this student";
    if (!window.confirm(`Promote ${label} to admin?`)) {
      return;
    }

    setMutatingProfileId(profile.id);
    setAdminProfilesFeedback(null);

    const { error } = await supabase.rpc("promote_user_to_admin", {
      target_user_id: profile.id
    });

    setMutatingProfileId(null);

    if (error) {
      setAdminProfilesFeedback({
        tone: "error",
        message: formatSupabaseAdminError(error)
      });
      return;
    }

    setAdminProfilesFeedback({
      tone: "success",
      message: `${label} is now an admin.`
    });
    await loadAdminProfiles();
  };

  const demoteAdminToStudent = async (profile: AdminManagedProfileRow) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setAdminProfilesFeedback({
        tone: "error",
        message: "Supabase is not configured for profile management."
      });
      return;
    }

    const label = profile.full_name || profile.email || "this admin";
    if (!window.confirm(`Demote ${label} back to student?`)) {
      return;
    }

    setMutatingProfileId(profile.id);
    setAdminProfilesFeedback(null);

    const { error } = await supabase.rpc("demote_admin_to_student", {
      target_user_id: profile.id
    });

    setMutatingProfileId(null);

    if (error) {
      setAdminProfilesFeedback({
        tone: "error",
        message: formatSupabaseAdminError(error)
      });
      return;
    }

    setAdminProfilesFeedback({
      tone: "success",
      message: `${label} is now a student.`
    });
    await loadAdminProfiles();
  };

  const loadMessageRows = async (threadId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setMessagesFeedback({
        tone: "error",
        message: "Supabase is not configured for messaging."
      });
      return;
    }

    setIsLoadingMessageRows(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, thread_id, sender_id, receiver_id, body, created_at, read_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) {
        logAdminMessageDiagnostic({
          step: "load message rows",
          error,
          currentUser,
          payload: { thread_id: threadId }
        });
        setMessagesFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
        return;
      }

      const rows = (data ?? []) as AdminChatMessageRow[];
      const senderIds = Array.from(new Set(rows.map((message) => message.sender_id)));
      const profileById = new Map<string, ChatSenderProfileRow>();

      if (senderIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", senderIds);

        ((profileRows ?? []) as ChatSenderProfileRow[]).forEach((profile) => {
          profileById.set(profile.id, profile);
        });
      }

      setMessageRows(rows.map((message) => mapAdminChatMessage(message, profileById)));
    } catch (error) {
      logAdminMessageDiagnostic({
        step: "load message rows unexpected failure",
        error,
        currentUser,
        payload: { thread_id: threadId }
      });
      setMessagesFeedback({ tone: "error", message: "Unable to load messages." });
    } finally {
      setIsLoadingMessageRows(false);
    }
  };

  const markMessageThreadRead = async (threadId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase.rpc("mark_chat_thread_read", {
      thread_id_input: threadId
    });

    if (error) {
      logAdminMessageDiagnostic({
        step: "mark admin thread read",
        error,
        currentUser,
        payload: { thread_id_input: threadId }
      });
      setMessagesFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
      return;
    }

    setMessageThreads((threads) => {
      const nextThreads = threads.map((thread) =>
        thread.id === threadId ? { ...thread, adminUnreadCount: 0 } : thread
      );

      setAdminUnreadMessageCount(getAdminUnreadMessageTotal(nextThreads));
      return nextThreads;
    });
  };

  const loadAdminUnreadMessageCount = async () => {
    const supabase = getSupabaseClient();

    if (!supabase || !isAdminRole(currentUser?.role)) {
      setAdminUnreadMessageCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("chat_threads")
      .select("admin_unread_count")
      .is("deleted_by_admin_at", null)
      .neq("status", "archived")
      .gt("admin_unread_count", 0);

    if (error) {
      logAdminMessageDiagnostic({
        step: "load admin unread message count",
        error,
        currentUser,
        payload: {
          table: "chat_threads",
          filters:
            "deleted_by_admin_at is null, status != archived, admin_unread_count > 0"
        }
      });
      return;
    }

    const unreadTotal = ((data ?? []) as AdminUnreadThreadRow[]).reduce(
      (total, thread) => total + Math.max(0, thread.admin_unread_count ?? 0),
      0
    );

    setAdminUnreadMessageCount(unreadTotal);
  };

  const loadMessageThreads = async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setMessagesFeedback({
        tone: "error",
        message: "Supabase is not configured for messaging."
      });
      return;
    }

    setIsLoadingMessageThreads(true);
    setMessagesFeedback(null);

    try {
      const { data, error } = await supabase
        .from("chat_threads")
        .select(
          "id, student_id, admin_id, student_name, student_email, status, last_message, last_message_at, student_unread_count, admin_unread_count, created_at, updated_at, archived_at, deleted_by_admin_at"
        )
        .is("deleted_by_admin_at", null)
        .order("last_message_at", { ascending: false });

      if (error) {
        logAdminMessageDiagnostic({
          step: "load message threads",
          error,
          currentUser,
          payload: { table: "chat_threads" }
        });
        setMessagesFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
        setMessageThreads([]);
        setMessageRows([]);
        return;
      }

      const mappedThreads = ((data ?? []) as AdminChatThreadRow[]).map(mapAdminChatThread);
      setMessageThreads(mappedThreads);
      setAdminUnreadMessageCount(getAdminUnreadMessageTotal(mappedThreads));

      const currentSelectionStillExists = mappedThreads.some(
        (thread) => thread.id === selectedMessageThreadId
      );
      const nextSelectedId = currentSelectionStillExists
        ? selectedMessageThreadId
        : mappedThreads.find((thread) => thread.status !== "archived")?.id ??
          mappedThreads[0]?.id ??
          "";

      setSelectedMessageThreadId(nextSelectedId);

      if (nextSelectedId) {
        await loadMessageRows(nextSelectedId);
        await markMessageThreadRead(nextSelectedId);
      } else {
        setMessageRows([]);
      }
    } catch (error) {
      logAdminMessageDiagnostic({
        step: "load message threads unexpected failure",
        error,
        currentUser,
        payload: { table: "chat_threads" }
      });
      setMessagesFeedback({ tone: "error", message: "Unable to load conversations." });
      setMessageThreads([]);
      setMessageRows([]);
    } finally {
      setIsLoadingMessageThreads(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "messages") {
      return;
    }

    void loadMessageThreads();
    const intervalId = window.setInterval(() => {
      void loadMessageThreads();
    }, 12000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!isAdminRole(currentUser?.role)) {
      setAdminUnreadMessageCount(0);
      return;
    }

    void loadAdminUnreadMessageCount();
    const intervalId = window.setInterval(() => {
      void loadAdminUnreadMessageCount();
    }, 12000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  const openMessageThread = async (threadId: string) => {
    setSelectedMessageThreadId(threadId);
    setMessagesFeedback(null);
    await loadMessageRows(threadId);
    await markMessageThreadRead(threadId);
  };

  const sendAdminMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMessageThread || !messageDraft.trim() || !currentUser) {
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setMessagesFeedback({
        tone: "error",
        message: "Supabase is not configured for messaging."
      });
      return;
    }

    setIsSendingAdminMessage(true);
    setMessagesFeedback(null);

    const { error } = await supabase.from("chat_messages").insert({
      thread_id: selectedMessageThread.id,
      sender_id: currentUser.id,
      body: messageDraft.trim()
    });

    setIsSendingAdminMessage(false);

    if (error) {
      logAdminMessageDiagnostic({
        step: "send admin reply",
        error,
        currentUser,
        payload: {
          thread_id: selectedMessageThread.id,
          sender_id: currentUser.id,
          bodyPreview: messageDraft.trim().slice(0, 120)
        }
      });
      setMessagesFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
      return;
    }

    setMessageDraft("");
    await loadMessageThreads();
    setMessagesFeedback({ tone: "success", message: "Reply sent." });
  };

  const archiveMessageThread = async (threadId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("chat_threads")
      .update({
        status: "archived",
        archived_at: new Date().toISOString()
      })
      .eq("id", threadId);

    if (error) {
      logAdminMessageDiagnostic({
        step: "archive message thread",
        error,
        currentUser,
        payload: { id: threadId, status: "archived" }
      });
      setMessagesFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
      return;
    }

    await loadMessageThreads();
    setMessagesFeedback({ tone: "success", message: "Conversation archived." });
  };

  const deleteMessageThread = async (threadId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("chat_threads")
      .update({ deleted_by_admin_at: new Date().toISOString() })
      .eq("id", threadId);

    if (error) {
      logAdminMessageDiagnostic({
        step: "soft delete message thread",
        error,
        currentUser,
        payload: { id: threadId }
      });
      setMessagesFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
      return;
    }

    if (selectedMessageThreadId === threadId) {
      setSelectedMessageThreadId("");
      setMessageRows([]);
    }

    await loadMessageThreads();
    setMessagesFeedback({ tone: "success", message: "Conversation removed from inbox." });
  };

  const fillNewVideoThumbnail = async (showFeedback = true) => {
    if (newVideo.thumbnailUrl.trim()) {
      if (showFeedback) {
        setFeedback({
          tone: "success",
          message: "This video already has a thumbnail URL."
        });
      }
      return;
    }

    if (!isValidUrl(newVideo.videoUrl)) {
      if (showFeedback) {
        setFeedback({ tone: "error", message: "Add a valid video URL first." });
      }
      return;
    }

    setIsResolvingNewThumbnail(true);
    const result = await resolveAcademyThumbnailFromVideoUrl(newVideo.videoUrl);
    setIsResolvingNewThumbnail(false);

    if (result.thumbnailUrl) {
      setNewVideo((current) => ({
        ...current,
        thumbnailUrl: result.thumbnailUrl
      }));
      if (showFeedback) {
        setFeedback({
          tone: "success",
          message: "Thumbnail fetched from the video platform."
        });
      }
      return;
    }

    if (showFeedback) {
      setFeedback({
        tone: "error",
        message:
          result.message ||
          "No automatic thumbnail was returned. You can still paste a thumbnail URL manually."
      });
    }
  };

  const deleteReview = async (reviewId: string) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setReviewsFeedback({
        tone: "error",
        message: "Supabase is not configured for review moderation."
      });
      return;
    }

    setReviewsFeedback(null);
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

    if (error) {
      console.error("EV Academy review delete failed", {
        table: "reviews",
        reviewId,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        currentUser: currentUser
          ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
          : null
      });
      setReviewsFeedback({ tone: "error", message: formatSupabaseAdminError(error) });
      return;
    }

    setReviewRows((rows) => rows.filter((row) => row.id !== reviewId));
    setReviewsFeedback({ tone: "success", message: "Review deleted." });
  };

  const handleCreateSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!newSectionTitle.trim()) {
      setFeedback({ tone: "error", message: "Please add a section title." });
      return;
    }

    try {
      await createSection(newSectionTitle, newSectionDescription);
      setNewSectionTitle("");
      setNewSectionDescription("");
      setFeedback({ tone: "success", message: "Section added successfully." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add section."
      });
    }
  };

  const handleCreateVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!isReady) {
      setFeedback({ tone: "error", message: "Loading sections..." });
      return;
    }

    if (sections.length === 0) {
      setFeedback({
        tone: "error",
        message: "No sections exist yet. Please create a section before adding a video."
      });
      return;
    }

    if (!newVideo.title.trim() || !isValidUrl(newVideo.videoUrl)) {
      setFeedback({
        tone: "error",
        message: "Please add a video title and valid external video URL."
      });
      return;
    }

    const selectedSection = sections.find(
      (section) => section.id === newVideo.sectionId
    );

    if (!selectedSection) {
      setFeedback({ tone: "error", message: "Please choose a valid section." });
      return;
    }

    setIsCreating(true);
    try {
      const resolvedThumbnail = newVideo.thumbnailUrl.trim()
        ? newVideo.thumbnailUrl.trim()
        : (await resolveAcademyThumbnailFromVideoUrl(newVideo.videoUrl)).thumbnailUrl;

      await createVideo({
        sectionId: selectedSection.id,
        title: newVideo.title,
        description: newVideo.description,
        category: selectedSection.title || "General",
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: resolvedThumbnail,
        isVisible: newVideo.isPublished,
        isFeatured: newVideo.isFeatured,
        resolvedVideoUrl: "",
        resolvedThumbnailUrl: "",
        order: newVideo.sortOrder
      });
      setNewVideo({
        ...emptyVideoForm,
        sectionId: sections[0]?.id ?? "",
        category: sections[0]?.title ?? emptyVideoForm.category
      });
      setFeedback({ tone: "success", message: "Video record added successfully." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add video."
      });
    } finally {
      setIsCreating(false);
    }
  };

  const renderOverview = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <div className="academy-admin-stats">
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalVideos}</strong>
          <div style={mutedStyle}>Total Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.publishedVideos}</strong>
          <div style={mutedStyle}>Published Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalSections}</strong>
          <div style={mutedStyle}>Sections</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalComments}</strong>
          <div style={mutedStyle}>Comments</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalStudents}</strong>
          <div style={mutedStyle}>Students</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.watchedCount}</strong>
          <div style={mutedStyle}>Watched Records</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
          Featured Video
        </h2>
        <p style={{ margin: "0.6rem 0 0", color: "rgba(239,246,255,0.78)" }}>
          {featuredVideo
            ? `${featuredVideo.title} is currently featured.`
            : "No featured video is selected yet."}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setActiveTab("videos")} style={primaryButtonStyle}>
          Add Video
        </button>
        <button type="button" onClick={() => setActiveTab("sections")} style={secondaryButtonStyle}>
          Add Section
        </button>
        <button type="button" onClick={() => setActiveTab("comments")} style={secondaryButtonStyle}>
          View Comments
        </button>
        <button type="button" onClick={() => setActiveTab("reviews")} style={secondaryButtonStyle}>
          Manage Reviews
        </button>
        <button type="button" onClick={() => setActiveTab("messages")} style={secondaryButtonStyle}>
          Open Messages
        </button>
        <button type="button" onClick={() => setActiveTab("admins")} style={secondaryButtonStyle}>
          Manage Admins
        </button>
      </div>
    </div>
  );

  const renderAdmins = () => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <div
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
            Admin Management
          </h2>
          <p style={{ ...mutedStyle, margin: "0.45rem 0 0", lineHeight: 1.65 }}>
            Admins can promote students. Only the owner can demote admins back to
            students.
          </p>
        </div>
        <button type="button" onClick={() => void loadAdminProfiles()} style={secondaryButtonStyle}>
          Refresh
        </button>
      </div>

      {adminProfilesFeedback ? <FeedbackBanner feedback={adminProfilesFeedback} /> : null}

      <div style={cardStyle}>
        <div className="academy-admin-management-toolbar">
          <label style={fieldStyle}>
            <span>Search profiles</span>
            <input
              value={adminProfileSearch}
              onChange={(event) => setAdminProfileSearch(event.target.value)}
              placeholder="Search by name or email"
              style={inputStyle}
            />
          </label>
          <div className="academy-admin-role-filters" aria-label="Filter profiles by role">
            {(["all", "student", "admin", "owner"] as AdminRoleFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setAdminRoleFilter(filter)}
                className={adminRoleFilter === filter ? "is-active" : ""}
              >
                {filter === "all"
                  ? "All"
                  : filter === "student"
                    ? "Students"
                    : filter === "admin"
                      ? "Admins"
                      : "Owner"}
              </button>
            ))}
          </div>
        </div>

        {isLoadingAdminProfiles && adminProfileRows.length === 0 ? (
          <div style={{ marginTop: "1rem" }}>
            <SkeletonAdminRows rows={4} />
          </div>
        ) : filteredAdminProfiles.length === 0 ? (
          <p style={{ ...mutedStyle, margin: "1rem 0 0" }}>
            No profiles match this view yet.
          </p>
        ) : (
          <div className="academy-admin-profile-list">
            {filteredAdminProfiles.map((profile) => {
              const role = profile.role ?? "student";
              const isCurrentOwner = isOwnerRole(currentUser?.role);
              const isSelf = currentUser?.id === profile.id;
              const isBusy = mutatingProfileId === profile.id;
              const displayName = profile.full_name || "EV Academy Student";

              return (
                <article key={profile.id} className="academy-admin-profile-card">
                  <div>
                    <div className="academy-admin-profile-heading">
                      <strong>{displayName}</strong>
                      <span className={`academy-role-badge is-${role}`}>
                        {role === "owner"
                          ? "Owner"
                          : role === "admin"
                            ? "Admin"
                            : "Student"}
                      </span>
                    </div>
                    <p>{profile.email || "Email unavailable"}</p>
                    <small>
                      Joined{" "}
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "date unavailable"}
                    </small>
                  </div>
                  <div className="academy-admin-profile-actions">
                    {role === "student" || role === "visitor" ? (
                      <button
                        type="button"
                        onClick={() => void promoteProfileToAdmin(profile)}
                        style={primaryButtonStyle}
                        disabled={isBusy}
                      >
                        {isBusy ? "Promoting..." : "Promote to Admin"}
                      </button>
                    ) : role === "admin" ? (
                      isCurrentOwner ? (
                        <button
                          type="button"
                          onClick={() => void demoteAdminToStudent(profile)}
                          style={dangerButtonStyle}
                          disabled={isBusy}
                        >
                          {isBusy ? "Demoting..." : "Demote to Student"}
                        </button>
                      ) : (
                        <span className="academy-admin-permission-note">
                          Only the owner can demote admins.
                        </span>
                      )
                    ) : (
                      <span className="academy-admin-permission-note">
                        {isSelf
                          ? "You are the owner."
                          : "Owner is protected from demotion."}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderSections = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <form onSubmit={handleCreateSection} style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
          Add Section
        </h2>
        {feedback ? <FeedbackBanner feedback={feedback} /> : null}
        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <label style={fieldStyle}>
            <span>Section title</span>
            <input
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>Description</span>
            <input
              value={newSectionDescription}
              onChange={(event) => setNewSectionDescription(event.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <button type="submit" style={primaryButtonStyle}>
          Add Section
        </button>
      </form>

      {sections.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "rgba(239,246,255,0.74)" }}>
            No sections have been added yet.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <SectionEditor
            key={section.id}
            section={section}
            onSave={updateSection}
            onDelete={deleteSection}
            onMove={moveSection}
          />
        ))
      )}
    </div>
  );

  const renderVideos = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <form onSubmit={handleCreateVideo} style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
          Add External Video
        </h2>
        <p style={{ ...mutedStyle, margin: "0.55rem 0 1rem", lineHeight: 1.7 }}>
          Use YouTube unlisted, Vimeo, TikTok, Instagram, or another public embed URL.
          Large video uploads are intentionally not stored in this app, browser
          storage, GitHub, or Vercel.
        </p>

        {feedback ? <FeedbackBanner feedback={feedback} /> : null}

        <div className="academy-form-grid academy-form-grid-3" style={{ marginTop: "1rem" }}>
          <label style={fieldStyle}>
            <span>Title</span>
            <input
              value={newVideo.title}
              onChange={(event) =>
                setNewVideo((current) => ({ ...current, title: event.target.value }))
              }
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>Section</span>
            <select
              value={newVideo.sectionId}
              onChange={(event) => {
                const selectedSection = sections.find(
                  (section) => section.id === event.target.value
                );

                setNewVideo((current) => ({
                  ...current,
                  sectionId: event.target.value,
                  category: selectedSection?.title ?? current.category
                }));
              }}
              style={inputStyle}
              disabled={!isReady || sections.length === 0}
            >
              {!isReady ? (
                <option value="">Loading sections...</option>
              ) : sections.length === 0 ? (
                <option value="">No sections available</option>
              ) : (
                <option value="">Choose a section</option>
              )}
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {getSectionOptionLabel(section)}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Sort order</span>
            <input
              type="number"
              value={newVideo.sortOrder}
              onChange={(event) =>
                setNewVideo((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value)
                }))
              }
              style={inputStyle}
            />
          </label>
        </div>

        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <label style={fieldStyle}>
            <span>Video URL</span>
            <input
              value={newVideo.videoUrl}
              onChange={(event) =>
                setNewVideo((current) => ({
                  ...current,
                  videoUrl: event.target.value
                }))
              }
              onBlur={() => {
                if (!newVideo.thumbnailUrl.trim() && isValidUrl(newVideo.videoUrl)) {
                  void fillNewVideoThumbnail(false);
                }
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>Thumbnail URL</span>
            <input
              value={newVideo.thumbnailUrl}
              onChange={(event) =>
                setNewVideo((current) => ({
                  ...current,
                  thumbnailUrl: event.target.value
                }))
              }
              placeholder="Optional"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => void fillNewVideoThumbnail()}
              disabled={isResolvingNewThumbnail || !isValidUrl(newVideo.videoUrl)}
              style={{
                ...secondaryButtonStyle,
                justifySelf: "start",
                opacity:
                  isResolvingNewThumbnail || !isValidUrl(newVideo.videoUrl)
                    ? 0.58
                    : 1
              }}
            >
              {isResolvingNewThumbnail ? "Fetching..." : "Fetch platform thumbnail"}
            </button>
          </label>
        </div>

        <label style={{ ...fieldStyle, marginTop: "1rem" }}>
          <span>Description</span>
          <textarea
            value={newVideo.description}
            onChange={(event) =>
              setNewVideo((current) => ({
                ...current,
                description: event.target.value
              }))
            }
            rows={4}
            style={textareaStyle}
          />
        </label>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", color: "#eff6ff" }}>
            <input
              type="checkbox"
              checked={newVideo.isPublished}
              onChange={(event) =>
                setNewVideo((current) => ({
                  ...current,
                  isPublished: event.target.checked
                }))
              }
            />
            Publish video
          </label>
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", color: "#eff6ff" }}>
            <input
              type="checkbox"
              checked={newVideo.isFeatured}
              onChange={(event) =>
                setNewVideo((current) => ({
                  ...current,
                  isFeatured: event.target.checked
                }))
              }
            />
            Feature video
          </label>
        </div>

        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <VideoPreview
            title={newVideo.title}
            videoUrl={newVideo.videoUrl}
            thumbnailUrl={newVideo.thumbnailUrl}
          />
        </div>

        <button type="submit" style={primaryButtonStyle} disabled={isCreating}>
          {isCreating ? "Adding..." : "Add Video Link"}
        </button>
      </form>

      {sortedVideos.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "rgba(239,246,255,0.74)" }}>
            No academy videos have been added yet.
          </p>
        </div>
      ) : (
        sortedVideos.map((video) => (
          <VideoEditor
            key={video.id}
            video={video}
            sections={sections}
            onSave={updateVideo}
            onDelete={deleteVideo}
            onTogglePublish={toggleVideoVisibility}
            onSetFeatured={setVideoFeatured}
            onMove={moveVideo}
          />
        ))
      )}
    </div>
  );

  const renderReviews = () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
            Website Reviews
          </h2>
          <p style={{ ...mutedStyle, margin: "0.4rem 0 0", lineHeight: 1.6 }}>
            Student reviews publish immediately. Admins can remove inappropriate
            website or imported reviews when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAdminReviews()}
          style={secondaryButtonStyle}
        >
          Refresh Reviews
        </button>
      </div>

      {reviewsFeedback ? <FeedbackBanner feedback={reviewsFeedback} /> : null}

      {isLoadingReviews ? (
        <SkeletonAdminRows rows={3} />
      ) : reviewRows.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "rgba(239,246,255,0.74)" }}>
            No website reviews have been submitted yet.
          </p>
        </div>
      ) : (
        reviewRows.map((review) => (
          <article key={review.id} style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <strong style={{ color: "#eff6ff", fontSize: "1.08rem" }}>
                  {review.reviewer_name || "EV Academy Student"}
                </strong>
                <span style={{ color: "#f6c15b", fontWeight: 800 }}>
                  {"★".repeat(Math.min(Math.max(review.rating ?? 5, 1), 5))}
                  {"☆".repeat(5 - Math.min(Math.max(review.rating ?? 5, 1), 5))}
                </span>
                <span style={mutedStyle}>
                  Source: {review.source || "EVs Driving Academy Ltd"} ·{" "}
                  {review.created_at
                    ? new Date(review.created_at).toLocaleString()
                    : "No date"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    ...statusPillStyle,
                    color: review.is_published ? "#bbf7d0" : "#fde68a",
                    background: review.is_published
                      ? "rgba(34,197,94,0.14)"
                      : "rgba(246,193,91,0.14)",
                    border: review.is_published
                      ? "1px solid rgba(74,222,128,0.3)"
                      : "1px solid rgba(246,193,91,0.3)"
                  }}
                >
                  {review.is_published ? "Published" : "Pending"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this review?")) {
                      void deleteReview(review.id);
                    }
                  }}
                  style={dangerButtonStyle}
                >
                  Delete
                </button>
              </div>
            </div>
            <p style={{ margin: "1rem 0 0", color: "#eff6ff", lineHeight: 1.75 }}>
              {review.comment}
            </p>
          </article>
        ))
      )}
    </div>
  );

  const renderMessages = () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
            Student Messages
          </h2>
          <p style={{ ...mutedStyle, margin: "0.45rem 0 0", lineHeight: 1.6 }}>
            Private one-to-one conversations between students and EVs Driving Academy.
          </p>
        </div>
        <button type="button" onClick={() => void loadMessageThreads()} style={secondaryButtonStyle}>
          Refresh
        </button>
      </div>

      {messagesFeedback ? <FeedbackBanner feedback={messagesFeedback} /> : null}

      <div className="academy-messages-shell">
        <aside className="academy-messages-list" style={cardStyle}>
          <div className="academy-messages-toolbar">
            <div className="academy-messages-filters">
              {(["all", "unread", "archived"] as MessageFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setMessageFilter(filter)}
                  className={messageFilter === filter ? "is-active" : ""}
                >
                  {filter === "all" ? "All" : filter === "unread" ? "Unread" : "Archived"}
                </button>
              ))}
            </div>
            <label className="academy-message-search">
              <span className="sr-only">Search conversations</span>
              <input
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                placeholder="Search name or email"
              />
            </label>
          </div>

          {isLoadingMessageThreads && messageThreads.length === 0 ? (
            <div className="academy-message-thread-list" aria-label="Loading conversations">
              <SkeletonMessageThread />
              <SkeletonMessageThread />
              <SkeletonMessageThread />
            </div>
          ) : filteredMessageThreads.length === 0 ? (
            <p style={mutedStyle}>
              {messageThreads.length === 0
                ? "No student messages yet."
                : "No conversations match this view yet."}
            </p>
          ) : (
            <div className="academy-message-thread-list">
              {filteredMessageThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`academy-message-thread-card ${
                    selectedMessageThread?.id === thread.id ? "is-selected" : ""
                  }`}
                  onClick={() => void openMessageThread(thread.id)}
                >
                  <span>
                    <strong>{thread.studentName}</strong>
                    {thread.studentEmail ? <small>{thread.studentEmail}</small> : null}
                  </span>
                  <span className="academy-message-preview">
                    {thread.lastMessage || "No messages yet"}
                  </span>
                  <span className="academy-message-meta">
                    <time dateTime={thread.lastMessageAt ?? thread.createdAt}>
                      {formatMessageTime(thread.lastMessageAt ?? thread.createdAt)}
                    </time>
                    {thread.adminUnreadCount > 0 ? (
                      <b>{thread.adminUnreadCount} unread</b>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="academy-message-conversation" style={cardStyle}>
          {selectedMessageThread ? (
            <>
              <div className="academy-message-conversation-header">
                <div>
                  <h3>{selectedMessageThread.studentName}</h3>
                  <p>
                    {selectedMessageThread.studentEmail || "Student email unavailable"}
                  </p>
                  <span>
                    Status:{" "}
                    {selectedMessageThread.status === "archived" ? "Archived" : "Open"}
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => void archiveMessageThread(selectedMessageThread.id)}
                    style={secondaryButtonStyle}
                    disabled={selectedMessageThread.status === "archived"}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this conversation from the admin inbox? The thread is soft-deleted for admin cleanup."
                        )
                      ) {
                        void deleteMessageThread(selectedMessageThread.id);
                      }
                    }}
                    style={dangerButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="academy-message-history">
                {isLoadingMessageRows ? (
                  <>
                    <SkeletonMessageBubble />
                    <SkeletonMessageBubble mine />
                    <SkeletonMessageBubble />
                  </>
                ) : messageRows.length === 0 ? (
                  <p style={mutedStyle}>No messages in this conversation yet.</p>
                ) : (
                  messageRows.map((message) => {
                    const isAdminMessage =
                      isAdminRole(message.senderRole) ||
                      (message.senderId === currentUser?.id &&
                        isAdminRole(currentUser?.role));

                    return (
                      <article
                        key={message.id}
                        className={`academy-admin-message-bubble ${
                          isAdminMessage ? "is-admin" : "is-student"
                        }`}
                      >
                        <strong className="academy-admin-message-sender">
                          {isAdminMessage
                            ? message.senderLabel || "Admin_EV"
                            : message.senderLabel || selectedMessageThread.studentName}
                        </strong>
                        <p>{message.body}</p>
                        <time dateTime={message.createdAt}>
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </article>
                    );
                  })
                )}
              </div>

              <form className="academy-admin-message-form" onSubmit={sendAdminMessage}>
                <label className="sr-only" htmlFor="admin-message-reply">
                  Reply to student
                </label>
                <textarea
                  id="admin-message-reply"
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                />
                <button
                  type="submit"
                  style={primaryButtonStyle}
                  disabled={isSendingAdminMessage || !messageDraft.trim()}
                >
                  {isSendingAdminMessage ? "Sending..." : "Send Reply"}
                </button>
              </form>
            </>
          ) : (
            <div className="academy-message-empty-state">
              <h3>No conversation selected</h3>
              <p>Select a student conversation to read and reply.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );

  const renderComments = () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {comments.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "rgba(239,246,255,0.74)" }}>
            No comments have been submitted yet.
          </p>
        </div>
      ) : (
        comments.map((comment) => {
          const videoTitle =
            videos.find((video) => video.id === comment.videoId)?.title ??
            "Unknown video";

          return (
            <article key={comment.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap"
                }}
              >
                <div>
                  <strong style={{ color: "#eff6ff" }}>{comment.userName}</strong>
                  <div style={{ color: "#7fc1ff", marginTop: "0.2rem" }}>
                    {videoTitle}
                  </div>
                  <div style={{ ...mutedStyle, marginTop: "0.2rem" }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this comment?")) {
                      void deleteComment(comment.id);
                    }
                  }}
                  style={dangerButtonStyle}
                >
                  Delete
                </button>
              </div>
              <p style={{ margin: "0.9rem 0 0", color: "#eff6ff", lineHeight: 1.75 }}>
                {comment.commentText}
              </p>
            </article>
          );
        })
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <div className="academy-admin-stats">
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalVideos}</strong>
          <div style={mutedStyle}>Total Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.publishedVideos}</strong>
          <div style={mutedStyle}>Published Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.unpublishedVideos}</strong>
          <div style={mutedStyle}>Unpublished Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalSections}</strong>
          <div style={mutedStyle}>Sections</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalComments}</strong>
          <div style={mutedStyle}>Comments</div>
        </div>
        <div style={cardStyle}>
          <strong style={statStyle}>{analytics.totalStudents}</strong>
          <div style={mutedStyle}>Students</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
          Video Performance
        </h2>
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Video</th>
                <th style={tableHeaderStyle}>Section</th>
                <th style={tableHeaderStyle}>Published</th>
                <th style={tableHeaderStyle}>Featured</th>
                <th style={tableHeaderStyle}>Watched</th>
                <th style={tableHeaderStyle}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {analytics.viewsPerVideo.map((video) => (
                <tr key={video.id}>
                  <td style={tableCellStyle}>{video.title}</td>
                  <td style={tableCellStyle}>
                    {sections.find((section) => section.id === video.sectionId)?.title ??
                      video.category}
                  </td>
                  <td style={tableCellStyle}>{video.isVisible ? "Yes" : "No"}</td>
                  <td style={tableCellStyle}>{video.isFeatured ? "Yes" : "No"}</td>
                  <td style={tableCellStyle}>{video.viewCount}</td>
                  <td style={tableCellStyle}>{video.commentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <AcademyProtected allowedRoles={["admin", "owner"]}>
      <AcademyPageLayout
        title="EV Academy Admin"
        subtitle="Manage tutorial sections, playlists, videos, comments, and academy analytics."
        actions={
          <>
            {currentUser ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "999px",
                  padding: "0.45rem 0.85rem",
                  background: "rgba(255,255,255,0.08)",
                  color: "#eff6ff"
                }}
              >
                {currentUser.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void logout();
                router.replace("/academy/login");
              }}
              style={secondaryButtonStyle}
            >
              Logout
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {errorMessage ? (
            <FeedbackBanner feedback={{ tone: "error", message: errorMessage }} />
          ) : null}

          <div
            className="academy-admin-tabs"
            style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
          >
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  minHeight: "2.9rem",
                  borderRadius: "999px",
                  padding: "0.75rem 1rem",
                  border:
                    activeTab === tab.id
                      ? "1px solid rgba(246,193,91,0.8)"
                      : "1px solid rgba(255,255,255,0.1)",
                  background:
                    activeTab === tab.id
                      ? "rgba(246,193,91,0.16)"
                      : "rgba(255,255,255,0.04)",
                  color: activeTab === tab.id ? "#f6c15b" : "#eff6ff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem"
                  }}
                >
                  {tab.label}
                  {tab.id === "messages" && adminUnreadMessageCount > 0 ? (
                    <span
                      aria-label={`${adminUnreadMessageCount} unread admin messages`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "1.35rem",
                        height: "1.35rem",
                        borderRadius: "999px",
                        padding: "0 0.4rem",
                        background:
                          "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
                        color: "#07111d",
                        fontSize: "0.74rem",
                        fontWeight: 900,
                        lineHeight: 1,
                        boxShadow: "0 0.5rem 1.2rem rgba(246,193,91,0.22)"
                      }}
                    >
                      {adminUnreadBadgeLabel}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>

          {activeTab === "overview" ? renderOverview() : null}
          {activeTab === "admins" ? renderAdmins() : null}
          {activeTab === "sections" ? renderSections() : null}
          {activeTab === "videos" ? renderVideos() : null}
          {activeTab === "reviews" ? renderReviews() : null}
          {activeTab === "messages" ? renderMessages() : null}
          {activeTab === "comments" ? renderComments() : null}
          {activeTab === "analytics" ? renderAnalytics() : null}
        </div>
      </AcademyPageLayout>
    </AcademyProtected>
  );
}

const cardStyle = {
  borderRadius: "1.4rem",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
  padding: "1.3rem"
} as const;

const fieldStyle = {
  display: "grid",
  gap: "0.45rem",
  color: "#eff6ff"
} as const;

const inputStyle = {
  minHeight: "3rem",
  borderRadius: "0.9rem",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(8,17,29,0.45)",
  color: "#eff6ff",
  padding: "0.85rem 1rem"
} as const;

const textareaStyle = {
  ...inputStyle,
  minHeight: "7rem",
  lineHeight: 1.6
} as const;

const primaryButtonStyle = {
  marginTop: "1rem",
  minHeight: "3rem",
  borderRadius: "999px",
  padding: "0.8rem 1.2rem",
  border: 0,
  background: "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer"
} as const;

const primaryInlineButtonStyle = {
  ...primaryButtonStyle,
  marginTop: 0
} as const;

const secondaryButtonStyle = {
  minHeight: "2.65rem",
  borderRadius: "999px",
  padding: "0.65rem 1rem",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#eff6ff",
  fontWeight: 700,
  cursor: "pointer"
} as const;

const dangerButtonStyle = {
  ...secondaryButtonStyle,
  border: "1px solid rgba(248,113,113,0.36)",
  color: "#fecaca"
} as const;

const mutedStyle = {
  color: "rgba(239,246,255,0.72)"
} as const;

const statStyle = {
  color: "#eff6ff",
  fontSize: "2rem"
} as const;

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(239,246,255,0.82)",
  padding: "0.35rem 0.65rem",
  fontSize: "0.82rem",
  fontWeight: 700
} as const;

const previewPanelStyle = {
  display: "grid",
  gap: "0.75rem",
  borderRadius: "1rem",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  padding: "1rem"
} as const;

const previewLabelStyle = {
  color: "rgba(239,246,255,0.72)",
  fontSize: "0.9rem",
  fontWeight: 700
} as const;

const tableHeaderStyle = {
  padding: "0.75rem 0.6rem",
  textAlign: "left" as const,
  color: "rgba(239,246,255,0.78)",
  borderBottom: "1px solid rgba(255,255,255,0.08)"
};

const tableCellStyle = {
  padding: "0.85rem 0.6rem",
  color: "#eff6ff",
  borderBottom: "1px solid rgba(255,255,255,0.06)"
};
