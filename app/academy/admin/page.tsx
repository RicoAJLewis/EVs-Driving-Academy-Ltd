import type { Metadata } from "next";
import { AdminDashboard } from "@/components/academy/AdminDashboard";

export const metadata: Metadata = {
  title: "EV Academy Admin",
  description:
    "Manage tutorial sections, videos, comments, and analytics inside EV Academy."
};

export default function AcademyAdminPage() {
  return <AdminDashboard />;
}
