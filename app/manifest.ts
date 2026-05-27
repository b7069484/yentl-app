import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yentl",
    short_name: "Yentl",
    description: "Send links, text, and media into Yentl for source-aware fact-checking and rhetoric analysis.",
    id: "/",
    start_url: "/session",
    scope: "/",
    display: "standalone",
    background_color: "#f8f4ec",
    theme_color: "#0b7f7a",
    categories: ["education", "news", "productivity"],
    icons: [
      {
        src: "/yentl-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    share_target: {
      action: "/session",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
