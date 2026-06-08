export type UserRole = "admin" | "visitor";

export type AcademyUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AcademySection = {
  id: string;
  title: string;
  description: string;
  order: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AcademyVideo = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  resolvedVideoUrl?: string;
  resolvedThumbnailUrl?: string;
  order: number;
  isVisible: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  commentCount: number;
};

export type AcademyComment = {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  commentText: string;
  isVisible: boolean;
  createdAt: string;
};

export type AcademyAnalytics = {
  totalViews: number;
  totalVideos: number;
  totalComments: number;
  mostWatchedVideo: AcademyVideo | null;
  topPerformingSection: AcademySection | null;
  viewsPerVideo: AcademyVideo[];
  recentComments: Array<AcademyComment & { videoTitle: string }>;
};
