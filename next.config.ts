import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(self), microphone=(self), payment=()" },
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