import { NextResponse } from "next/server";
import {
  detectAcademyVideoPlatform,
  getAcademyThumbnailUrl,
  getAcademyVideoPlatformLabel,
  getTikTokOEmbedUrl
} from "@/lib/academy-media";

type TikTokOEmbedResponse = {
  thumbnail_url?: unknown;
  thumbnail_url_with_play_button?: unknown;
  title?: unknown;
  author_name?: unknown;
};

function getSafeExternalImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function isValidExternalVideoUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: { videoUrl?: unknown };

  try {
    body = (await request.json()) as { videoUrl?: unknown };
  } catch {
    return NextResponse.json(
      { thumbnailUrl: "", message: "Invalid thumbnail request." },
      { status: 400 }
    );
  }

  const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";

  if (!isValidExternalVideoUrl(videoUrl)) {
    return NextResponse.json(
      { thumbnailUrl: "", message: "A valid external video URL is required." },
      { status: 400 }
    );
  }

  const platform = detectAcademyVideoPlatform(videoUrl);
  const localThumbnail = getAcademyThumbnailUrl(videoUrl);

  if (localThumbnail) {
    return NextResponse.json({
      platform,
      platformLabel: getAcademyVideoPlatformLabel(platform),
      source: platform,
      thumbnailUrl: localThumbnail
    });
  }

  if (platform === "tiktok") {
    const oEmbedUrl = getTikTokOEmbedUrl(videoUrl);

    if (!oEmbedUrl) {
      return NextResponse.json({
        platform,
        platformLabel: "TikTok",
        source: "tiktok-oembed",
        thumbnailUrl: "",
        message:
          "TikTok thumbnail lookup needs a public TikTok video URL. Short links may need to be opened and pasted as the full TikTok video URL."
      });
    }

    try {
      const response = await fetch(oEmbedUrl, {
        cache: "no-store",
        headers: { accept: "application/json" }
      });

      if (!response.ok) {
        return NextResponse.json({
          platform,
          platformLabel: "TikTok",
          source: "tiktok-oembed",
          thumbnailUrl: "",
          message: `TikTok did not return a thumbnail for this URL. Status: ${response.status}.`
        });
      }

      const data = (await response.json()) as TikTokOEmbedResponse;
      const thumbnailUrl =
        getSafeExternalImageUrl(data.thumbnail_url) ||
        getSafeExternalImageUrl(data.thumbnail_url_with_play_button);

      return NextResponse.json({
        platform,
        platformLabel: "TikTok",
        source: "tiktok-oembed",
        thumbnailUrl,
        title: typeof data.title === "string" ? data.title : "",
        authorName: typeof data.author_name === "string" ? data.author_name : "",
        message: thumbnailUrl
          ? "TikTok thumbnail resolved."
          : "TikTok oEmbed did not include a thumbnail for this video."
      });
    } catch (error) {
      return NextResponse.json({
        platform,
        platformLabel: "TikTok",
        source: "tiktok-oembed",
        thumbnailUrl: "",
        message:
          error instanceof Error
            ? `TikTok thumbnail lookup failed: ${error.message}`
            : "TikTok thumbnail lookup failed."
      });
    }
  }

  return NextResponse.json({
    platform,
    platformLabel: getAcademyVideoPlatformLabel(platform),
    source: "fallback",
    thumbnailUrl: "",
    message:
      platform === "instagram"
        ? "Instagram does not provide a public thumbnail endpoint here. Add a thumbnail URL manually for the best card preview."
        : "No automatic thumbnail is available for this platform. Add a thumbnail URL manually for the best card preview."
  });
}
