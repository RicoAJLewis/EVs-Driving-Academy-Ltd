"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getAcademyThumbnailUrl } from "@/lib/academy-media";
import { AcademyProtected } from "./AcademyProtected";
import { AcademyPageLayout } from "./AcademyPageLayout";
import { AcademyVideoCard } from "./AcademyVideoCard";
import { useAcademy } from "./AcademyProvider";

export function VisitorDashboard() {
  const { currentUser, featuredVideo, visibleSections, getVideosForSection } =
    useAcademy();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSections = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return visibleSections;
    }

    return visibleSections.filter((section) => {
      const sectionMatch =
        section.title.toLowerCase().includes(normalizedSearch) ||
        section.description.toLowerCase().includes(normalizedSearch);
      const videoMatch = getVideosForSection(section.id, true).some((video) =>
        [video.title, video.description, video.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      );

      return sectionMatch || videoMatch;
    });
  }, [getVideosForSection, searchTerm, visibleSections]);
  const featuredThumbnailUrl = featuredVideo
    ? featuredVideo.resolvedThumbnailUrl ||
      getAcademyThumbnailUrl(
        featuredVideo.resolvedVideoUrl ?? featuredVideo.videoUrl,
        featuredVideo.thumbnailUrl
      )
    : "";

  return (
    <AcademyProtected allowedRoles={["visitor"]}>
      <AcademyPageLayout
        eyebrow="Visitor Dashboard"
        title="EV Academy"
        subtitle="Watch helpful driving tutorials, lesson previews, and road safety tips from EVs Driving Academy."
        actions={
          currentUser ? (
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
              Welcome, {currentUser.name}
            </span>
          ) : null
        }
      >
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
                minHeight: "360px",
                border: "1px solid rgba(255,255,255,0.08)",
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
                gap: "1rem",
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
                Featured Video
              </span>
              <h2 style={{ margin: 0, fontSize: "1.8rem" }}>
                {featuredVideo?.title ?? "No tutorial videos available yet"}
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
              {featuredVideo ? (
                <Link
                  href={`/academy/watch/${featuredVideo.id}`}
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "3rem",
                    padding: "0.8rem 1.3rem",
                    borderRadius: "999px",
                    background:
                      "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
                    color: "#0f172a",
                    fontWeight: 700,
                    textDecoration: "none"
                  }}
                >
                  Watch featured tutorial
                </Link>
              ) : null}
            </article>
          </section>

          <section style={{ display: "grid", gap: "0.9rem" }}>
            <label
              htmlFor="academy-search"
              style={{ color: "#eff6ff", fontWeight: 700 }}
            >
              Search tutorials
            </label>
            <input
              id="academy-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, category, or section..."
              style={{
                minHeight: "3.1rem",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(8,17,29,0.45)",
                color: "#eff6ff",
                padding: "0.9rem 1rem"
              }}
            />
          </section>

          {filteredSections.length === 0 ? (
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
            filteredSections.map((section) => {
              const sectionVideos = getVideosForSection(section.id, true);

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
      </AcademyPageLayout>
    </AcademyProtected>
  );
}
