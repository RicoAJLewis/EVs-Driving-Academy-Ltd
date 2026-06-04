import type { Metadata } from "next";
import { AcademyWatchPage } from "@/components/academy/AcademyWatchPage";

type AcademyWatchRouteProps = {
  params: Promise<{
    videoId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Watch Tutorial | EV Academy",
  description:
    "Watch EV Academy tutorials, lesson previews, and road safety videos."
};

export default async function AcademyWatchRoute({
  params
}: AcademyWatchRouteProps) {
  const { videoId } = await params;

  return <AcademyWatchPage videoId={videoId} />;
}
