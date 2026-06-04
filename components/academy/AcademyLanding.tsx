"use client";

import Link from "next/link";
import { getAcademyRedirectForRole } from "@/lib/academy-auth";
import { getAcademyThumbnailUrl } from "@/lib/academy-media";
import { useAcademy } from "./AcademyProvider";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { AcademyVideoCard } from "./AcademyVideoCard";

export function AcademyLanding() {
  const {
    currentUser,
    featuredVideo,
    isReady,
    visibleSections,
    getVideosForSection
  } = useAcademy();

  const heroAction = currentUser ? (
    <Link
      href={getAcademyRedirectForRole(currentUser.role)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "3.2rem",
        padding: "0.9rem 1.5rem",
        borderRadius: "999px",
        background:
          "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
        color: "#0f172a",
        fontWeight: 700,
        textDecoration: "none",
        boxShadow: "0 22px 50px rgba(8,17,29,0.28)"
      }}
    >
      Go to My Academy
    </Link>
  ) : (
    <Link
      href={featuredVideo ? `/academy/watch/${featuredVideo.id}` : "/academy"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "3.2rem",
        padding: "0.9rem 1.5rem",
        borderRadius: "999px",
        background:
          "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
        color: "#0f172a",
        fontWeight: 700,
        textDecoration: "none",
        boxShadow: "0 22px 50px rgba(8,17,29,0.28)"
      }}
    >
      Explore Tutorials
    </Link>
  );
  const featuredThumbnailUrl = featuredVideo
    ? featuredVideo.resolvedThumbnailUrl ||
      getAcademyThumbnailUrl(
        featuredVideo.resolvedVideoUrl ?? featuredVideo.videoUrl,
        featuredVideo.thumbnailUrl
      )
    : "";

  return (
    <AcademyPageLayout
      eyebrow="Learning Hub"
      title="EV Academy"
      subtitle="Watch helpful driving tutorials, lesson previews, and road safety tips from EVs Driving Academy."
      actions={heroAction}
    >
      {!isReady ? (
        <div style={{ color: "#eff6ff" }}>Loading EV Academy...</div>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          <section
            style={{
              display: "grid",
              gap: "1.4rem",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)"
            }}
            className="academy-featured-grid"
          >
            <div
              style={{
                borderRadius: "1.5rem",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                minHeight: "360px",
                background: featuredVideo
                  ? `linear-gradient(180deg, rgba(8,17,29,0.08), rgba(8,17,29,0.68)), url('${featuredThumbnailUrl}') center/cover`
                  : "rgba(255,255,255,0.04)"
              }}
            />
            <article
              style={{
                borderRadius: "1.5rem",
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                padding: "1.5rem",
                color: "#eff6ff",
                display: "grid",
                gap: "0.9rem",
                alignContent: "start"
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  borderRadius: "999px",
                  padding: "0.42rem 0.8rem",
                  background: "rgba(127,193,255,0.14)",
                  color: "#7fc1ff",
                  fontSize: "0.88rem",
                  fontWeight: 700
                }}
              >
                Featured Tutorial
              </span>
              <h2 style={{ margin: 0, fontSize: "1.8rem" }}>
                {featuredVideo?.title ?? "EV Academy"}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "rgba(239,246,255,0.8)",
                  lineHeight: 1.8
                }}
              >
                {featuredVideo?.description ??
                  "No tutorial videos are available yet. Please check back soon."}
              </p>
              <p style={{ margin: 0, color: "rgba(239,246,255,0.72)" }}>
                Watch tutorials freely, and optionally sign in if you want to leave
                comments or access your Academy dashboard.
              </p>
            </article>
          </section>

          {visibleSections.length === 0 ? (
            <div
              style={{
                borderRadius: "1.4rem",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                padding: "1.6rem",
                color: "#eff6ff"
              }}
            >
              No tutorial videos are available yet. Please check back soon.
            </div>
          ) : (
            visibleSections.map((section) => {
              const sectionVideos = getVideosForSection(section.id, true).slice(0, 3);

              return (
                <section key={section.id} style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: 0, color: "#eff6ff", fontSize: "1.55rem" }}>
                      {section.title}
                    </h2>
                    <p
                      style={{
                        margin: "0.55rem 0 0",
                        color: "rgba(239,246,255,0.76)",
                        lineHeight: 1.75
                      }}
                    >
                      {section.description}
                    </p>
                  </div>
                  {sectionVideos.length === 0 ? (
                    <div
                      style={{
                        borderRadius: "1.2rem",
                        border: "1px dashed rgba(255,255,255,0.12)",
                        padding: "1.2rem",
                        color: "rgba(239,246,255,0.72)"
                      }}
                    >
                      Tutorial videos will be added soon.
                    </div>
                  ) : (
                    <div className="academy-video-grid">
                      {sectionVideos.map((video) => (
                        <AcademyVideoCard
                          key={video.id}
                          video={video}
                          href={`/academy/watch/${video.id}`}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      )}
    </AcademyPageLayout>
  );
}
