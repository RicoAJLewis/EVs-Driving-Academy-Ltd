"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getAcademyThumbnailUrl,
  getAcademyVideoRenderMode,
  normalizeAcademyVideoUrl
} from "@/lib/academy-media";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { useAcademy } from "./AcademyProvider";

type AcademyWatchPageProps = {
  videoId: string;
};

export function AcademyWatchPage({ videoId }: AcademyWatchPageProps) {
  const {
    currentUser,
    addComment,
    deleteComment,
    deleteOwnComment,
    getCommentsForVideo,
    getSectionById,
    getVideoById,
    incrementVideoView,
    toggleCommentVisibility
  } = useAcademy();
  const [commentText, setCommentText] = useState("");
  const [hasCountedView, setHasCountedView] = useState(false);

  const video = getVideoById(videoId);
  const section = video ? getSectionById(video.sectionId) : undefined;
  const playbackVideoUrl = video?.resolvedVideoUrl ?? video?.videoUrl ?? "";
  const normalizedVideoUrl = video ? normalizeAcademyVideoUrl(playbackVideoUrl) : "";
  const videoRenderMode = video
    ? getAcademyVideoRenderMode(normalizedVideoUrl)
    : "placeholder";
  const thumbnailUrl = video
    ? video.resolvedThumbnailUrl ||
      getAcademyThumbnailUrl(normalizedVideoUrl, video.thumbnailUrl)
    : "";
  const comments = useMemo(
    () =>
      getCommentsForVideo(
        videoId,
        currentUser?.role === "admin"
      ),
    [currentUser?.role, getCommentsForVideo, videoId]
  );

  useEffect(() => {
    if (!video || hasCountedView) {
      return;
    }

    incrementVideoView(video.id);
    setHasCountedView(true);
  }, [hasCountedView, incrementVideoView, video]);

  const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser || !commentText.trim()) {
      return;
    }

    await addComment(videoId, commentText);
    setCommentText("");
  };

  const backHref =
    currentUser?.role === "admin"
      ? "/academy/admin"
      : currentUser?.role === "student" || currentUser?.role === "visitor"
        ? "/academy/dashboard"
        : "/academy";

  return (
    <AcademyPageLayout
      eyebrow="Tutorial Watch"
      title={video?.title ?? "EV Academy Video"}
      subtitle={
        video?.description ??
        "This tutorial could not be found. Please return to the Academy dashboard."
      }
      actions={
        <Link
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "3rem",
            padding: "0.8rem 1.2rem",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#eff6ff",
            textDecoration: "none",
            fontWeight: 700
          }}
        >
          Back to Academy
        </Link>
      }
    >
      {!video ? (
        <div
          style={{
            borderRadius: "1.4rem",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            padding: "1.6rem",
            color: "#eff6ff"
          }}
        >
          This tutorial could not be found.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.6rem" }}>
            <article
              style={{
                borderRadius: "1.5rem",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)"
              }}
            >
              {videoRenderMode === "placeholder" ? (
                <div
                  style={{
                    minHeight: "420px",
                    backgroundImage: `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.68)), url('${thumbnailUrl}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "grid",
                    placeItems: "center",
                    padding: "2rem"
                  }}
                >
                  <div style={{ maxWidth: "34rem", textAlign: "center" }}>
                    <h2 style={{ color: "#eff6ff", margin: 0 }}>Video placeholder</h2>
                    <p
                      style={{
                        color: "rgba(239,246,255,0.78)",
                        lineHeight: 1.8,
                        margin: "0.9rem 0 0"
                      }}
                    >
                      Replace this placeholder embed link with your real tutorial
                      URL to make the video playable here.
                    </p>
                  </div>
                </div>
              ) : videoRenderMode === "file" ? (
                <video
                  src={normalizedVideoUrl}
                  poster={thumbnailUrl || undefined}
                  controls
                  preload="metadata"
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: "520px",
                    background: "#030712"
                  }}
                />
              ) : (
                <iframe
                  src={normalizedVideoUrl}
                  title={`Watch tutorial: ${video.title}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: "520px",
                    border: 0
                  }}
                />
              )}

              <div style={{ padding: "1.4rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    alignItems: "center"
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      borderRadius: "999px",
                      padding: "0.42rem 0.8rem",
                      background: "rgba(127,193,255,0.14)",
                      color: "#7fc1ff",
                      fontWeight: 700
                    }}
                  >
                    {video.category}
                  </span>
                  <span style={{ color: "rgba(239,246,255,0.68)" }}>
                    {section?.title ?? "Unknown Section"}
                  </span>
                  <span style={{ color: "rgba(239,246,255,0.68)" }}>
                    {video.viewCount} views
                  </span>
                </div>
              </div>
            </article>

            <section style={{ display: "grid", gap: "1rem" }}>
              <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.5rem" }}>
                Comments
              </h2>

              {currentUser ? (
                <form
                  onSubmit={handleSubmitComment}
                  style={{
                    borderRadius: "1.4rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                    padding: "1.2rem"
                  }}
                >
                  <label
                    htmlFor="academy-comment"
                    style={{ display: "grid", gap: "0.6rem", color: "#eff6ff" }}
                  >
                    <span>Write a comment about this video...</span>
                    <textarea
                      id="academy-comment"
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      rows={4}
                      placeholder="Write a comment about this video..."
                      style={{
                        minHeight: "7rem",
                        borderRadius: "0.9rem",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(8,17,29,0.45)",
                        color: "#eff6ff",
                        padding: "0.9rem 1rem"
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    style={{
                      marginTop: "1rem",
                      minHeight: "3rem",
                      borderRadius: "999px",
                      padding: "0.8rem 1.2rem",
                      border: 0,
                      background:
                        "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
                      color: "#0f172a",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Submit Comment
                  </button>
                </form>
              ) : (
                <div
                  style={{
                    borderRadius: "1.4rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                    padding: "1.2rem",
                    color: "#eff6ff"
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(239,246,255,0.78)",
                      lineHeight: 1.75
                    }}
                  >
                    Watching tutorials does not require a login. If you want to leave
                    a comment, please sign in first.
                  </p>
                  <Link
                    href="/academy/login"
                    style={{
                      display: "inline-flex",
                      marginTop: "1rem",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "3rem",
                      padding: "0.8rem 1.2rem",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
                      color: "#0f172a",
                      textDecoration: "none",
                      fontWeight: 700
                    }}
                  >
                    Login to Comment
                  </Link>
                </div>
              )}

              {comments.length === 0 ? (
                <div
                  style={{
                    borderRadius: "1.2rem",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    padding: "1.2rem",
                    color: "rgba(239,246,255,0.72)"
                  }}
                >
                  No comments yet. Be the first to share a thought.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.9rem" }}>
                  {comments.map((comment) => (
                    <article
                      key={comment.id}
                      style={{
                        borderRadius: "1.2rem",
                        border: "1px solid rgba(255,255,255,0.08)",
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
                        <div>
                          <strong style={{ color: "#eff6ff" }}>{comment.userName}</strong>
                          <div
                            style={{
                              marginTop: "0.18rem",
                              color: "rgba(239,246,255,0.62)"
                            }}
                          >
                            {new Date(comment.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                          {currentUser?.id === comment.userId ? (
                            <button
                              type="button"
                              onClick={() => deleteOwnComment(comment.id)}
                              style={secondaryButtonStyle}
                            >
                              Delete My Comment
                            </button>
                          ) : null}

                          {currentUser?.role === "admin" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleCommentVisibility(comment.id)}
                                style={secondaryButtonStyle}
                              >
                                {comment.isVisible ? "Hide" : "Unhide"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteComment(comment.id)}
                                style={dangerButtonStyle}
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <p
                        style={{
                          margin: "0.8rem 0 0",
                          color: comment.isVisible
                            ? "rgba(239,246,255,0.8)"
                            : "rgba(239,246,255,0.42)",
                          lineHeight: 1.75
                        }}
                      >
                        {comment.commentText}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
        </div>
      )}
    </AcademyPageLayout>
  );
}

const secondaryButtonStyle = {
  minHeight: "2.5rem",
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
