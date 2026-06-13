export type UserRole = "admin" | "owner" | "student" | "visitor";

export type AcademyUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileRole?: UserRole | null;
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
  publishedVideos: number;
  unpublishedVideos: number;
  totalSections: number;
  totalComments: number;
  totalStudents: number;
  watchedCount: number;
  mostWatchedVideo: AcademyVideo | null;
  topPerformingSection: AcademySection | null;
  viewsPerVideo: AcademyVideo[];
  recentComments: Array<AcademyComment & { videoTitle: string }>;
};

export type AcademyProgress = {
  id: string;
  userId: string;
  videoId: string;
  watched: boolean;
  watchedAt?: string;
  progressSeconds: number;
};

export type AcademyAdminDebugInfo = {
  supabaseUrlExists: boolean;
  supabaseAnonKeyExists: boolean;
  sessionExists: boolean;
  userId: string | null;
  userEmail: string | null;
  profileId: string | null;
  profileRole: UserRole | null;
  appMetadataRole: string | null;
  userMetadataRole: string | null;
  profileMatchesSession: boolean;
  isAdminRpc: boolean | null;
  isAdminRpcError: string | null;
  checkedAt: string;
};

export type AcademyAdminActionError = {
  table: string;
  action: string;
  payload: Record<string, unknown> | null;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  userId: string | null;
  userEmail: string | null;
  profileRole: UserRole | null;
  checkedAt: string;
};

export type ChatThreadStatus = "open" | "archived";

export type ChatThread = {
  id: string;
  studentId: string;
  adminId: string | null;
  studentName: string;
  studentEmail: string;
  status: ChatThreadStatus;
  lastMessage: string;
  lastMessageAt: string | null;
  studentUnreadCount: number;
  adminUnreadCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedByAdminAt: string | null;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderName?: string;
  senderRole?: UserRole | null;
  senderLabel?: string;
};
