"use client";

import Link from "next/link";
import { type CSSProperties, useRef, useState } from "react";
import {
  canEmbedAcademyVideo,
  detectAcademyVideoPlatform,
  getAcademyThumbnailUrl,
  getAcademyVideoPlatformLabel,
  getAcademyVideoRenderMode,
  normalizeAcademyVideoUrl,
  type AcademyVideoPlatform
} from "@/lib/academy-media";

type AcademyVideoPlayerProps = {
  videoUrl: string;
  title: string;
  thumbnailUrl?: string;
  variant?: "watch" | "preview";
  className?: string;
};

function isVerticalPlatform(platform: AcademyVideoPlatform) {
  return platform === "tiktok" || platform === "instagram";
}

function getExternalButtonText(platform: AcademyVideoPlatform) {
  if (platform === "tiktok") {
    return "Open on TikTok";
  }

  if (platform === "instagram") {
    return "Open on Instagram";
  }

  return "Open video externally";
}

function NativeVideoPlayer({
  src,
  poster,
  title,
  frameStyle,
  mediaStyle
}: {
  src: string;
  poster?: string;
  title: string;
  frameStyle: CSSProperties;
  mediaStyle: CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const maxTime = Number.isFinite(video.duration)
      ? video.duration
      : video.currentTime + Math.abs(seconds);

    video.currentTime = Math.max(0, Math.min(maxTime, video.currentTime + seconds));
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div style={frameStyle}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        aria-label={title}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controls={false}
        style={mediaStyle}
      />
      <div
        style={{
          position: "absolute",
          left: "0.75rem",
          right: "0.75rem",
          bottom: "0.75rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
          borderRadius: "999px",
          padding: "0.45rem",
          background: "rgba(3,7,18,0.72)",
          backdropFilter: "blur(12px)"
        }}
      >
        {[
          { label: "-5s", action: () => skip(-5) },
          { label: isPlaying ? "Pause" : "Play", action: togglePlay },
          { label: "+5s", action: () => skip(5) },
          { label: isMuted ? "Unmute" : "Mute", action: toggleMute }
        ].map((control) => (
          <button
            key={control.label}
            type="button"
            onClick={() => void control.action()}
            style={{
              minHeight: "2.25rem",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              color: "#eff6ff",
              fontWeight: 800,
              padding: "0.45rem 0.7rem",
              cursor: "pointer"
            }}
          >
            {control.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AcademyVideoPlayer({
  videoUrl,
  title,
  thumbnailUrl = "",
  variant = "watch",
  className
}: AcademyVideoPlayerProps) {
  const platform = detectAcademyVideoPlatform(videoUrl);
  const normalizedVideoUrl = normalizeAcademyVideoUrl(videoUrl);
  const displayThumbnailUrl =
    thumbnailUrl || getAcademyThumbnailUrl(normalizedVideoUrl, thumbnailUrl);
  const renderMode = getAcademyVideoRenderMode(normalizedVideoUrl);
  const platformLabel = getAcademyVideoPlatformLabel(platform);
  const vertical = isVerticalPlatform(platform);
  const embeddable =
    canEmbedAcademyVideo(videoUrl) || canEmbedAcademyVideo(normalizedVideoUrl);
  const maxWidth = vertical
    ? variant === "preview"
      ? "min(100%, 340px)"
      : "min(100%, 460px)"
    : "100%";
  const minHeight = variant === "preview" ? "260px" : "520px";
  const playerTitle = `${variant === "preview" ? "Preview" : "Watch"} ${platformLabel} tutorial: ${title}`;

  const frameStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth,
    margin: vertical ? "0 auto" : 0,
    aspectRatio: vertical ? "9 / 16" : "16 / 9",
    minHeight: vertical ? undefined : minHeight,
    borderRadius: vertical ? "1.35rem" : "1.2rem",
    overflow: "hidden",
    border: vertical
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.08)",
    background:
      "radial-gradient(circle at 50% 0%, rgba(127,193,255,0.14), transparent 30%), #030712",
    boxShadow: vertical
      ? "inset 0 0 0 7px rgba(255,255,255,0.032)"
      : "0 24px 72px rgba(0,0,0,0.25)"
  };

  const mediaStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    minHeight: vertical ? undefined : minHeight,
    border: 0,
    background: "#030712"
  };

  const embedMediaStyle: CSSProperties = {
    ...mediaStyle,
    height:
      platform === "tiktok"
        ? variant === "preview"
          ? "calc(100% + 72px)"
          : "calc(100% + 96px)"
        : mediaStyle.height,
    transform:
      platform === "tiktok"
        ? variant === "preview"
          ? "translateY(-28px)"
          : "translateY(-42px)"
        : undefined
  };

  const fallback = (
    <div
      style={{
        ...frameStyle,
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        backgroundImage: displayThumbnailUrl
          ? `linear-gradient(180deg, rgba(8,17,29,0.2), rgba(8,17,29,0.82)), url('${displayThumbnailUrl}')`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div style={{ maxWidth: "28rem", textAlign: "center" }}>
        <strong style={{ color: "#eff6ff", fontSize: "1.15rem" }}>
          {platform === "tiktok"
            ? "This video may need to be opened on TikTok."
            : platform === "instagram"
              ? "This video may need to be opened on Instagram."
              : "This external video cannot be embedded here."}
        </strong>
        <p
          style={{
            margin: "0.7rem 0 1rem",
            color: "rgba(239,246,255,0.76)",
            lineHeight: 1.65
          }}
        >
          Some platforms limit inline playback. The tutorial link is still saved
          and can be opened safely in a new tab.
        </p>
        <Link
          href={videoUrl || normalizedVideoUrl || "#"}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "2.8rem",
            borderRadius: "999px",
            padding: "0.75rem 1rem",
            background:
              "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
            color: "#0f172a",
            fontWeight: 800,
            textDecoration: "none"
          }}
        >
          {getExternalButtonText(platform)}
        </Link>
      </div>
    </div>
  );

  const playerBody =
    renderMode === "placeholder" ? (
      <div
        style={{
          ...frameStyle,
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          backgroundImage: displayThumbnailUrl
            ? `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.68)), url('${displayThumbnailUrl}')`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center"
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
            Replace this placeholder embed link with your real tutorial URL to
            make the video playable here.
          </p>
        </div>
      </div>
    ) : renderMode === "file" ? (
      <NativeVideoPlayer
        src={normalizedVideoUrl}
        poster={displayThumbnailUrl || undefined}
        title={playerTitle}
        frameStyle={frameStyle}
        mediaStyle={mediaStyle}
      />
    ) : embeddable ? (
      <div style={frameStyle}>
        <iframe
          src={normalizedVideoUrl}
          title={playerTitle}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          scrolling={vertical ? "no" : undefined}
          style={embedMediaStyle}
        />
      </div>
    ) : (
      fallback
    );

  const wrappedPlayer = vertical ? (
    <div
      className="academy-video-player-shell academy-video-player-shell-vertical"
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        borderRadius: "2rem",
        padding: variant === "preview" ? "0.7rem" : "0.9rem",
        background:
          "linear-gradient(180deg, rgba(16,29,45,0.98), rgba(3,7,18,0.98))",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 30px 90px rgba(0,0,0,0.42)"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.1rem 0.35rem 0.7rem",
          color: "rgba(239,246,255,0.76)",
          fontSize: "0.76rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        <span>EV Academy Lesson</span>
        <span>{platformLabel}</span>
      </div>
      {playerBody}
    </div>
  ) : (
    playerBody
  );

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: "0.75rem",
        justifyItems: vertical ? "center" : "stretch"
      }}
    >
      <span
        style={{
          justifySelf: vertical ? "center" : "start",
          display: "inline-flex",
          borderRadius: "999px",
          padding: "0.38rem 0.72rem",
          background: vertical ? "rgba(246,193,91,0.14)" : "rgba(127,193,255,0.14)",
          color: vertical ? "#ffe7ae" : "#7fc1ff",
          fontSize: "0.78rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        {vertical ? `${platformLabel} vertical player` : `${platformLabel} player`}
      </span>

      {wrappedPlayer}

      {vertical ? (
        <p
          style={{
            maxWidth,
            margin: 0,
            color: "rgba(239,246,255,0.62)",
            fontSize: "0.9rem",
            lineHeight: 1.55,
            textAlign: "center"
          }}
        >
          {platformLabel} controls are handled inside the player. For full EV
          Academy controls like skip and mute, use a direct playback URL from a
          video hosting service.
        </p>
      ) : null}
    </div>
  );
}
