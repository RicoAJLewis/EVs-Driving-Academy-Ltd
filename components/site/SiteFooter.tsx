import Link from "next/link";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Academy", href: "/academy" },
  { label: "Bookings", href: "https://evsdrivingacademy.setmore.com/", external: true }
];

export function SiteFooter() {
  return (
    <footer
      className="site-footer"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(8,17,29,0.94) 0%, rgba(5,11,19,0.98) 100%)",
        color: "rgba(239,246,255,0.84)"
      }}
    >
      <div
        className="site-footer-inner"
        style={{
          width: "min(1120px, calc(100% - 2rem))",
          margin: "0 auto",
          padding: "1.4rem 0 1.8rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
          alignItems: "center"
        }}
        >
        <div className="site-footer-brand" style={{ display: "grid", gap: "0.3rem" }}>
          <strong
            style={{
              color: "#eff6ff",
              fontSize: "1rem",
              letterSpacing: "0.04em"
            }}
          >
            EVs Driving Academy Ltd
          </strong>
          <span style={{ fontSize: "0.95rem" }}>
            Helping new drivers learn with confidence, clarity, and safe habits.
          </span>
        </div>

        <nav
          aria-label="Footer"
          className="site-footer-nav"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center"
          }}
        >
          {footerLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#eff6ff",
                  textDecoration: "none",
                  fontWeight: 600
                }}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  color: "#eff6ff",
                  textDecoration: "none",
                  fontWeight: 600
                }}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </footer>
  );
}
