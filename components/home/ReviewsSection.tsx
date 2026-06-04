"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Quote, Star } from "lucide-react";

type Review = {
  id: string;
  quote: string;
  source: string;
};

type ReviewsSectionProps = {
  reviews: Review[];
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
};

function sanitizeReviewQuote(quote: string) {
  return quote
    .replaceAll("ðŸ’ª", "\u{1F4AA}")
    .replace(/\s+/g, " ")
    .replace("1ST", "1st")
    .trim();
}

function ReviewStars() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        gap: "0.28rem",
        color: "#f6c15b"
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={14} fill="currentColor" strokeWidth={1.8} />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  emphasis,
  reducedMotion
}: {
  review: Review;
  emphasis: "featured" | "supporting";
  reducedMotion: boolean;
}) {
  const featured = emphasis === "featured";
  const learnerLabel = featured ? "First-Time Learner" : "Learner Driver";
  const initials = featured ? "FL" : "LD";

  return (
    <motion.article
      variants={reducedMotion ? undefined : itemVariants}
      className={`review-card ${featured ? "review-card-featured" : "review-card-supporting"}`}
      style={{
        position: "relative",
        display: "grid",
        gap: featured ? "1.35rem" : "1rem",
        minHeight: featured ? "100%" : undefined,
        borderRadius: featured ? "1.9rem" : "1.55rem",
        border: "1px solid rgba(255,255,255,0.1)",
        background: featured
          ? "linear-gradient(180deg, rgba(18,34,52,0.96) 0%, rgba(10,20,32,0.98) 100%)"
          : "linear-gradient(180deg, rgba(17,29,45,0.92) 0%, rgba(10,19,30,0.96) 100%)",
        padding: featured ? "1.9rem" : "1.4rem",
        boxShadow: featured
          ? "0 28px 70px rgba(5,12,20,0.28)"
          : "0 20px 56px rgba(5,12,20,0.18)",
        overflow: "hidden"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: "100%",
          height: featured ? "4px" : "3px",
          background: featured
            ? "linear-gradient(90deg, rgba(246,193,91,0.92), rgba(127,193,255,0.35))"
            : "linear-gradient(90deg, rgba(127,193,255,0.55), rgba(246,193,91,0.3))"
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.85rem"
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: featured ? "3rem" : "2.6rem",
            height: featured ? "3rem" : "2.6rem",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#f6c15b"
          }}
        >
          <Quote size={featured ? 18 : 16} strokeWidth={2.1} />
        </span>

        <ReviewStars />
      </div>

      <p
        style={{
          margin: 0,
          maxWidth: featured ? "34rem" : "none",
          color: "#f8fbff",
          fontSize: featured ? "1.08rem" : "0.98rem",
          lineHeight: featured ? 1.95 : 1.82
        }}
      >
        "{sanitizeReviewQuote(review.quote)}"
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.85rem",
          marginTop: "0.15rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.78rem" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: featured ? "2.9rem" : "2.55rem",
              height: featured ? "2.9rem" : "2.55rem",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.1)",
              background:
                "linear-gradient(135deg, rgba(127,193,255,0.18), rgba(255,255,255,0.05))",
              color: "#eff6ff",
              fontWeight: 700,
              fontSize: "0.84rem",
              letterSpacing: "0.05em"
            }}
          >
            {initials}
          </span>

          <div style={{ display: "grid", gap: "0.18rem" }}>
            <span
              style={{
                color: "#eff6ff",
                fontWeight: 700,
                fontSize: featured ? "0.96rem" : "0.92rem"
              }}
            >
              {learnerLabel}
            </span>
            <span
              style={{
                color: "rgba(239,246,255,0.64)",
                fontSize: "0.84rem"
              }}
            >
              Student review
            </span>
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: "1px solid rgba(246,193,91,0.24)",
            background: "rgba(246,193,91,0.12)",
            color: "#ffe7ae",
            padding: "0.38rem 0.72rem",
            fontSize: "0.76rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap"
          }}
        >
          {review.source}
        </span>
      </div>
    </motion.article>
  );
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [featuredReview, ...supportingReviews] = reviews;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: "4.5rem",
        background:
          "linear-gradient(180deg, rgba(8,17,29,1) 0%, rgba(10,22,36,0.98) 100%)"
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 14% 18%, rgba(127,193,255,0.12), transparent 24%), radial-gradient(circle at 85% 80%, rgba(246,193,91,0.1), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.018), transparent 16%)",
          pointerEvents: "none"
        }}
      />

      <motion.div
        initial={reducedMotion ? false : "hidden"}
        whileInView={reducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.18 }}
        variants={reducedMotion ? undefined : containerVariants}
        className="reviews-section-inner"
        style={{
          width: "min(1140px, calc(100% - 2rem))",
          margin: "0 auto",
          padding: "5.5rem 0 6rem",
          position: "relative",
          zIndex: 1
        }}
      >
        <motion.div
          variants={reducedMotion ? undefined : itemVariants}
          className="reviews-header"
          style={{
            maxWidth: "41rem",
            display: "grid",
            gap: "0.9rem",
            marginBottom: "2.3rem"
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#f6c15b",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase"
            }}
          >
            Student Feedback
          </p>

          <h2
            id="reviews-heading"
            style={{
              margin: 0,
              maxWidth: "12ch",
              color: "#eff6ff",
              fontSize: "clamp(2.35rem, 4.5vw, 3.95rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              textWrap: "balance"
            }}
          >
            Real Reviews from Learner Drivers
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: "40rem",
              color: "rgba(239,246,255,0.76)",
              fontSize: "1.03rem",
              lineHeight: 1.82
            }}
          >
            Hear from students who trained with EVs Driving Academy and built
            confidence behind the wheel through calm, patient instruction.
          </p>
        </motion.div>

        <div className="reviews-layout">
          {featuredReview ? (
            <ReviewCard
              review={featuredReview}
              emphasis="featured"
              reducedMotion={reducedMotion}
            />
          ) : null}

          <motion.div
            variants={reducedMotion ? undefined : itemVariants}
            className="reviews-supporting"
          >
            {supportingReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                emphasis="supporting"
                reducedMotion={reducedMotion}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
