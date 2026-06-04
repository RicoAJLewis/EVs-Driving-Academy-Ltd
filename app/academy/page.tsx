import type { Metadata } from "next";
import { AcademyLanding } from "@/components/academy/AcademyLanding";

export const metadata: Metadata = {
  title: "EV Academy",
  description:
    "Watch helpful driving tutorials, lesson previews, and road safety tips from EVs Driving Academy."
};

export default function AcademyPage() {
  return <AcademyLanding />;
}
