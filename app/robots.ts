import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/jobs", "/contracts", "/vehicles", "/dealerships", "/drivers", "/help"],
        disallow: ["/admin", "/account", "/messages", "/my-posts", "/api"],
      },
    ],
  };
}
