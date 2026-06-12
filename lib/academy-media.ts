const DIRECT_VIDEO_PATTERN =
  /\.(mp4|webm|ogg|mov|m4v)(\?[^#]*)?(#.*)?$/i;

export type AcademyVideoPlatform =
  | "youtube"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "direct"
  | "unknown";

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeUrl(rawUrl: unknown) {
  const text = asText(rawUrl).trim();

  if (!text) {
    return null;
  }

  try {
    return new URL(text);
  } catch {
    return null;
  }
}

export function extractYouTubeVideoId(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] ?? null;
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] ?? null;
    }
  }

  return null;
}

export function extractVimeoVideoId(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (hostname === "vimeo.com") {
    return parts[0] ?? null;
  }

  if (hostname === "player.vimeo.com" && parts[0] === "video") {
    return parts[1] ?? null;
  }

  return null;
}

export function extractTikTokVideoId(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname !== "tiktok.com" && hostname !== "m.tiktok.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const videoIndex = parts.findIndex((part) => part === "video");

  if (videoIndex >= 0) {
    return parts[videoIndex + 1] ?? null;
  }

  if (parts[0] === "embed" && parts[1] === "v2") {
    return parts[2] ?? null;
  }

  if (parts[0] === "embed") {
    return parts[1] ?? null;
  }

  return null;
}

export function isTikTokUrl(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return false;
  }

  const hostname = url.hostname.replace(/^www\./, "");

  return (
    hostname === "tiktok.com" ||
    hostname === "m.tiktok.com" ||
    hostname === "vm.tiktok.com"
  );
}

export function getTikTokOEmbedUrl(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url || !isTikTokUrl(rawUrl)) {
    return "";
  }

  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", url.toString());

  return endpoint.toString();
}

export function extractInstagramEmbedPath(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname !== "instagram.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const contentType = parts[0];
  const shortcode = parts[1];

  if (!contentType || !shortcode) {
    return null;
  }

  if (contentType === "reel" || contentType === "p" || contentType === "tv") {
    return `${contentType}/${shortcode}`;
  }

  return null;
}

export function isInstagramUrl(rawUrl: unknown) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return false;
  }

  const hostname = url.hostname.replace(/^www\./, "");

  return hostname === "instagram.com";
}

export function isDirectVideoUrl(rawUrl: unknown) {
  const trimmedUrl = asText(rawUrl).trim();

  return (
    trimmedUrl.startsWith("data:video/") ||
    trimmedUrl.startsWith("blob:") ||
    DIRECT_VIDEO_PATTERN.test(trimmedUrl)
  );
}

export function detectAcademyVideoPlatform(
  rawUrl: unknown
): AcademyVideoPlatform {
  if (isDirectVideoUrl(rawUrl)) {
    return "direct";
  }

  if (extractYouTubeVideoId(rawUrl)) {
    return "youtube";
  }

  if (extractVimeoVideoId(rawUrl)) {
    return "vimeo";
  }

  if (isTikTokUrl(rawUrl)) {
    return "tiktok";
  }

  if (isInstagramUrl(rawUrl)) {
    return "instagram";
  }

  return "unknown";
}

function withSearchParams(rawUrl: string, params: Record<string, string>) {
  const url = safeUrl(rawUrl);

  if (!url) {
    return rawUrl;
  }

  Object.entries(params).forEach(([key, value]) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export function normalizeAcademyVideoUrl(rawUrl: unknown) {
  const trimmedUrl = asText(rawUrl).trim();

  if (!trimmedUrl || trimmedUrl.includes("VIDEO_ID_HERE")) {
    return "https://www.youtube.com/embed/VIDEO_ID_HERE";
  }

  if (isDirectVideoUrl(trimmedUrl)) {
    return trimmedUrl;
  }

  const youtubeId = extractYouTubeVideoId(trimmedUrl);

  if (youtubeId) {
    return withSearchParams(`https://www.youtube.com/embed/${youtubeId}`, {
      rel: "0",
      modestbranding: "1"
    });
  }

  const vimeoId = extractVimeoVideoId(trimmedUrl);

  if (vimeoId) {
    return withSearchParams(`https://player.vimeo.com/video/${vimeoId}`, {
      title: "0",
      byline: "0",
      portrait: "0"
    });
  }

  const tikTokId = extractTikTokVideoId(trimmedUrl);

  if (tikTokId) {
    return `https://www.tiktok.com/embed/${tikTokId}`;
  }

  const instagramEmbedPath = extractInstagramEmbedPath(trimmedUrl);

  if (instagramEmbedPath) {
    return `https://www.instagram.com/${instagramEmbedPath}/embed/captioned/`;
  }

  return trimmedUrl;
}

export function getAcademyVideoPlatformLabel(platform: AcademyVideoPlatform) {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    case "direct":
      return "Direct video";
    default:
      return "External video";
  }
}

export function canEmbedAcademyVideo(rawUrl: unknown) {
  const platform = detectAcademyVideoPlatform(rawUrl);

  if (platform === "youtube" || platform === "vimeo" || platform === "direct") {
    return true;
  }

  if (platform === "tiktok") {
    return Boolean(extractTikTokVideoId(rawUrl));
  }

  if (platform === "instagram") {
    return Boolean(extractInstagramEmbedPath(rawUrl));
  }

  return false;
}

export function normalizeAcademyThumbnailUrl(rawUrl: unknown) {
  return asText(rawUrl).trim();
}

export function getAcademyVideoRenderMode(rawUrl: unknown) {
  const normalizedUrl = normalizeAcademyVideoUrl(rawUrl);

  if (!normalizedUrl || normalizedUrl.includes("VIDEO_ID_HERE")) {
    return "placeholder" as const;
  }

  if (isDirectVideoUrl(normalizedUrl)) {
    return "file" as const;
  }

  return "embed" as const;
}

export function getAcademyThumbnailUrl(videoUrl: unknown, thumbnailUrl?: unknown) {
  const cleanedThumbnail = asText(thumbnailUrl).trim();

  if (cleanedThumbnail) {
    return cleanedThumbnail;
  }

  const youtubeId = extractYouTubeVideoId(videoUrl);

  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return "";
}
