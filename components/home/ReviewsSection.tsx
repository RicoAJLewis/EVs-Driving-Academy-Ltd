"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import {
  type ReviewSource,
  type SiteReview
} from "@/lib/reviews-data";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { AcademyUser } from "@/types/academy";

const ALL_REVIEWS_FILTER = "All Reviews";
const WEBSITE_REVIEW_SOURCE = "EVs Driving Academy Ltd";
const SETMORE_REVIEW_SOURCE = "Setmore";

type ReviewFilter = typeof ALL_REVIEWS_FILTER | ReviewSource;

type ReviewsSectionProps = {
  setmoreReviews: SiteReview[];
};

const filterOptions: ReviewFilter[] = [
  ALL_REVIEWS_FILTER,
  WEBSITE_REVIEW_SOURCE,
  SETMORE_REVIEW_SOURCE
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
};

type SupabaseReviewRow = {
  id: string;
  reviewer_name: string | null;
  rating: number | null;
  comment: string | null;
  source: string | null;
  is_published?: boolean | null;
  created_at: string | null;
};

type SupabaseErrorDetails = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function getDisplayNameFromSessionUser(user: {
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return (
    metadataName.trim() ||
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "EV Academy Visitor"
  );
}

function getRoleFromSessionUser(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  return user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin"
    ? "admin"
    : "student";
}

function toSiteReview(row: SupabaseReviewRow): SiteReview {
  return {
    id: row.id,
    name: row.reviewer_name?.trim() || "EV Academy Student",
    rating: Math.min(Math.max(row.rating ?? 5, 1), 5),
    comment: row.comment?.trim() || "",
    source: WEBSITE_REVIEW_SOURCE,
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        })
      : undefined
  };
}

function normalizeReviewSource(source: unknown): ReviewSource {
  if (typeof source !== "string") {
    return WEBSITE_REVIEW_SOURCE;
  }

  const normalizedSource = source.trim().toLowerCase();

  if (normalizedSource.includes("setmore")) {
    return SETMORE_REVIEW_SOURCE;
  }

  return WEBSITE_REVIEW_SOURCE;
}

function normalizeSiteReview(review: SiteReview): SiteReview {
  return {
    ...review,
    name: review.name?.trim() || "EV Academy Student",
    rating: Math.min(Math.max(Number(review.rating) || 5, 1), 5),
    comment: review.comment?.trim() || "",
    source: normalizeReviewSource(review.source)
  };
}

