const DIRECT_VIDEO_PATTERN =
  /\.(mp4|webm|ogg|mov|m4v)(\?[^#]*)?(#.*)?$/i;

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

  return null;
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

export function isDirectVideoUrl(rawUrl: unknown) {
  const trimmedUrl = asText(rawUrl).trim();

  return (
    trimmedUrl.startsWith("data:video/") ||
    trimmedUrl.startsWith("blob:") ||
    DIRECT_VIDEO_PATTERN.test(trimmedUrl)
  );
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
    return `https://www.youtube.com/embed/${youtubeId}`;
  }

  const vimeoId = extractVimeoVideoId(trimmedUrl);

  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  const tikTokId = extractTikTokVideoId(trimmedUrl);

  if (tikTokId) {
    return `https://www.tiktok.com/embed/v2/${tikTokId}`;
  }

  const instagramEmbedPath = extractInstagramEmbedPath(trimmedUrl);

  if (instagramEmbedPath) {
    return `https://www.instagram.com/${instagramEmbedPath}/embed/captioned/`;
  }

  return trimmedUrl;
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
