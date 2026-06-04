"use client";

import { FormEvent, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getAcademyThumbnailUrl,
  getAcademyVideoRenderMode,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import {
  isAcademyMediaRef,
  saveAcademyMediaData
} from "@/lib/academy-media-storage";
import { AcademyProtected } from "./AcademyProtected";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { useAcademy } from "./AcademyProvider";

type AdminTab = "overview" | "sections" | "videos" | "comments" | "analytics";
type FeedbackTone = "success" | "error";
type FormFeedback = {
  tone: FeedbackTone;
  message: string;
};
type UploadTaskState = {
  message: string;
  progress: number;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "sections", label: "Sections" },
  { id: "videos", label: "Videos / Playlists" },
  { id: "comments", label: "Comments" },
  { id: "analytics", label: "Analytics" }
];

const cardStyle = {
  borderRadius: "1.4rem",
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
  padding: "1.3rem"
} as const;

const DEFAULT_THUMBNAIL_URL = "/images/academy/beginner-driving.svg";
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const RECOMMENDED_VIDEO_FORMATS = "Recommended: MP4 (H.264).";

function readFileAsDataUrl(
  file: File,
  onProgress?: (progress: number) => void
) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) {
        return;
      }

      onProgress(Math.min(92, Math.round((event.loaded / event.total) * 92)));
    };
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("File upload failed."));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateUploadFile(file: File, kind: "video" | "image") {
  if (kind === "video") {
    if (!file.type.startsWith("video/")) {
      return "Please choose a valid video file.";
    }

    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      return `This video is too large. Please keep uploads under ${formatFileSize(
        MAX_VIDEO_UPLOAD_BYTES
      )}.`;
    }

    return null;
  }

  if (!file.type.startsWith("image/")) {
    return "Please choose a valid image file for the thumbnail.";
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return `This thumbnail image is too large. Please keep images under ${formatFileSize(
      MAX_IMAGE_UPLOAD_BYTES
    )}.`;
  }

  return null;
}

function shouldAutoGenerateThumbnail(
  thumbnailUrl: string,
  resolvedThumbnailUrl?: string
) {
  const cleanedThumbnailUrl = thumbnailUrl.trim();

  if (resolvedThumbnailUrl?.trim()) {
    return false;
  }

  return !cleanedThumbnailUrl || cleanedThumbnailUrl === DEFAULT_THUMBNAIL_URL;
}

function captureVideoThumbnail(videoSource: string) {
  return new Promise<string>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    let resolved = false;

    const finish = (value: string) => {
      if (resolved) {
        return;
      }

      resolved = true;
      resolve(value);
    };

    const fail = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      reject(new Error("Unable to generate a thumbnail from this video."));
    };

    const drawFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          fail();
          return;
        }

        context.drawImage(video, 0, 0, width, height);
        finish(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        fail();
      }
    };

    video.addEventListener("loadeddata", () => {
      const safeDuration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime =
        safeDuration > 0 ? Math.max(0, Math.min(safeDuration * 0.2, 2)) : 0;

      if (targetTime <= 0.05) {
        drawFrame();
        return;
      }

      const handleSeeked = () => {
        video.removeEventListener("seeked", handleSeeked);
        drawFrame();
      };

      video.addEventListener("seeked", handleSeeked, { once: true });

      try {
        video.currentTime = targetTime;
      } catch {
        drawFrame();
      }
    });

    video.addEventListener("error", fail, { once: true });
    video.src = videoSource;
  });
}

