import type { CSSProperties, ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  rounded?: CSSProperties["borderRadius"];
};

export function Skeleton({
  className,
  style,
  width = "100%",
  height = "1rem",
  rounded = "999px"
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={["ev-skeleton", className].filter(Boolean).join(" ")}
      style={{
        width,
        height,
        borderRadius: rounded,
        ...style
      }}
    />
  );
}

export function SkeletonCard({
  children,
  className,
  style
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        borderRadius: "1.4rem",
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
        padding: "1.15rem",
        display: "grid",
        gap: "0.85rem",
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function SkeletonVideoCard({ vertical = false }: { vertical?: boolean }) {
  return (
    <SkeletonCard className="academy-video-card">
      <Skeleton
        height={vertical ? "16.5rem" : "12.5rem"}
        rounded="1.05rem"
        style={{
          background:
            vertical
              ? "linear-gradient(135deg, rgba(8,17,29,0.98), rgba(28,44,64,0.95))"
              : undefined
        }}
      />
      <Skeleton width="42%" height="0.85rem" />
      <Skeleton width="88%" height="1.15rem" />
      <Skeleton width="68%" height="1.15rem" />
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <Skeleton width="34%" height="0.9rem" />
        <Skeleton width="28%" height="0.9rem" />
      </div>
    </SkeletonCard>
  );
}

export function SkeletonFeaturedVideo() {
  return (
    <section
      className="academy-featured-grid"
      style={{
        display: "grid",
        gap: "1.4rem",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)"
      }}
    >
      <Skeleton height="22.5rem" rounded="1.5rem" />
      <SkeletonCard style={{ alignContent: "start", padding: "1.5rem" }}>
        <Skeleton width="38%" height="1.75rem" />
        <Skeleton width="88%" height="2rem" rounded="0.7rem" />
        <Skeleton width="96%" height="1rem" />
        <Skeleton width="80%" height="1rem" />
        <Skeleton width="46%" height="3rem" rounded="999px" />
      </SkeletonCard>
    </section>
  );
}

export function SkeletonAcademySections({ count = 2 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      {Array.from({ length: count }).map((_, sectionIndex) => (
        <section key={sectionIndex} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            <Skeleton width="32%" height="1.75rem" rounded="0.7rem" />
            <Skeleton width="54%" height="1rem" />
          </div>
          <div className="academy-video-grid">
            <SkeletonVideoCard />
            <SkeletonVideoCard vertical={sectionIndex % 2 === 0} />
            <SkeletonVideoCard />
          </div>
        </section>
      ))}
    </div>
  );
}

export function SkeletonReviewCard() {
  return (
    <SkeletonCard className="review-card" style={{ minHeight: "13rem" }}>
      <Skeleton width="44%" height="1rem" />
      <Skeleton width="34%" height="1.1rem" />
      <Skeleton width="100%" height="0.95rem" />
      <Skeleton width="92%" height="0.95rem" />
      <Skeleton width="70%" height="0.95rem" />
      <Skeleton width="38%" height="0.85rem" />
    </SkeletonCard>
  );
}

export function SkeletonMessageThread() {
  return (
    <div className="academy-message-thread-card" aria-hidden="true">
      <Skeleton width="48%" height="1rem" />
      <Skeleton width="72%" height="0.8rem" />
      <Skeleton width="92%" height="0.9rem" />
      <Skeleton width="36%" height="0.8rem" />
    </div>
  );
}

export function SkeletonMessageBubble({ mine = false }: { mine?: boolean }) {
  return (
    <div
      className={`academy-admin-message-bubble ${mine ? "is-admin" : "is-student"}`}
      aria-hidden="true"
      style={{ minWidth: "min(72%, 22rem)" }}
    >
      <Skeleton width="100%" height="0.9rem" />
      <Skeleton width="74%" height="0.9rem" />
      <Skeleton width="32%" height="0.7rem" />
    </div>
  );
}

export function SkeletonVideoPlayer({ vertical = false }: { vertical?: boolean }) {
  return (
    <Skeleton
      height={vertical ? undefined : "min(58vw, 34rem)"}
      rounded={vertical ? "1.45rem" : "1.2rem"}
      style={{
        aspectRatio: vertical ? "9 / 16" : "16 / 9",
        maxWidth: vertical ? "min(100%, 26rem)" : "100%",
        margin: vertical ? "0 auto" : 0,
        minHeight: vertical ? undefined : "18rem"
      }}
    />
  );
}

export function SkeletonAdminRows({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonCard key={index} style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <Skeleton width="35%" height="1.1rem" />
            <Skeleton width="20%" height="1.7rem" />
          </div>
          <Skeleton width="90%" height="0.9rem" />
          <Skeleton width="62%" height="0.9rem" />
        </SkeletonCard>
      ))}
    </div>
  );
}
