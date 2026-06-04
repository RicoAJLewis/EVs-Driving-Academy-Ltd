import Link from "next/link";
import { getAcademyThumbnailUrl } from "@/lib/academy-media";
import type { AcademyVideo } from "@/types/academy";

type AcademyVideoCardProps = {
  video: AcademyVideo;
  href: string;
};

export function AcademyVideoCard({ video, href }: AcademyVideoCardProps) {
  const thumbnailUrl =
    video.resolvedThumbnailUrl ||
    getAcademyThumbnailUrl(video.resolvedVideoUrl ?? video.videoUrl, video.thumbnailUrl);

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
        style={{
          height: "200px",
          backgroundImage: `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.58)), url('${thumbnailUrl}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative"
        }}
      >
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
      </div>
      <div style={{ padding: "1.15rem 1.15rem 1.3rem" }}>
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
