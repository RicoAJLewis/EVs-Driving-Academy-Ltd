import type { Metadata } from "next";
import { AcademyAuthCallback } from "@/components/academy/AcademyAuthCallback";

export const metadata: Metadata = {
  title: "Confirm EV Academy Account",
  description: "Confirm your EV Academy account email."
};

export default function AcademyAuthCallbackPage() {
  return <AcademyAuthCallback />;
}
