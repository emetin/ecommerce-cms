export function extractGoogleDriveFileId(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

export function normalizeImageUrl(url?: string) {
  const value = String(url || "").trim();
  if (!value) return "";

  if (
    value.includes("drive.google.com") ||
    value.includes("docs.google.com") ||
    value.includes("lh3.googleusercontent.com")
  ) {
    const fileId = extractGoogleDriveFileId(value);

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
    }
  }

  return value;
}

export function normalizeImageUrls(urls: string[]) {
  return urls
    .map((item) => normalizeImageUrl(item))
    .map((item) => item.trim())
    .filter(Boolean);
}