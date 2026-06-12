import type { Metadata } from "next";
import { AcademyProvider } from "@/components/academy/AcademyProvider";
import { StudentChatWidget } from "@/components/chat/StudentChatWidget";
import "./globals.css";

const siteUrl = "https://evsdrivingacademy.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "EVs Driving Academy Ltd",
  description:
    "Professional driving lessons designed to help you become road-ready, safe, and confident.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "EVs Driving Academy Ltd",
    description:
      "Professional driving lessons designed to help you become road-ready, safe, and confident.",
    url: siteUrl,
    siteName: "EVs Driving Academy Ltd",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "EVs Driving Academy Ltd",
    description:
      "Professional driving lessons designed to help you become road-ready, safe, and confident."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AcademyProvider>
          {children}
          <StudentChatWidget />
        </AcademyProvider>
      </body>
    </html>
  );
}
