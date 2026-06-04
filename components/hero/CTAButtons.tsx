"use client";

type CTAButtonsProps = {
  reducedMotion: boolean;
};

const bookingUrl =
  "https://www.tiktok.com/link/v2?aid=1988&lang=en&scene=bio_url&target=https%3A%2F%2Fevsdrivingacademy.setmore.com%3Futm_source%3Dqr-code%26utm_medium%3Dsettings-share-bp";
const whatsappUrl =
  "https://wa.me/18687270152?text=Hi%20EVs%20Driving%20Academy%2C%20I%E2%80%99d%20like%20to%20book%20a%20lesson.";

export function CTAButtons({ reducedMotion }: CTAButtonsProps) {
  return (
    <div
      className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.75rem"
      }}
    >
      <a
        href={bookingUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "3.25rem",
          padding: "0.85rem 1.6rem",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.15)",
          background:
            "linear-gradient(135deg, rgba(246,193,91,1), rgba(240,171,36,1))",
          color: "#0f172a",
          fontSize: "0.95rem",
          fontWeight: 600,
          boxShadow: "0 30px 80px rgba(8, 17, 29, 0.28)",
          textDecoration: "none"
        }}
        className={`inline-flex items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(135deg,_rgba(246,193,91,1),_rgba(240,171,36,1))] px-6 py-3 text-sm font-semibold text-slate-950 shadow-hero transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          reducedMotion ? "" : "hover:-translate-y-0.5 hover:scale-[1.025] active:scale-[0.99]"
        }`}
      >
        Book a Lesson
      </a>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "3.25rem",
          padding: "0.85rem 1.6rem",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.1)",
          color: "#ffffff",
          fontSize: "0.95rem",
          fontWeight: 600,
          backdropFilter: "blur(12px)",
          textDecoration: "none"
        }}
        className={`inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          reducedMotion ? "" : "hover:-translate-y-0.5 hover:scale-[1.025] active:scale-[0.99]"
        }`}
      >
        Message Us on WhatsApp
      </a>
    </div>
  );
}
