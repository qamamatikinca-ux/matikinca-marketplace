import { isIP } from "node:net";

const DEFAULT_IMAGE_HOSTS = [
  "images.unsplash.com",
  "cdn.pixabay.com",
  "images.pexels.com",
  "lh3.googleusercontent.com",
  "news.google.com",
];

function isPrivateIp(hostname: string) {
  if (!isIP(hostname)) return false;
  if (hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function allowedNewsImageHosts() {
  const configured = (process.env.LOADLINK_NEWS_IMAGE_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_IMAGE_HOSTS);
}

export function validateRemoteImageUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Only HTTPS images are supported.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || isPrivateIp(hostname)) {
    throw new Error("Private network destinations are blocked.");
  }
  const allowed = allowedNewsImageHosts();
  const permitted = [...allowed].some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (!permitted) throw new Error("This image host is not approved.");
  if (url.username || url.password) throw new Error("Credentialed URLs are blocked.");
  return url;
}
