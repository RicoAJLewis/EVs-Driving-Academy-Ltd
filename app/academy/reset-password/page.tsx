import type { Metadata } from "next";
import { AcademyResetPassword } from "@/components/academy/AcademyResetPassword";

export const metadata: Metadata = {
  title: "Reset EV Academy Password",
  description: "Reset your EV Academy password."
};

export default function AcademyResetPasswordPage() {
  return <AcademyResetPassword />;
}
