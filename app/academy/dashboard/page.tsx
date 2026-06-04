import type { Metadata } from "next";
import { VisitorDashboard } from "@/components/academy/VisitorDashboard";

export const metadata: Metadata = {
  title: "EV Academy Dashboard",
  description:
    "Browse tutorial videos, lesson previews, and road safety content inside EV Academy."
};

export default function AcademyDashboardPage() {
  return <VisitorDashboard />;
}
