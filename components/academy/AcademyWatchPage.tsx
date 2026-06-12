"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAcademyThumbnailUrl } from "@/lib/academy-media";
import type { AcademyVideo } from "@/types/academy";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { useAcademy } from "./AcademyProvider";
import { AcademyVideoPlayer } from "./AcademyVideoPlayer";

type AcademyWatchPageProps = {
  videoId: string;
};

function NextLessonCard({
  nextVideo,
  currentSectionId
}: {
  nextVideo: AcademyVideo | null;
  currentSectionId?: string;
}) {
  if (!nextVideo) {
    return (
      <div
        style={{
          minHeight: "8.5rem",
          borderRadius: "1.4rem",
          border: "1px dashed rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.035)",
          padding: "1.2rem",
          color: "rgba(239,246,255,0.72)",
          display: "grid",
          alignContent: "center",
          lineHeight: 1.65
        }}
      >
        You are caught up for now. Return to EV Academy to choose another lesson.
      </div>
    );
  }

  const thumbnailUrl =
    nextVideo.resolvedThumbnailUrl ||
    getAcademyThumbnailUrl(
      nextVideo.resolvedVideoUrl ?? nextVideo.videoUrl,
      nextVideo.thumbnailUrl
    );

  return (
    <Link
      href={`/academy/watch/${nextVideo.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: thumbnailUrl ? "6.5rem minmax(0, 1fr)" : "1fr",
        gap: "1rem",
        alignItems: "center",
        minHeight: "8.5rem",
        borderRadius: "1.4rem",
        border: "1px solid rgba(246,193,91,0.2)",
        background:
          "linear-gradient(135deg, rgba(246,193,91,0.13), rgba(127,193,255,0.07))",
        color: "#eff6ff",
        textDecoration: "none",
        padding: "1rem"
      }}
    >
      {thumbnailUrl ? (
        <span
          aria-hidden="true"
          style={{
            width: "100%",
            aspectRatio: "16 / 10",
            borderRadius: "0.95rem",
            background: `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.58)), url('${thumbnailUrl}') center/cover`,
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        />
      ) : null}
      <span style={{ display: "grid", gap: "0.4rem" }}>
        <span
          style={{
            color: "#f6c15b",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.78rem"
          }}
        >
          {nextVideo.sectionId === currentSectionId
            ? "Next video in this section"
            : "Suggested next lesson"}
        </span>
        <strong style={{ fontSize: "1.08rem", lineHeight: 1.3 }}>
          {nextVideo.title}
        </strong>
        <span style={{ color: "rgba(239,246,255,0.68)", lineHeight: 1.55 }}>
          Continue learning without relying on platform recommendations.
        </span>
      </span>
    </Link>
  );
}

export function AcademyWatchPage({ videoId }: AcademyWatchPageProps) {
  const {
    currentUser,
    addComment,
    deleteComment,
    deleteOwnComment,
    getCommentsForVideo,
    getSectionById,
    getVideoById,
    getVideosForSection,
    incrementVideoView,
    toggleCommentVisibility,
    visibleVideos
  } = useAcademy();
  const [commentText, setCommentText] = useState("");
  const [hasCountedView, setHasCountedView] = useState(false);

  const video = getVideoById(videoId);
  const section = video ? getSectionById(video.sectionId) : undefined;
  const playbackVideoUrl = video?.resolvedVideoUrl ?? video?.videoUrl ?? "";
  const thumbnailUrl = video
    ? video.resolvedThumbnailUrl ||
      getAcademyThumbnailUrl(playbackVideoUrl, video.thumbnailUrl)
    : "";
  const sectionVideos = useMemo(
    () =>
      video
        ? getVideosForSection(video.sectionId, true).sort((a, b) => a.order - b.order)
        : [],
    [getVideosForSection, video]
  );
  const nextVideo = useMemo(() => {
    if (!video) {
      return null;
    }

    const currentIndex = sectionVideos.findIndex((item) => item.id === video.id);
    const nextInSection =
      currentIndex >= 0 ? sectionVideos[currentIndex + 1] : undefined;

    if (nextInSection) {
      return nextInSection;
    }

    return (
      visibleVideos
        .filter((item) => item.id !== video.id && item.sectionId !== video.sectionId)
        .sort((a, b) => a.order - b.order)[0] ?? null
    );
  }, [sectionVideos, video, visibleVideos]);
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
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                padding: "1rem",
                overflow: "hidden"
              }}
            >
              <AcademyVideoPlayer
                title={video.title}
                videoUrl={playbackVideoUrl}
                thumbnailUrl={thumbnailUrl}
              />

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

            <section
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
              }}
            >
              <NextLessonCard
                nextVideo={nextVideo}
                currentSectionId={video.sectionId}
              />
              <Link
                href={backHref}
                style={{
                  display: "grid",
                  alignContent: "center",
                  minHeight: "8.5rem",
                  borderRadius: "1.4rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                  color: "#eff6ff",
                  textDecoration: "none",
                  padding: "1.2rem"
                }}
              >
                <span style={{ color: "#f6c15b", fontWeight: 800 }}>
                  Back to Academy
                </span>
                <span
                  style={{
                    marginTop: "0.45rem",
                    color: "rgba(239,246,255,0.72)",
                    lineHeight: 1.6
                  }}
                >
                  Return to the learning hub to choose another section or tutorial.
                </span>
              </Link>
            </section>

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
