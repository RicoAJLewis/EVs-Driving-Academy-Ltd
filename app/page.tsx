import { readFile } from "fs/promises";
import path from "path";
import { HeroBanner } from "@/components/hero/HeroBanner";
import { AboutSection } from "@/components/home/AboutSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { SiteFooter } from "@/components/site/SiteFooter";

function normalizeAboutCopy(content: string) {
  return content
    .replaceAll("\u00e2\u20ac\u2122", "’")
    .replaceAll("\u00e2\u20ac\u0153", "“")
    .replaceAll("\u00e2\u20ac\u009d", "”")
    .replaceAll("\u00e2\u20ac\u201d", "—")
    .replaceAll("\u00e2\u20ac\u201c", "–");
}

async function getAboutParagraphs() {
  const aboutFilePath = path.join(process.cwd(), "about section", "about.txt");
  const rawCopy = await readFile(aboutFilePath, "utf8");
  const normalizedCopy = normalizeAboutCopy(rawCopy).trim();
  const paragraphs = normalizedCopy
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs[0]?.toLowerCase().startsWith("about ev")) {
    return paragraphs.slice(1);
  }

  return paragraphs;
}

export default async function HomePage() {
  const aboutParagraphs = await getAboutParagraphs();
  const locationUrl = "https://maps.app.goo.gl/G1Z8dtUL7MDdC5pr8?g_st=iw";
  const reviews = [
    {
      id: "review-1",
      quote:
        "GOOD NIGHT I WOULD LIKE TO SAY EV YOUR A GREAT INSTRUCTOR 1ST TIME WITH U AND I WAS ON THE ROAD TRUST ME I WAS SCARED BUT FELT COMFORTABLE GUYS TRUST ME GET AT HIM YOU WONT REGRET I HAD SOMEONE ELSE AND WASTED MY MONEY",
      source: "TikTok"
    },
    {
      id: "review-2",
      quote:
        "Emanuel is one of the best driving instructor...very patient..very informative...I passed my test because of him 💪💪",
      source: "TikTok"
    }
  ];

  return (
    <>
      <main>
        <HeroBanner locationUrl={locationUrl} />
        <AboutSection paragraphs={aboutParagraphs} />
        <ReviewsSection reviews={reviews} />
      </main>
      <SiteFooter />
    </>
  );
}
