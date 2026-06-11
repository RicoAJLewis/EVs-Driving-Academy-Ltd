"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAcademyThumbnailUrl,
  getAcademyVideoRenderMode,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import type { AcademySection, AcademyVideo } from "@/types/academy";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { AcademyProtected } from "./AcademyProtected";
import { useAcademy } from "./AcademyProvider";

type AdminTab = "overview" | "sections" | "videos" | "comments" | "analytics";
type Feedback = {
  tone: "success" | "error";
  message: string;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "sections", label: "Sections" },
  { id: "videos", label: "Videos / Playlists" },
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
  isPublished: false,
  isFeatured: false
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
        lineHeight: 1.6,
        whiteSpace: "pre-wrap"
      }}
    >
      {feedback.message}
    </div>
  );
}

function AdminDebugPanel({
  debugInfo,
  lastError,
  onRefresh,
  onRunInsertTest
}: {
  debugInfo: ReturnType<typeof useAcademy>["adminDebugInfo"];
  lastError: ReturnType<typeof useAcademy>["lastAdminActionError"];
  onRefresh: () => Promise<unknown>;
  onRunInsertTest: () => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const rows = [
    ["Supabase URL exists", debugInfo?.supabaseUrlExists ? "Yes" : "No"],
    ["Anon key exists", debugInfo?.supabaseAnonKeyExists ? "Yes" : "No"],
    ["Session exists", debugInfo?.sessionExists ? "Yes" : "No"],
    ["User id", debugInfo?.userId ?? "Not loaded"],
    ["User email", debugInfo?.userEmail ?? "Not loaded"],
    ["Profile id", debugInfo?.profileId ?? "Not found"],
    ["Profile role", debugInfo?.profileRole ?? "Not found"],
    ["Profile matches session", debugInfo?.profileMatchesSession ? "Yes" : "No"],
    ["App metadata role", debugInfo?.appMetadataRole ?? "Not set"],
    ["User metadata role", debugInfo?.userMetadataRole ?? "Not set"],
    ["public.is_admin()", String(debugInfo?.isAdminRpc ?? "Not checked")],
    ["Debug checked", debugInfo?.checkedAt ?? "Not checked"]
  ];

  const runInsertTest = async () => {
    setFeedback(null);

    try {
      await onRunInsertTest();
      setFeedback({
        tone: "success",
        message: "Debug insert succeeded. RLS accepted the current admin session."
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Debug insert failed. Check browser console for details."
      });
    }
  };

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.2rem" }}>
            Admin Supabase Debug
          </h2>
          <p style={{ ...mutedStyle, margin: "0.35rem 0 0" }}>
            Safe diagnostics for the current browser session and RLS admin check.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void onRefresh()}
            style={secondaryButtonStyle}
          >
            Refresh Debug
          </button>
          <button
            type="button"
            onClick={() => void runInsertTest()}
            style={primaryInlineButtonStyle}
          >
            Run Section Insert Test
          </button>
        </div>
      </div>

      <div className="academy-admin-stats" style={{ marginTop: "1rem" }}>
        {rows.map(([label, value]) => (
          <div key={label} style={debugStatStyle}>
            <span style={{ color: "rgba(239,246,255,0.62)", fontSize: "0.82rem" }}>
              {label}
            </span>
            <strong
              style={{
                color:
                  value === "No" || value === "Not found" || value === "false"
                    ? "#fecaca"
                    : "#eff6ff",
                overflowWrap: "anywhere"
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>

      {debugInfo?.isAdminRpcError ? (
        <FeedbackBanner
          feedback={{
            tone: "error",
            message: `Admin RPC/profile debug issue: ${debugInfo.isAdminRpcError}`
          }}
        />
      ) : null}

      {lastError ? (
        <FeedbackBanner
          feedback={{
            tone: "error",
            message: [
              "Last admin Supabase error:",
              `Message: ${lastError.message}`,
              `Code: ${lastError.code ?? "none"}`,
              `Details: ${lastError.details ?? "none"}`,
              `Hint: ${lastError.hint ?? "none"}`,
              `Table: ${lastError.table}`,
              `Action: ${lastError.action}`,
              `Payload: ${JSON.stringify(lastError.payload)}`
            ].join("\n")
          }}
        />
      ) : null}

      {feedback ? <FeedbackBanner feedback={feedback} /> : null}
    </section>
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
      <span style={previewLabelStyle}>Live preview</span>
      {renderMode === "placeholder" ? (
        <div style={emptyPreviewStyle}>
          Add an external video URL to preview it here. YouTube unlisted and Vimeo
          links are recommended.
        </div>
      ) : renderMode === "file" ? (
        <div style={emptyPreviewStyle}>
          This looks like a direct file URL. The link can be saved if it is public,
          but large video uploads should stay outside the website repo.
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
      <p style={{ margin: 0, color: "rgba(239,246,255,0.68)", lineHeight: 1.6 }}>
        If a platform blocks embedding, the video record can still be saved, but
        playback may need to open externally.
      </p>
    </div>
  );
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

      await onSave(video.id, {
        title: draft.title,
        description: draft.description,
        videoUrl: draft.videoUrl,
        thumbnailUrl: draft.thumbnailUrl,
        category: draft.category || selectedSection?.title || "General",
        sectionId: draft.sectionId,
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
              {video.isVisible ? "Published" : "Unpublished"} / {video.category}
              {video.isFeatured ? " / Featured" : ""}
            </p>
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
                  {section.title}
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
    adminDebugInfo,
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
    logout,
    lastAdminActionError,
    moveSection,
    moveVideo,
    refreshAdminDebugInfo,
    sections,
    setVideoFeatured,
    testAdminSectionInsert,
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

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.order - b.order),
    [videos]
  );

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

    if (!newVideo.title.trim() || !isValidUrl(newVideo.videoUrl)) {
      setFeedback({
        tone: "error",
        message: "Please add a video title and valid external video URL."
      });
      return;
    }

    if (!newVideo.sectionId && sections.length > 0) {
      setFeedback({ tone: "error", message: "Please choose a section." });
      return;
    }

    setIsCreating(true);

    try {
      const selectedSection = sections.find(
        (section) => section.id === newVideo.sectionId
      );

      await createVideo({
        sectionId: newVideo.sectionId,
        title: newVideo.title,
        description: newVideo.description,
        category: newVideo.category || selectedSection?.title || "General",
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: newVideo.thumbnailUrl,
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
              value={newVideo.sectionId || sections[0]?.id || ""}
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
            >
              <option value="">Choose a section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
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
    <AcademyProtected allowedRoles={["admin"]}>
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

          <AdminDebugPanel
            debugInfo={adminDebugInfo}
            lastError={lastAdminActionError}
            onRefresh={refreshAdminDebugInfo}
            onRunInsertTest={testAdminSectionInsert}
          />

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
          {activeTab === "sections" ? renderSections() : null}
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

const debugStatStyle = {
  ...cardStyle,
  display: "grid",
  gap: "0.3rem",
  padding: "0.95rem"
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
