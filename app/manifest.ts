import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LoadLink",
    short_name: "LoadLink",
    description: "South African logistics marketplace",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/images/loadlink-app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/loadlink-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