function formatReviewError(error: SupabaseErrorDetails | null | undefined) {
  if (!error) {
    return "Unable to submit your review.";
  }

  return [
    error.message,
    error.code ? `Code: ${error.code}` : "",
    error.details ? `Details: ${error.details}` : "",
    error.hint ? `Hint: ${error.hint}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function Stars({
  rating,
  interactive = false,
  onChange
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  return (
    <div
      aria-label={interactive ? "Select star rating" : `${rating} out of 5 stars`}
      role={interactive ? "radiogroup" : undefined}
      style={{ display: "flex", gap: "0.3rem", color: "#f6c15b" }}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= rating;

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={starValue === rating}
              aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
              onClick={() => onChange?.(starValue)}
              className="review-star-button"
            >
              <Star
                size={22}
                fill={filled ? "currentColor" : "transparent"}
                strokeWidth={1.9}
              />
            </button>
          );
        }

        return (
          <Star
            key={starValue}
            aria-hidden="true"
            size={15}
            fill={filled ? "currentColor" : "transparent"}
            strokeWidth={1.8}
          />
        );
      })}
    </div>
  );
}

function ReviewCard({
  review,
  reducedMotion
}: {
  review: SiteReview;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="review-card"
      style={{
        position: "relative",
        display: "grid",
        gap: "1rem",
        borderRadius: "1.1rem",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(18,34,52,0.94) 0%, rgba(10,20,32,0.98) 100%)",
        padding: "1.35rem",
        boxShadow: "0 22px 58px rgba(5,12,20,0.2)",
        overflow: "hidden"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: "100%",
          height: "3px",
          background:
            review.source === "Setmore"
              ? "linear-gradient(90deg, rgba(246,193,91,0.9), rgba(127,193,255,0.25))"
              : "linear-gradient(90deg, rgba(127,193,255,0.7), rgba(246,193,91,0.32))"
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
        <Quote aria-hidden="true" size={19} color="#f6c15b" strokeWidth={2.1} />
        <Stars rating={review.rating} />
      </div>

      <p
        style={{
          margin: 0,
          color: "#f8fbff",
          fontSize: "0.98rem",
          lineHeight: 1.8
        }}
      >
        "{review.comment}"
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          marginTop: "0.2rem"
        }}
      >
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <strong style={{ color: "#eff6ff", fontSize: "0.98rem" }}>
            {review.name}
          </strong>
          {review.date ? (
            <span style={{ color: "rgba(239,246,255,0.58)", fontSize: "0.82rem" }}>
              {review.date}
            </span>
          ) : null}
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
            padding: "0.36rem 0.62rem",
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap"
          }}
        >
          Source: {review.source}
        </span>
      </div>
    </motion.article>
  );
}

export function ReviewsSection({ setmoreReviews }: ReviewsSectionProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [currentUser, setCurrentUser] = useState<AcademyUser | null>(null);
  const [websiteReviews, setWebsiteReviews] = useState<SiteReview[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<ReviewFilter>(ALL_REVIEWS_FILTER);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    const loadReviewsAndSession = async () => {
      const [{ data: sessionData }, { data: reviewRows, error: reviewError }] =
        await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("reviews")
            .select(
              "id, reviewer_name, rating, comment, source, is_published, created_at"
            )
            .eq("is_published", true)
            .order("created_at", { ascending: false })
        ]);

      if (!isMounted) {
        return;
      }

      const sessionUser = sessionData.session?.user;

      setCurrentUser(
        sessionUser
          ? {
              id: sessionUser.id,
              name: getDisplayNameFromSessionUser(sessionUser),
              email: sessionUser.email ?? "",
              role: getRoleFromSessionUser(sessionUser)
            }
          : null
      );

      if (reviewError) {
        setStatusMessage(`Unable to load website reviews: ${reviewError.message}`);
      } else {
        setWebsiteReviews((reviewRows ?? []).map(toSiteReview));
      }
    };

    void loadReviewsAndSession();

    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      const sessionUser = session?.user;

      setCurrentUser(
        sessionUser
          ? {
              id: sessionUser.id,
              name: getDisplayNameFromSessionUser(sessionUser),
              email: sessionUser.email ?? "",
              role: getRoleFromSessionUser(sessionUser)
            }
          : null
      );
    });

    return () => {
      isMounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  const normalizedSetmoreReviews = useMemo(
    () => setmoreReviews.map(normalizeSiteReview),
    [setmoreReviews]
  );

  const allReviews = useMemo(() => {
    return [...websiteReviews.map(normalizeSiteReview), ...normalizedSetmoreReviews];
  }, [normalizedSetmoreReviews, websiteReviews]);

  const filteredReviews = useMemo(() => {
    const normalizedFilter =
      activeFilter === ALL_REVIEWS_FILTER
        ? ALL_REVIEWS_FILTER
        : normalizeReviewSource(activeFilter);

    if (normalizedFilter === ALL_REVIEWS_FILTER) {
      return allReviews;
    }

    return allReviews.filter(
      (review) => normalizeReviewSource(review.source) === normalizedFilter
    );
  }, [activeFilter, allReviews]);

  const averageRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
      : 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setStatusMessage("Supabase is not configured yet.");
      return;
    }

    if (!currentUser) {
      setStatusMessage("Please log in before submitting a review.");
      return;
    }

    if (!comment.trim()) {
      setStatusMessage("Please write a short review before submitting.");
      return;
    }

    setIsSubmitting(true);
    const reviewPayload = {
      user_id: currentUser.id,
      reviewer_name: currentUser.name || currentUser.email || "EV Academy Student",
      rating,
      comment: comment.trim(),
      source: WEBSITE_REVIEW_SOURCE,
      is_published: false
    };

    const { error } = await supabase.from("reviews").insert(reviewPayload);
    setIsSubmitting(false);

    if (error) {
      console.error("EVs review submission failed", {
        table: "reviews",
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        currentUser: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        payload: {
          ...reviewPayload,
          comment: "[redacted review text]"
        }
      });
      setStatusMessage(formatReviewError(error));
      return;
    }

    setComment("");
    setRating(5);
    setActiveFilter(ALL_REVIEWS_FILTER);
    setStatusMessage(
      "Thank you. Your review has been submitted and will appear after approval."
    );
  };

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: "5.5rem",
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
            maxWidth: "45rem",
            display: "grid",
            gap: "0.9rem",
            marginBottom: "2rem"
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
              color: "#eff6ff",
              fontSize: "clamp(2.35rem, 4.5vw, 3.95rem)",
              lineHeight: 0.98,
              textWrap: "balance"
            }}
          >
            Real Reviews from Learner Drivers
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: "42rem",
              color: "rgba(239,246,255,0.76)",
              fontSize: "1.03rem",
              lineHeight: 1.82
            }}
          >
            Read public Setmore feedback and reviews submitted by EVs Driving
            Academy students through the website.
          </p>
        </motion.div>

        <motion.div
          variants={reducedMotion ? undefined : itemVariants}
          className="reviews-summary-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.4rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <Stars rating={Math.round(averageRating)} />
            <span style={{ color: "rgba(239,246,255,0.76)", fontWeight: 700 }}>
              {averageRating.toFixed(1)} average from {allReviews.length} reviews
            </span>
          </div>

          <div className="reviews-filter-group" aria-label="Filter reviews by source">
            {filterOptions.map((option) => {
              const active = activeFilter === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setActiveFilter(option)}
                  className="reviews-filter-button"
                  aria-pressed={active}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="reviews-content-grid">
          <motion.div
            variants={reducedMotion ? undefined : itemVariants}
            className="reviews-form-panel"
          >
            <h3 style={{ margin: 0, color: "#eff6ff", fontSize: "1.35rem" }}>
              Share your experience
            </h3>

            {currentUser ? (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ color: "rgba(239,246,255,0.78)", fontWeight: 700 }}>
                    Your rating
                  </span>
                  <Stars rating={rating} interactive onChange={setRating} />
                </div>

                <label style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ color: "rgba(239,246,255,0.78)", fontWeight: 700 }}>
                    Review
                  </span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Write a review about your learning experience..."
                    rows={5}
                    className="reviews-textarea"
                  />
                </label>

                <button
                  type="submit"
                  className="reviews-submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(239,246,255,0.75)",
                    lineHeight: 1.75
                  }}
                >
                  Log in to EV Academy to submit a review using your student profile.
                </p>
                <Link href="/academy/login" className="reviews-submit-button">
                  Login to Review
                </Link>
              </div>
            )}

            {statusMessage ? (
              <p
                aria-live="polite"
                style={{
                  margin: 0,
                  color: statusMessage.includes("Thank you") ? "#bbf7d0" : "#fecaca",
                  lineHeight: 1.6
                }}
              >
                {statusMessage}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            variants={reducedMotion ? undefined : itemVariants}
            className="reviews-grid"
          >
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <ReviewCard
                  key={`${review.source}-${review.id}`}
                  review={review}
                  reducedMotion={reducedMotion}
                />
              ))
            ) : (
              <p
                style={{
                  margin: 0,
                  color: "rgba(239,246,255,0.72)",
                  lineHeight: 1.7
                }}
              >
                No reviews are available for this source yet.
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
