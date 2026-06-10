export type ReviewSource = "Setmore" | "EVs Driving Academy Ltd";

export type SiteReview = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  source: ReviewSource;
  date?: string;
};

// Setmore does not expose a stable browser-safe reviews API here, so these
// public reviews from https://evsdrivingacademy.setmore.com/reviews?sortBy=highestRated
// are maintained manually until backend sync is added.
export const setmoreReviews: SiteReview[] = [
  {
    id: "setmore-roselle-gregoire",
    name: "Roselle Gregoire",
    rating: 5,
    comment: "Very informative and patient with learners.",
    source: "Setmore"
  },
  {
    id: "setmore-letisha-jacobs",
    name: "Letisha Jacobs",
    rating: 5,
    comment: "Good interpersonal skills. Great hands on experience.",
    source: "Setmore"
  },
  {
    id: "setmore-marissa-ramirez",
    name: "Marissa Ramirez",
    rating: 5,
    comment:
      "Excellent instructor, very gentle and soft spoken. Makes you feel comfortable enough to ask questions that you'd otherwise feel foolish to ask. Keep up the great work.",
    source: "Setmore"
  },
  {
    id: "setmore-stephanie-rock",
    name: "Stephanie Rock",
    rating: 5,
    comment:
      "I can't recommend Emmanuel enough! From our first class, he created a calm and supportive environment that really helped ease my anxiety behind the wheel. Every lesson felt purposeful, not just learning how to drive, but learning how to stay confident and in control in real-life situations.",
    source: "Setmore"
  },
  {
    id: "setmore-carlene-vialva",
    name: "Carlene Vialva",
    rating: 5,
    comment:
      "Very understanding instructor. He keeps motivating and encouraging me, even when I make mistakes.",
    source: "Setmore"
  }
];
