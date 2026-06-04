import type { AcademyComment, AcademySection, AcademyVideo } from "@/types/academy";

export const defaultAcademySections: AcademySection[] = [
  {
    id: "section-beginner-lessons",
    title: "Beginner Lessons",
    description: "Foundations for first-time drivers and confidence building.",
    order: 1,
    isVisible: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02"
  },
  {
    id: "section-road-safety",
    title: "Road Safety",
    description: "Hazard awareness, observation, and safer road habits.",
    order: 2,
    isVisible: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02"
  },
  {
    id: "section-parking-tutorials",
    title: "Parking Tutorials",
    description: "Parking routines, control, and mirror positioning practice.",
    order: 3,
    isVisible: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02"
  },
  {
    id: "section-driving-test-prep",
    title: "Driving Test Prep",
    description: "Preparation support for lesson milestones and test day.",
    order: 4,
    isVisible: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02"
  },
  {
    id: "section-vehicle-basics",
    title: "Vehicle Basics",
    description: "Vehicle setup, cockpit checks, and essential controls.",
    order: 5,
    isVisible: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02"
  }
];

export const defaultAcademyVideos: AcademyVideo[] = [
  {
    id: "video-1",
    sectionId: "section-beginner-lessons",
    title: "Beginner Driving Lesson: Getting Started",
    description:
      "A simple introduction to what new drivers should expect in their first lesson.",
    category: "Beginner",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
    thumbnailUrl: "/images/academy/beginner-driving.svg",
    order: 1,
    isVisible: true,
    isFeatured: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02",
    viewCount: 148,
    commentCount: 0
  },
  {
    id: "video-2",
    sectionId: "section-road-safety",
    title: "Road Safety Basics",
    description:
      "Learn the basic road safety habits every new driver should practise.",
    category: "Road Safety",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
    thumbnailUrl: "/images/academy/road-safety.svg",
    order: 1,
    isVisible: true,
    isFeatured: false,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02",
    viewCount: 96,
    commentCount: 0
  },
  {
    id: "video-3",
    sectionId: "section-parking-tutorials",
    title: "Parking Confidence for New Drivers",
    description:
      "A quick guide to mirrors, steering control, and calm parking routines.",
    category: "Parking",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
    thumbnailUrl: "/images/academy/parking-skills.svg",
    order: 1,
    isVisible: true,
    isFeatured: false,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02",
    viewCount: 64,
    commentCount: 0
  },
  {
    id: "video-4",
    sectionId: "section-driving-test-prep",
    title: "Driving Test Prep Checklist",
    description:
      "Review the habits, checks, and mindset that help learners prepare for test day.",
    category: "Test Prep",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
    thumbnailUrl: "/images/academy/test-prep.svg",
    order: 1,
    isVisible: true,
    isFeatured: false,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02",
    viewCount: 112,
    commentCount: 0
  },
  {
    id: "video-5",
    sectionId: "section-vehicle-basics",
    title: "Vehicle Basics Before You Move Off",
    description:
      "Seat position, mirrors, controls, and simple checks before starting a lesson.",
    category: "Vehicle Basics",
    videoUrl: "https://www.youtube.com/embed/VIDEO_ID_HERE",
    thumbnailUrl: "/images/academy/beginner-driving.svg",
    order: 1,
    isVisible: true,
    isFeatured: false,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-02",
    viewCount: 58,
    commentCount: 0
  }
];

export const defaultAcademyComments: AcademyComment[] = [
  {
    id: "comment-1",
    videoId: "video-1",
    userId: "user-visitor-1",
    userName: "Visitor User",
    commentText: "This is a helpful overview for nervous first-time drivers.",
    isVisible: true,
    createdAt: "2026-06-02T10:15:00.000Z"
  },
  {
    id: "comment-2",
    videoId: "video-2",
    userId: "user-visitor-1",
    userName: "Visitor User",
    commentText: "Please add more on observation at junctions when you can.",
    isVisible: true,
    createdAt: "2026-06-02T10:35:00.000Z"
  }
];

export function createAcademyId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sortSections(sections: AcademySection[]) {
  return [...sections].sort((a, b) => a.order - b.order);
}

export function sortVideos(videos: AcademyVideo[]) {
  return [...videos].sort((a, b) => {
    if (a.sectionId === b.sectionId) {
      return a.order - b.order;
    }

    return a.sectionId.localeCompare(b.sectionId);
  });
}

export function hasPlayableVideo(videoUrl: string) {
  return !videoUrl.includes("VIDEO_ID_HERE");
}
