"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  detectAcademyVideoPlatform,
  getAcademyThumbnailUrl,
  getAcademyVideoPlatformLabel
} from "@/lib/academy-media";
import type { AcademyVideo } from "@/types/academy";

type AcademyVideoCardProps = {
  video: AcademyVideo;
  href: string;
};

export function AcademyVideoCard({ video, href }: AcademyVideoCardProps) {
  const storedThumbnailUrl =
    video.resolvedThumbnailUrl ||
    getAcademyThumbnailUrl(video.resolvedVideoUrl ?? video.videoUrl, video.thumbnailUrl);
  const platform = detectAcademyVideoPlatform(video.resolvedVideoUrl ?? video.videoUrl);
  const platformLabel = getAcademyVideoPlatformLabel(platform);
  const isVertical = platform === "tiktok" || platform === "instagram";
  const [remoteThumbnailUrl, setRemoteThumbnailUrl] = useState("");
  const thumbnailUrl = storedThumbnailUrl || remoteThumbnailUrl;

  useEffect(() => {
    setRemoteThumbnailUrl("");

    if (storedThumbnailUrl || platform !== "tiktok") {
      return;
    }

    let isMounted = true;

    async function loadTikTokThumbnail() {
      try {
        const response = await fetch("/api/academy/resolve-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: video.videoUrl })
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as { thumbnailUrl?: string };

        if (isMounted && result.thumbnailUrl) {
          setRemoteThumbnailUrl(result.thumbnailUrl);
        }
      } catch {
        // TikTok thumbnail lookup is best-effort. The designed fallback remains visible.
      }
    }

    void loadTikTokThumbnail();

    return () => {
      isMounted = false;
    };
  }, [platform, storedThumbnailUrl, video.videoUrl]);

  return (
    <Link
      href={href}
      className="academy-video-card"
      style={{
        display: "block",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "1.4rem",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
        boxShadow: "0 24px 70px rgba(8,17,29,0.18)",
        textDecoration: "none",
        transition:
          "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease"
      }}
    >
      <div
        className="academy-video-card-media"
        style={{
          minHeight: isVertical ? "260px" : "200px",
          backgroundImage: thumbnailUrl
            ? `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.58)), url('${thumbnailUrl}')`
            : isVertical
              ? "radial-gradient(circle at 50% 18%, rgba(34,211,238,0.22), transparent 28%), radial-gradient(circle at 70% 78%, rgba(246,193,91,0.2), transparent 30%), linear-gradient(145deg, rgba(7,17,30,1), rgba(18,34,52,0.98))"
              : "radial-gradient(circle at 50% 20%, rgba(246,193,91,0.24), transparent 30%), linear-gradient(135deg, rgba(18,34,52,0.98), rgba(8,17,29,0.98))",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          display: "grid",
          placeItems: "center"
        }}
      >
        {!thumbnailUrl ? (
          <div
            aria-hidden="true"
            style={{
              width: isVertical ? "118px" : "118px",
              aspectRatio: isVertical ? "9 / 16" : "16 / 9",
              borderRadius: isVertical ? "1.1rem" : "0.85rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
              boxShadow: "0 18px 45px rgba(0,0,0,0.32)",
              display: "grid",
              alignContent: "space-between",
              gap: "0.75rem",
              padding: isVertical ? "0.8rem" : "0.65rem",
              textAlign: "center"
            }}
          >
            <span
              style={{
                justifySelf: "center",
                width: "32px",
                height: "4px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.35)"
              }}
            />
            <strong
              style={{
                color: "#eff6ff",
                fontSize: isVertical ? "0.8rem" : "0.72rem",
                lineHeight: 1.25,
                textShadow: "0 2px 16px rgba(0,0,0,0.45)"
              }}
            >
              {isVertical ? video.title : platformLabel}
            </strong>
            <span
              style={{
                justifySelf: "center",
                borderRadius: "999px",
                padding: "0.25rem 0.5rem",
                background: "rgba(246,193,91,0.16)",
                color: "#ffe7ae",
                fontSize: "0.66rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}
            >
              {isVertical ? "Reel lesson" : "Preview"}
            </span>
          </div>
        ) : null}
        <span
          style={{
            position: "absolute",
            left: "1rem",
            bottom: "1rem",
            display: "inline-flex",
            borderRadius: "999px",
            padding: "0.4rem 0.8rem",
            background: "rgba(8,17,29,0.62)",
            color: "#eff6ff",
            fontSize: "0.85rem",
            fontWeight: 700
          }}
        >
          {video.category}
        </span>
        <span
          style={{
            position: "absolute",
            right: "1rem",
            top: "1rem",
            display: "inline-flex",
            borderRadius: "999px",
            padding: "0.35rem 0.65rem",
            background: isVertical
              ? "rgba(246,193,91,0.18)"
              : "rgba(127,193,255,0.16)",
            color: isVertical ? "#ffe7ae" : "#bfdbfe",
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          }}
        >
          {isVertical ? `${platformLabel} reel` : platformLabel}
        </span>
      </div>
      <div className="academy-video-card-body" style={{ padding: "1.15rem 1.15rem 1.3rem" }}>
        <h3
          style={{
            margin: 0,
            color: "#eff6ff",
            fontSize: "1.15rem",
            lineHeight: 1.3
          }}
        >
          {video.title}
        </h3>
        <p
          style={{
            margin: "0.75rem 0 0",
            color: "rgba(239,246,255,0.76)",
            lineHeight: 1.7,
            fontSize: "0.96rem"
          }}
        >
          {video.description}
        </p>
        <div
          className="academy-video-card-footer"
          style={{
            marginTop: "1rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            color: "rgba(239,246,255,0.68)",
            fontSize: "0.88rem"
          }}
        >
          <span>{video.commentCount} comments</span>
          <span style={{ color: "#f6c15b", fontWeight: 700 }}>Watch video</span>
        </div>
      </div>
    </Link>
  );
}