function FeedbackBanner({ feedback }: { feedback: FormFeedback }) {
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

function UploadProgressCard({ task }: { task: UploadTaskState }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderRadius: "1rem",
        border: "1px solid rgba(96,165,250,0.24)",
        background: "rgba(59,130,246,0.12)",
        padding: "0.9rem 1rem",
        color: "#dbeafe",
        display: "grid",
        gap: "0.65rem"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center"
        }}
      >
        <strong style={{ color: "#eff6ff" }}>{task.message}</strong>
        <span style={{ color: "#bfdbfe", fontWeight: 700 }}>{task.progress}%</span>
      </div>
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          height: "0.55rem",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${task.progress}%`,
            height: "100%",
            borderRadius: "999px",
            background:
              "linear-gradient(90deg, rgba(96,165,250,1), rgba(56,189,248,1))",
            transition: "width 0.2s ease"
          }}
        />
      </div>
    </div>
  );
}

function MediaPreviewPanel({
  title,
  videoUrl,
  thumbnailUrl
}: {
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
}) {
  const videoRenderMode = getAcademyVideoRenderMode(videoUrl);
  const previewThumbnailUrl = getAcademyThumbnailUrl(videoUrl, thumbnailUrl);

  return (
    <div style={previewPanelStyle}>
      <span style={previewLabelStyle}>Media preview</span>
      {videoRenderMode === "placeholder" ? (
        <div style={emptyPreviewStyle}>
          Add a playable video link or upload a video file to preview it here.
        </div>
      ) : videoRenderMode === "file" ? (
        <video
          src={videoUrl}
          poster={previewThumbnailUrl || undefined}
          controls
          preload="metadata"
          style={previewVideoStyle}
        />
      ) : (
        <iframe
          src={videoUrl}
          title={`Preview video: ${title}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={previewVideoStyle}
        />
      )}
      <p style={{ margin: 0, color: "rgba(239,246,255,0.7)", lineHeight: 1.65 }}>
        Review the media here before you save changes to the Academy.
      </p>
    </div>
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
    getSectionById,
    getVideosForSection,
    logout,
    moveSection,
    moveVideo,
    sections,
    setVideoFeatured,
    toggleCommentVisibility,
    toggleVideoVisibility,
    updateSection,
    updateVideo,
    videos
  } = useAcademy();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [commentsFilter, setCommentsFilter] = useState("all");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [createVideoFeedback, setCreateVideoFeedback] = useState<FormFeedback | null>(
    null
  );
  const [videoFeedbacks, setVideoFeedbacks] = useState<Record<string, FormFeedback>>(
    {}
  );
  const [createVideoTask, setCreateVideoTask] = useState<UploadTaskState | null>(null);
  const [videoTasks, setVideoTasks] = useState<Record<string, UploadTaskState>>({});
  const [newVideoState, setNewVideoState] = useState({
    sectionId: sections[0]?.id ?? "",
    title: "",
    description: "",
    category: "Beginner",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
    thumbnailUrl: "/images/academy/beginner-driving.svg",
    resolvedVideoUrl: "",
    resolvedThumbnailUrl: "",
    isVisible: true,
    isFeatured: false
  });
  const isNewVideoUpload = isAcademyMediaRef(newVideoState.videoUrl);
  const isNewThumbnailUpload = isAcademyMediaRef(newVideoState.thumbnailUrl);
  const newVideoPreviewUrl = newVideoState.resolvedVideoUrl || newVideoState.videoUrl;
  const newVideoPreviewMode = getAcademyVideoRenderMode(newVideoPreviewUrl);
  const newVideoThumbnailPreview = getAcademyThumbnailUrl(
    newVideoPreviewUrl,
    newVideoState.resolvedThumbnailUrl || newVideoState.thumbnailUrl
  );

  const setVideoFeedback = (videoId: string, feedback: FormFeedback) => {
    setVideoFeedbacks((current) => ({
      ...current,
      [videoId]: feedback
    }));
  };

  const setVideoTask = (videoId: string, task: UploadTaskState | null) => {
    setVideoTasks((current) => {
      if (!task) {
        const nextState = { ...current };
        delete nextState[videoId];
        return nextState;
      }

      return {
        ...current,
        [videoId]: task
      };
    });
  };

  const filteredComments = useMemo(() => {
    if (commentsFilter === "all") {
      return comments;
    }

    return comments.filter((comment) => comment.videoId === commentsFilter);
  }, [comments, commentsFilter]);

  const handleCreateSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newSectionTitle.trim()) {
      return;
    }

    createSection(newSectionTitle.trim(), newSectionDescription.trim());
    setNewSectionTitle("");
    setNewSectionDescription("");
  };

  const handleCreateVideo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateVideoTask(null);

    if (!newVideoState.sectionId || !newVideoState.title.trim()) {
      setCreateVideoFeedback({
        tone: "error",
        message: "Please add a title and choose a section before saving the video."
      });
      return;
    }

    try {
      createVideo({
        sectionId: newVideoState.sectionId,
        title: newVideoState.title.trim(),
        description: newVideoState.description.trim(),
        category: newVideoState.category.trim(),
        videoUrl: newVideoState.videoUrl.trim(),
        thumbnailUrl: newVideoState.thumbnailUrl.trim(),
        resolvedVideoUrl: newVideoState.resolvedVideoUrl,
        resolvedThumbnailUrl: newVideoState.resolvedThumbnailUrl,
        isVisible: newVideoState.isVisible,
        isFeatured: newVideoState.isFeatured
      });

      setNewVideoState((current) => ({
        ...current,
        title: "",
        description: "",
        category: "Beginner",
        videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
        thumbnailUrl: DEFAULT_THUMBNAIL_URL,
        resolvedVideoUrl: "",
        resolvedThumbnailUrl: "",
        isVisible: true,
        isFeatured: false
      }));
      setCreateVideoFeedback({
        tone: "success",
        message: "Video added successfully. It is now available in this Academy section."
      });
    } catch {
      setCreateVideoFeedback({
        tone: "error",
        message:
          "The video could not be added right now. Please check the media source and try again."
      });
    }
  };

  const handleNewVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateUploadFile(file, "video");

    if (validationError) {
      setCreateVideoTask(null);
      setCreateVideoFeedback({
        tone: "error",
        message: validationError
      });
      event.target.value = "";
      return;
    }

    try {
      setCreateVideoTask({
        message: `Preparing ${file.name}...`,
        progress: 8
      });
      const fileDataUrl = await readFileAsDataUrl(file, (progress) => {
        setCreateVideoTask({
          message: `Preparing ${file.name}...`,
          progress
        });
      });
      setCreateVideoTask({
        message: "Saving video to browser storage...",
        progress: 94
      });
      const mediaRef = await saveAcademyMediaData("video", fileDataUrl, file.type);
      const autoThumbnail =
        shouldAutoGenerateThumbnail(
          newVideoState.thumbnailUrl,
          newVideoState.resolvedThumbnailUrl
        )
          ? await captureVideoThumbnail(fileDataUrl)
          : null;

      if (autoThumbnail) {
        const thumbnailRef = await saveAcademyMediaData(
          "thumbnail",
          autoThumbnail,
          "image/jpeg"
        );
        setNewVideoState((current) => ({
          ...current,
          videoUrl: mediaRef,
          resolvedVideoUrl: fileDataUrl,
          thumbnailUrl: thumbnailRef,
          resolvedThumbnailUrl: autoThumbnail,
          title: current.title || file.name.replace(/\.[^.]+$/, "")
        }));
      } else {
        setNewVideoState((current) => ({
          ...current,
          videoUrl: mediaRef,
          resolvedVideoUrl: fileDataUrl,
          title: current.title || file.name.replace(/\.[^.]+$/, "")
        }));
      }

      setCreateVideoFeedback({
        tone: "success",
        message:
          autoThumbnail
            ? "Video selected successfully. Preview ready, and a thumbnail was prepared automatically."
            : "Video selected successfully. Preview ready."
      });
    } catch {
      setCreateVideoFeedback({
        tone: "error",
        message:
          "That video could not be prepared for upload. Please try another file or a smaller export."
      });
    } finally {
      setCreateVideoTask(null);
      event.target.value = "";
    }
  };

  const handleNewThumbnailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateUploadFile(file, "image");

    if (validationError) {
      setCreateVideoTask(null);
      setCreateVideoFeedback({
        tone: "error",
        message: validationError
      });
      event.target.value = "";
      return;
    }

    try {
      setCreateVideoTask({
        message: `Preparing ${file.name}...`,
        progress: 10
      });
      const fileDataUrl = await readFileAsDataUrl(file, (progress) => {
        setCreateVideoTask({
          message: `Preparing ${file.name}...`,
          progress
        });
      });
      setCreateVideoTask({
        message: "Saving thumbnail to browser storage...",
        progress: 94
      });
      const mediaRef = await saveAcademyMediaData(
        "thumbnail",
        fileDataUrl,
        file.type
      );
      setNewVideoState((current) => ({
        ...current,
        thumbnailUrl: mediaRef,
        resolvedThumbnailUrl: fileDataUrl
      }));
      setCreateVideoFeedback({
        tone: "success",
        message: "Custom thumbnail selected successfully. Preview updated."
      });
    } catch {
      setCreateVideoFeedback({
        tone: "error",
        message:
          "The thumbnail could not be loaded. Please try a different image file."
      });
    } finally {
      setCreateVideoTask(null);
      event.target.value = "";
    }
  };

  const renderOverview = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <div className="academy-admin-stats">
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "2rem" }}>
            {analytics.totalViews}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Total Views</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "2rem" }}>
            {analytics.totalVideos}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Total Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "2rem" }}>
            {analytics.totalComments}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Total Comments</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "1.2rem" }}>
            {analytics.mostWatchedVideo?.title ?? "No data yet"}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Most Watched Video</div>
        </div>
      </div>

      <div className="academy-admin-two-col">
        <div style={cardStyle}>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
            Recent Comments
          </h2>
          <div style={{ display: "grid", gap: "0.9rem", marginTop: "1rem" }}>
            {analytics.recentComments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.04)",
                  padding: "0.95rem"
                }}
              >
                <strong style={{ color: "#eff6ff" }}>{comment.userName}</strong>
                <div style={{ color: "#7fc1ff", marginTop: "0.2rem" }}>
                  {comment.videoTitle}
                </div>
                <p
                  style={{
                    margin: "0.45rem 0 0",
                    color: "rgba(239,246,255,0.76)",
                    lineHeight: 1.65
                  }}
                >
                  {comment.commentText}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
            Top Performing Section
          </h2>
          <p
            style={{
              margin: "0.85rem 0 0",
              color: "#eff6ff",
              fontSize: "1.15rem",
              fontWeight: 700
            }}
          >
            {analytics.topPerformingSection?.title ?? "No data yet"}
          </p>
          <p
            style={{
              margin: "0.6rem 0 0",
              color: "rgba(239,246,255,0.76)",
              lineHeight: 1.75
            }}
          >
            {analytics.topPerformingSection?.description ??
              "Views and engagement will appear here as visitors watch tutorials."}
          </p>
        </div>
      </div>
    </div>
  );

  const renderSections = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <form onSubmit={handleCreateSection} style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
          Create New Section
        </h2>
        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Section title</span>
            <input
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
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

      {sections.map((section) => (
        <form
          key={section.id}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            updateSection(section.id, {
              title: String(formData.get("title") ?? ""),
              description: String(formData.get("description") ?? ""),
              isVisible: formData.get("isVisible") === "on"
            });
          }}
          style={cardStyle}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "1rem",
              alignItems: "center"
            }}
          >
            <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.2rem" }}>
              {section.title}
            </h2>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => moveSection(section.id, "up")}
                style={secondaryButtonStyle}
              >
                Move Up
              </button>
              <button
                type="button"
                onClick={() => moveSection(section.id, "down")}
                style={secondaryButtonStyle}
              >
                Move Down
              </button>
              <button type="submit" style={secondaryButtonStyle}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this item? This action cannot be undone."
                    )
                  ) {
                    deleteSection(section.id);
                  }
                }}
                style={dangerButtonStyle}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
            <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
              <span>Title</span>
              <input name="title" defaultValue={section.title} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
              <span>Description</span>
              <input
                name="description"
                defaultValue={section.description}
                style={inputStyle}
              />
            </label>
          </div>

          <label
            style={{
              marginTop: "1rem",
              display: "inline-flex",
              gap: "0.55rem",
              alignItems: "center",
              color: "rgba(239,246,255,0.82)"
            }}
          >
            <input
              name="isVisible"
              defaultChecked={section.isVisible}
              type="checkbox"
            />
            Visible to visitors
          </label>
        </form>
      ))}
    </div>
  );

  const renderVideos = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <form onSubmit={handleCreateVideo} style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
          Add Video to a Section
        </h2>
        <p
          style={{
            margin: "0.6rem 0 0",
            color: "rgba(239,246,255,0.72)",
            lineHeight: 1.7
          }}
        >
          Add a tutorial by pasting a YouTube, Vimeo, TikTok, or Instagram link,
          or upload a video file from this device. You can also choose a custom
          thumbnail to showcase the lesson card.
        </p>
        {createVideoFeedback ? (
          <div style={{ marginTop: "1rem" }}>
            <FeedbackBanner feedback={createVideoFeedback} />
          </div>
        ) : null}
        {createVideoTask ? (
          <div style={{ marginTop: "1rem" }}>
            <UploadProgressCard task={createVideoTask} />
          </div>
        ) : null}
        <div className="academy-form-grid academy-form-grid-3" style={{ marginTop: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Section</span>
            <select
              value={newVideoState.sectionId}
              onChange={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  sectionId: event.target.value
                }))
              }
              style={inputStyle}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Video title</span>
            <input
              value={newVideoState.title}
              onChange={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  title: event.target.value
                }))
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Category</span>
            <input
              value={newVideoState.category}
              onChange={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  category: event.target.value
                }))
              }
              style={inputStyle}
            />
          </label>
        </div>
        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Description</span>
            <textarea
              value={newVideoState.description}
              onChange={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              rows={4}
              style={textareaStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Video URL / embed link</span>
            <input
              value={
                isNewVideoUpload
                  ? ""
                  : newVideoState.videoUrl
              }
              onChange={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  videoUrl: event.target.value,
                  resolvedVideoUrl: ""
                }))
              }
              onBlur={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  videoUrl:
                    isAcademyMediaRef(current.videoUrl) &&
                    !event.target.value.trim()
                      ? current.videoUrl
                      : normalizeAcademyVideoUrl(event.target.value),
                  resolvedVideoUrl:
                    isAcademyMediaRef(current.videoUrl) && !event.target.value.trim()
                      ? current.resolvedVideoUrl
                      : normalizeAcademyVideoUrl(event.target.value)
                }))
              }
              placeholder={
                isNewVideoUpload
                  ? "Video uploaded from this device"
                  : "Paste a YouTube, Vimeo, or direct video URL"
              }
              style={inputStyle}
            />
          </label>
        </div>
        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
            <span>Thumbnail URL</span>
            <input
              value={
                isNewThumbnailUpload
                  ? ""
                  : newVideoState.thumbnailUrl
              }
              onChange={(event) =>
                setNewVideoState((current) => ({
                  ...current,
                  thumbnailUrl: event.target.value,
                  resolvedThumbnailUrl: ""
                }))
              }
              placeholder={
                isNewThumbnailUpload
                  ? "Thumbnail uploaded from this device"
                  : "Paste a thumbnail image URL or upload one below"
              }
              style={inputStyle}
            />
          </label>
          <div style={{ display: "grid", gap: "0.6rem", color: "#eff6ff" }}>
            <label style={{ display: "inline-flex", gap: "0.55rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={newVideoState.isVisible}
                onChange={(event) =>
                  setNewVideoState((current) => ({
                    ...current,
                    isVisible: event.target.checked
                  }))
                }
              />
              Visible to visitors
            </label>
            <label style={{ display: "inline-flex", gap: "0.55rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={newVideoState.isFeatured}
                onChange={(event) =>
                  setNewVideoState((current) => ({
                    ...current,
                    isFeatured: event.target.checked
                  }))
                }
              />
              Mark as featured
            </label>
          </div>
        </div>
        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
            <span>Upload video from this device</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleNewVideoUpload}
              style={fileInputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
            <span>Upload thumbnail image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleNewThumbnailUpload}
              style={fileInputStyle}
            />
          </label>
        </div>
        <p
          style={{
            margin: "0.85rem 0 0",
            color: "rgba(239,246,255,0.68)",
            lineHeight: 1.7
          }}
        >
          If you upload a video and do not choose a custom thumbnail, the Academy
          will automatically capture a frame from the video for you.
        </p>
        <div
          style={{
            marginTop: "0.85rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            padding: "0.95rem 1rem",
            color: "rgba(239,246,255,0.72)",
            lineHeight: 1.7
          }}
        >
          <strong style={{ color: "#eff6ff" }}>Upload guidance:</strong> Videos up
          to {formatFileSize(MAX_VIDEO_UPLOAD_BYTES)} are allowed in this browser
          setup. Thumbnail images up to {formatFileSize(MAX_IMAGE_UPLOAD_BYTES)} are
          allowed. {RECOMMENDED_VIDEO_FORMATS}
        </div>
        <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
          <MediaPreviewPanel
            title={newVideoState.title || "New tutorial preview"}
            videoUrl={newVideoPreviewUrl}
            thumbnailUrl={
              newVideoState.resolvedThumbnailUrl || newVideoState.thumbnailUrl
            }
          />
          <div style={previewPanelStyle}>
            <span style={previewLabelStyle}>Thumbnail preview</span>
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: newVideoThumbnailPreview
                  ? `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.58)), url('${newVideoThumbnailPreview}') center/cover`
                  : "rgba(255,255,255,0.04)"
              }}
            />
          </div>
          <div style={previewPanelStyle}>
            <span style={previewLabelStyle}>Video source</span>
            <strong style={{ color: "#eff6ff", fontSize: "1.05rem" }}>
              {isNewVideoUpload
                ? "Uploaded from this device"
                : "External video link"}
            </strong>
            <p style={{ margin: 0, color: "rgba(239,246,255,0.72)", lineHeight: 1.7 }}>
              YouTube and Vimeo watch links are converted automatically into
              playable embeds when you save the video. Public TikTok and
              Instagram post links are also supported when the platform allows
              embedding.
            </p>
          </div>
        </div>
        <button type="submit" style={primaryButtonStyle}>
          Add Video
        </button>
      </form>

      {sections.map((section) => {
        const sectionVideos = getVideosForSection(section.id);

        return (
          <section key={section.id} style={cardStyle}>
            <div style={{ display: "grid", gap: "0.3rem" }}>
              <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
                {section.title}
              </h2>
              <p style={{ margin: 0, color: "rgba(239,246,255,0.72)" }}>
                {section.description}
              </p>
            </div>

            <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
              {sectionVideos.map((video) => (
                <form
                  key={`${video.id}-${video.updatedAt}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    try {
                      const formData = new FormData(event.currentTarget);
                      const nextVideoUrl =
                        String(formData.get("videoUrl") ?? "").trim() || video.videoUrl;
                      const nextThumbnailUrl =
                        String(formData.get("thumbnailUrl") ?? "").trim() ||
                        video.thumbnailUrl ||
                        "";
                      const nextResolvedVideoUrl =
                        String(formData.get("videoUrl") ?? "").trim() ||
                        video.resolvedVideoUrl ||
                        video.videoUrl;
                      const nextResolvedThumbnailUrl =
                        String(formData.get("thumbnailUrl") ?? "").trim() ||
                        video.resolvedThumbnailUrl ||
                        video.thumbnailUrl ||
                        "";

                      updateVideo(video.id, {
                        sectionId: String(formData.get("sectionId") ?? video.sectionId),
                        title: String(formData.get("title") ?? video.title),
                        description: String(
                          formData.get("description") ?? video.description
                        ),
                        category: String(formData.get("category") ?? video.category),
                        videoUrl: nextVideoUrl,
                        thumbnailUrl: nextThumbnailUrl,
                        resolvedVideoUrl: nextResolvedVideoUrl,
                        resolvedThumbnailUrl: nextResolvedThumbnailUrl,
                        isVisible: formData.get("isVisible") === "on",
                        isFeatured: formData.get("isFeatured") === "on"
                      });
                      setVideoFeedback(video.id, {
                        tone: "success",
                        message: "Video details saved successfully."
                      });
                    } catch {
                      setVideoFeedback(video.id, {
                        tone: "error",
                        message:
                          "This video could not be saved right now. Please review the media details and try again."
                      });
                    }
                  }}
                  style={{
                    borderRadius: "1.15rem",
                    background: "rgba(255,255,255,0.04)",
                    padding: "1rem"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: "0.8rem",
                      alignItems: "center"
                    }}
                  >
                    <strong style={{ color: "#eff6ff", fontSize: "1.05rem" }}>
                      {video.title}
                    </strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
                      <button
                        type="button"
                        onClick={() => moveVideo(video.id, "up")}
                        style={secondaryButtonStyle}
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveVideo(video.id, "down")}
                        style={secondaryButtonStyle}
                      >
                        Move Down
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoFeatured(video.id)}
                        style={secondaryButtonStyle}
                      >
                        Set Featured
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVideoVisibility(video.id)}
                        style={secondaryButtonStyle}
                      >
                        {video.isVisible ? "Hide" : "Show"}
                      </button>
                      <button type="submit" style={secondaryButtonStyle}>
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this item? This action cannot be undone."
                            )
                          ) {
                            deleteVideo(video.id);
                          }
                        }}
                        style={dangerButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {videoFeedbacks[video.id] ? (
                    <div style={{ marginTop: "1rem" }}>
                      <FeedbackBanner feedback={videoFeedbacks[video.id]} />
                    </div>
                  ) : null}
                  {videoTasks[video.id] ? (
                    <div style={{ marginTop: "1rem" }}>
                      <UploadProgressCard task={videoTasks[video.id]} />
                    </div>
                  ) : null}

                  <div className="academy-form-grid academy-form-grid-3" style={{ marginTop: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
                      <span>Section</span>
                      <select name="sectionId" defaultValue={video.sectionId} style={inputStyle}>
                        {sections.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
                      <span>Title</span>
                      <input name="title" defaultValue={video.title} style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
                      <span>Category</span>
                      <input name="category" defaultValue={video.category} style={inputStyle} />
                    </label>
                  </div>

                  <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
                      <span>Description</span>
                      <textarea
                        name="description"
                        defaultValue={video.description}
                        rows={3}
                        style={textareaStyle}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
                      <span>Video URL</span>
                      <input
                        name="videoUrl"
                        defaultValue={
                          isAcademyMediaRef(video.videoUrl)
                            ? ""
                            : video.videoUrl
                        }
                        placeholder={
                          isAcademyMediaRef(video.videoUrl)
                            ? "Video uploaded from this device"
                            : "Paste a YouTube, Vimeo, or direct video URL"
                        }
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.4rem", color: "#eff6ff" }}>
                      <span>Thumbnail URL</span>
                      <input
                        name="thumbnailUrl"
                        defaultValue={
                          isAcademyMediaRef(video.thumbnailUrl)
                            ? ""
                            : video.thumbnailUrl
                        }
                        placeholder={
                          isAcademyMediaRef(video.thumbnailUrl)
                            ? "Thumbnail uploaded from this device"
                            : "Paste a thumbnail image URL or upload one below"
                        }
                        style={inputStyle}
                      />
                    </label>
                    <div style={{ display: "grid", gap: "0.6rem", color: "#eff6ff" }}>
                      <label style={{ display: "inline-flex", gap: "0.55rem", alignItems: "center" }}>
                        <input
                          name="isVisible"
                          defaultChecked={video.isVisible}
                          type="checkbox"
                        />
                        Visible to visitors
                      </label>
                      <label style={{ display: "inline-flex", gap: "0.55rem", alignItems: "center" }}>
                        <input
                          name="isFeatured"
                          defaultChecked={video.isFeatured}
                          type="checkbox"
                        />
                        Featured video
                      </label>
                    </div>
                  </div>
                  <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
                    <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
                      <span>Upload replacement video</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];

                          if (!file) {
                            return;
                          }

                          const validationError = validateUploadFile(file, "video");

                          if (validationError) {
                            setVideoTask(video.id, null);
                            setVideoFeedback(video.id, {
                              tone: "error",
                              message: validationError
                            });
                            event.target.value = "";
                            return;
                          }

                          try {
                            setVideoTask(video.id, {
                              message: `Preparing ${file.name}...`,
                              progress: 8
                            });
                            const fileDataUrl = await readFileAsDataUrl(
                              file,
                              (progress) => {
                                setVideoTask(video.id, {
                                  message: `Preparing ${file.name}...`,
                                  progress
                                });
                              }
                            );
                            setVideoTask(video.id, {
                              message: "Saving video to browser storage...",
                              progress: 94
                            });
                            const mediaRef = await saveAcademyMediaData(
                              "video",
                              fileDataUrl,
                              file.type
                            );

                            const nextVideoUpdates: Parameters<typeof updateVideo>[1] = {
                              videoUrl: mediaRef,
                              resolvedVideoUrl: fileDataUrl,
                              title: video.title || file.name.replace(/\.[^.]+$/, "")
                            };

                            if (
                              shouldAutoGenerateThumbnail(
                                video.thumbnailUrl ?? "",
                                video.resolvedThumbnailUrl
                              )
                            ) {
                              const autoThumbnail = await captureVideoThumbnail(fileDataUrl);
                              const thumbnailRef = await saveAcademyMediaData(
                                "thumbnail",
                                autoThumbnail,
                                "image/jpeg"
                              );

                              nextVideoUpdates.thumbnailUrl = thumbnailRef;
                              nextVideoUpdates.resolvedThumbnailUrl = autoThumbnail;
                            }

                            updateVideo(video.id, nextVideoUpdates);
                            setVideoFeedback(video.id, {
                              tone: "success",
                              message:
                                nextVideoUpdates.resolvedThumbnailUrl
                                  ? "Replacement video prepared successfully. Preview and thumbnail updated."
                                  : "Replacement video prepared successfully. Preview updated."
                            });
                          } catch {
                            setVideoFeedback(video.id, {
                              tone: "error",
                              message:
                                "That replacement video could not be prepared. Please try another file."
                            });
                          } finally {
                            setVideoTask(video.id, null);
                            event.target.value = "";
                          }
                        }}
                        style={fileInputStyle}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
                      <span>Upload replacement thumbnail</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];

                          if (!file) {
                            return;
                          }

                          const validationError = validateUploadFile(file, "image");

                          if (validationError) {
                            setVideoTask(video.id, null);
                            setVideoFeedback(video.id, {
                              tone: "error",
                              message: validationError
                            });
                            event.target.value = "";
                            return;
                          }

                          try {
                            setVideoTask(video.id, {
                              message: `Preparing ${file.name}...`,
                              progress: 10
                            });
                            const fileDataUrl = await readFileAsDataUrl(
                              file,
                              (progress) => {
                                setVideoTask(video.id, {
                                  message: `Preparing ${file.name}...`,
                                  progress
                                });
                              }
                            );
                            setVideoTask(video.id, {
                              message: "Saving thumbnail to browser storage...",
                              progress: 94
                            });
                            const mediaRef = await saveAcademyMediaData(
                              "thumbnail",
                              fileDataUrl,
                              file.type
                            );
                            updateVideo(video.id, {
                              thumbnailUrl: mediaRef,
                              resolvedThumbnailUrl: fileDataUrl
                            });
                            setVideoFeedback(video.id, {
                              tone: "success",
                              message:
                                "Custom thumbnail selected successfully. Preview updated."
                            });
                          } catch {
                            setVideoFeedback(video.id, {
                              tone: "error",
                              message:
                                "That thumbnail could not be loaded. Please try a different image."
                            });
                          } finally {
                            setVideoTask(video.id, null);
                            event.target.value = "";
                          }
                        }}
                        style={fileInputStyle}
                      />
                    </label>
                  </div>
                  <div className="academy-form-grid" style={{ marginTop: "1rem" }}>
                    <MediaPreviewPanel
                      title={video.title}
                      videoUrl={video.resolvedVideoUrl || video.videoUrl}
                      thumbnailUrl={
                        video.resolvedThumbnailUrl || video.thumbnailUrl || ""
                      }
                    />
                    <div style={previewPanelStyle}>
                      <span style={previewLabelStyle}>Current thumbnail</span>
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "16 / 9",
                          borderRadius: "1rem",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.58)), url('${getAcademyThumbnailUrl(video.videoUrl, video.thumbnailUrl)}') center/cover`
                        }}
                      />
                    </div>
                    <div style={previewPanelStyle}>
                      <span style={previewLabelStyle}>Playback source</span>
                      <strong style={{ color: "#eff6ff", fontSize: "1.05rem" }}>
                        {isAcademyMediaRef(video.videoUrl)
                          ? "Uploaded from this device"
                          : "External video link"}
                      </strong>
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(239,246,255,0.72)",
                          lineHeight: 1.7
                        }}
                      >
                        Save after pasting a new link and the Academy will format
                        supported YouTube, Vimeo, TikTok, and Instagram links
                        automatically when public embedding is allowed.
                      </p>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );

  const renderComments = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <div style={cardStyle}>
        <label style={{ display: "grid", gap: "0.45rem", color: "#eff6ff" }}>
          <span>Filter comments by video</span>
          <select
            value={commentsFilter}
            onChange={(event) => setCommentsFilter(event.target.value)}
            style={inputStyle}
          >
            <option value="all">All videos</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        {filteredComments.map((comment) => {
          const videoTitle = videos.find((video) => video.id === comment.videoId)?.title;

          return (
            <article key={comment.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: "1rem"
                }}
              >
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  <strong style={{ color: "#eff6ff" }}>{comment.userName}</strong>
                  <span style={{ color: "#7fc1ff" }}>{videoTitle}</span>
                  <span style={{ color: "rgba(239,246,255,0.62)" }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => toggleCommentVisibility(comment.id)}
                    style={secondaryButtonStyle}
                  >
                    {comment.isVisible ? "Hide" : "Unhide"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this item? This action cannot be undone."
                        )
                      ) {
                        deleteComment(comment.id);
                      }
                    }}
                    style={dangerButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p
                style={{
                  margin: "0.85rem 0 0",
                  color: "rgba(239,246,255,0.8)",
                  lineHeight: 1.8
                }}
              >
                {comment.commentText}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <div className="academy-admin-stats">
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "2rem" }}>
            {analytics.totalViews}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Total Views</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "2rem" }}>
            {analytics.totalVideos}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Total Videos</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "2rem" }}>
            {analytics.totalComments}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Total Comments</div>
        </div>
        <div style={cardStyle}>
          <strong style={{ color: "#eff6ff", fontSize: "1.2rem" }}>
            {analytics.mostWatchedVideo?.title ?? "No data yet"}
          </strong>
          <div style={{ color: "rgba(239,246,255,0.72)" }}>Most Watched Video</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
          Views Per Video
        </h2>
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Video</th>
                <th style={tableHeaderStyle}>Section</th>
                <th style={tableHeaderStyle}>Views</th>
                <th style={tableHeaderStyle}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {analytics.viewsPerVideo.map((video) => (
                <tr key={video.id}>
                  <td style={tableCellStyle}>{video.title}</td>
                  <td style={tableCellStyle}>
                    {getSectionById(video.sectionId)?.title ?? "Unknown"}
                  </td>
                  <td style={tableCellStyle}>{video.viewCount}</td>
                  <td style={tableCellStyle}>{video.commentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="academy-admin-two-col">
        <div style={cardStyle}>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
            Visitor Engagement Summary
          </h2>
          <p
            style={{
              margin: "0.85rem 0 0",
              color: "rgba(239,246,255,0.76)",
              lineHeight: 1.8
            }}
          >
            Visitors are engaging most with{" "}
            <strong style={{ color: "#eff6ff" }}>
              {analytics.mostWatchedVideo?.title ?? "your featured tutorial"}
            </strong>
            . The top section right now is{" "}
            <strong style={{ color: "#eff6ff" }}>
              {analytics.topPerformingSection?.title ?? "still building data"}
            </strong>
            .
          </p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.3rem" }}>
            Recent Activity
          </h2>
          <div style={{ display: "grid", gap: "0.85rem", marginTop: "1rem" }}>
            {analytics.recentComments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.04)",
                  padding: "0.9rem"
                }}
              >
                <strong style={{ color: "#eff6ff" }}>{comment.userName}</strong>
                <div style={{ color: "#7fc1ff", marginTop: "0.15rem" }}>
                  {comment.videoTitle}
                </div>
                <div style={{ color: "rgba(239,246,255,0.68)", marginTop: "0.2rem" }}>
                  {new Date(comment.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AcademyProtected allowedRoles={["admin"]}>
      <AcademyPageLayout
        eyebrow="Admin Control"
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
                logout();
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
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              overflowX: "auto"
            }}
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

const inputStyle = {
  minHeight: "3rem",
  borderRadius: "0.9rem",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(8,17,29,0.45)",
  color: "#eff6ff",
  padding: "0.85rem 1rem"
} as const;

const textareaStyle = {
  minHeight: "7rem",
  borderRadius: "0.9rem",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(8,17,29,0.45)",
  color: "#eff6ff",
  padding: "0.85rem 1rem"
} as const;

const fileInputStyle = {
  minHeight: "3rem",
  borderRadius: "0.9rem",
  border: "1px dashed rgba(255,255,255,0.2)",
  background: "rgba(8,17,29,0.28)",
  color: "#eff6ff",
  padding: "0.7rem 1rem"
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
  borderRadius: "1rem",
  border: "1px solid rgba(255,255,255,0.12)",
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
