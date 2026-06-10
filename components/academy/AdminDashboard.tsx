"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAcademyThumbnailUrl,
  getAcademyVideoRenderMode,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import type { AcademyVideo } from "@/types/academy";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { AcademyProtected } from "./AcademyProtected";
import { useAcademy } from "./AcademyProvider";

type AdminTab = "overview" | "videos" | "comments" | "analytics";
type Feedback = {
  tone: "success" | "error";
  message: string;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "videos", label: "Videos" },
  { id: "comments", label: "Comments" },
  { id: "analytics", label: "Analytics" }
];

const emptyVideoForm = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  category: "Beginner Lessons",
  sortOrder: 0,
  isPublished: false
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
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
        lineHeight: 1.6
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
  const normalizedVideoUrl = normalizeAcademyVideoUrl(videoUrl);
  const renderMode = getAcademyVideoRenderMode(normalizedVideoUrl);
  const previewThumbnail = getAcademyThumbnailUrl(normalizedVideoUrl, thumbnailUrl);

  return (
    <div style={previewPanelStyle}>
      <span style={previewLabelStyle}>Preview</span>
      {renderMode === "placeholder" ? (
        <div style={emptyPreviewStyle}>
          Add an external video URL to preview it here. YouTube unlisted and Vimeo
          links are recommended.
        </div>
      ) : renderMode === "file" ? (
        <div style={emptyPreviewStyle}>
          Direct file URLs can play, but large video uploads should stay outside the
          website repo. Use YouTube, Vimeo, TikTok, or hosted media links first.
        </div>
      ) : (
        <iframe
          src={normalizedVideoUrl}
          title={`Preview video: ${title || "Academy tutorial"}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={previewVideoStyle}
        />
      )}
      {previewThumbnail ? (
        <div
          aria-label="Thumbnail preview"
          style={{
            minHeight: "150px",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.1)",
            background: `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.58)), url('${previewThumbnail}') center/cover`
          }}
        />
      ) : null}
    </div>
  );
}

function VideoEditor({
  video,
  onSave,
  onDelete,
  onTogglePublish
}: {
  video: AcademyVideo;
  onSave: (
    videoId: string,
    updates: Partial<
      Pick<
        AcademyVideo,
        "title" | "description" | "videoUrl" | "thumbnailUrl" | "category" | "order"
      >
    >
  ) => Promise<void>;
  onDelete: (videoId: string) => Promise<void>;
  onTogglePublish: (videoId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl ?? "",
    category: video.category,
    sortOrder: video.order
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      await onSave(video.id, {
        title: draft.title,
        description: draft.description,
        videoUrl: draft.videoUrl,
        thumbnailUrl: draft.thumbnailUrl,
        category: draft.category,
        order: Number(draft.sortOrder) || 0
      });
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
            <p style={{ margin: "0.35rem 0 0", color: "rgba(239,246,255,0.65)" }}>
              {video.isVisible ? "Published" : "Unpublished"} · {video.category}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
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
            <span>Category</span>
            <input
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
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
        </div>

        <div className="academy-form-grid">
          <label style={fieldStyle}>
            <span>Video URL / embed link</span>
            <input
              value={draft.videoUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, videoUrl: event.target.value }))
              }
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
    createVideo,
    currentUser,
    deleteComment,
    deleteVideo,
    errorMessage,
    logout,
    toggleVideoVisibility,
    updateVideo,
    videos
  } = useAcademy();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [newVideo, setNewVideo] = useState(emptyVideoForm);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.order - b.order),
    [videos]
  );

  const handleCreateVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!newVideo.title.trim() || !isValidUrl(newVideo.videoUrl)) {
      setFeedback({
        tone: "error",
        message: "Please add a video title and valid external video URL."
      });
      return;
    }

    setIsCreating(true);

    try {
      await createVideo({
        sectionId: "",
        title: newVideo.title,
        description: newVideo.description,
        category: newVideo.category,
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: newVideo.thumbnailUrl,
        isVisible: newVideo.isPublished,
        isFeatured: false,
        resolvedVideoUrl: "",
        resolvedThumbnailUrl: "",
        order: newVideo.sortOrder
      });
      setNewVideo(emptyVideoForm);
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
    <div className="academy-admin-stats">
      <div style={cardStyle}>
        <strong style={statStyle}>{analytics.totalVideos}</strong>
        <div style={mutedStyle}>Total Videos</div>
      </div>
      <div style={cardStyle}>
        <strong style={statStyle}>{analytics.totalComments}</strong>
        <div style={mutedStyle}>Total Comments</div>
      </div>
      <div style={cardStyle}>
        <strong style={statStyle}>{analytics.totalViews}</strong>
        <div style={mutedStyle}>Watched Records</div>
      </div>
      <div style={cardStyle}>
        <strong style={{ color: "#eff6ff", fontSize: "1.1rem" }}>
          {analytics.mostWatchedVideo?.title ?? "No data yet"}
        </strong>
        <div style={mutedStyle}>Most Watched Video</div>
      </div>
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
          Large video uploads are intentionally not stored in this app or repo.
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
            <span>Category</span>
            <input
              value={newVideo.category}
              onChange={(event) =>
                setNewVideo((current) => ({
                  ...current,
                  category: event.target.value
                }))
              }
              style={inputStyle}
            />
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

        <label
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "center",
            marginTop: "1rem",
            color: "#eff6ff"
          }}
        >
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

        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <VideoPreview
            title={newVideo.title}
            videoUrl={newVideo.videoUrl}
            thumbnailUrl={newVideo.thumbnailUrl}
          />
        </div>

        <button type="submit" style={primaryButtonStyle} disabled={isCreating}>
          {isCreating ? "Adding..." : "Add Video"}
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
            onSave={updateVideo}
            onDelete={deleteVideo}
            onTogglePublish={toggleVideoVisibility}
          />
        ))
      )}
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
      {renderOverview()}
      <div style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
          Video Performance
        </h2>
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Video</th>
                <th style={tableHeaderStyle}>Category</th>
                <th style={tableHeaderStyle}>Published</th>
                <th style={tableHeaderStyle}>Watched</th>
                <th style={tableHeaderStyle}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id}>
                  <td style={tableCellStyle}>{video.title}</td>
                  <td style={tableCellStyle}>{video.category}</td>
                  <td style={tableCellStyle}>{video.isVisible ? "Yes" : "No"}</td>
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
    <AcademyProtected allowedRoles={["admin"]}>
      <AcademyPageLayout
        title="EV Academy Admin"
        subtitle="Manage tutorial video records, comments, publishing, and academy analytics."
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

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? renderOverview() : null}
          {activeTab === "videos" ? renderVideos() : null}
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

const previewVideoStyle = {
  display: "block",
  width: "100%",
  minHeight: "220px",
  border: 0,
  borderRadius: "1rem",
  background: "#030712"
} as const;

const emptyPreviewStyle = {
  minHeight: "220px",
  display: "grid",
  placeItems: "center",
  borderRadius: "1rem",
  border: "1px dashed rgba(255,255,255,0.16)",
  background: "rgba(8,17,29,0.42)",
  color: "rgba(239,246,255,0.68)",
  textAlign: "center" as const,
  padding: "1.25rem",
  lineHeight: 1.7
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
