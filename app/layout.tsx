import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVs Driving Academy Ltd",
  description:
    "Professional driving lessons designed to help you become road-ready, safe, and confident."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
