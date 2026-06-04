import type { Metadata } from "next";
import { AcademyLogin } from "@/components/academy/AcademyLogin";

export const metadata: Metadata = {
  title: "Login to EV Academy",
  description:
    "Access driving tutorials, lesson videos, and road safety content from EVs Driving Academy."
};

export default function AcademyLoginPage() {
  return <AcademyLogin />;
}
