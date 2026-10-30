import type { NextConfig } from "next";

// Production redeploy marker — 2026-08-24
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(self), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none';" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, max-age=0, must-revalidate" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Vercel-CDN-Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  images: { localPatterns: [{pathname:"/images/**",search:""},{pathname:"/images/loadlink-logo-*.png",search:"?v=universal-theme-v1"},{pathname:"/api/truck-model-photo/**"}], remotePatterns: [{ protocol: "https", hostname: "cqmjgulfbbwxyecsnzed.supabase.co", pathname: "/storage/v1/object/public/**" }], formats: ["image/webp"], minimumCacheTTL: 86400, deviceSizes: [360, 640, 750, 1080, 1280, 1920], qualities: [75] },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/login", headers: noStoreHeaders },
      { source: "/signup", headers: noStoreHeaders },
      { source: "/forgot-password", headers: noStoreHeaders },
      { source: "/reset-password", headers: noStoreHeaders },
      { source: "/auth/:path*", headers: noStoreHeaders },
      // The listing flow depends on live account/package state and must never be served
      // from an older route snapshot after a release or billing change.
      { source: "/list-your-vehicle", headers: noStoreHeaders },
      { source: "/list-your-truck", headers: noStoreHeaders },
      { source: "/api/account/intelligence", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;