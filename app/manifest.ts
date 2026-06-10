import type { MetadataRoute } from "next";
import { YENTL_FILE_HANDLERS } from "@/lib/launch-files";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yentl",
    short_name: "Yentl",
    description: "Send links, text, files, and media into Yentl for source-aware fact-checking and rhetoric analysis.",
    id: "/",
    start_url: "/mobile",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "any",
    background_color: "#f8f4ec",
    theme_color: "#0b7f7a",
    categories: ["education", "news", "productivity"],
    launch_handler: {
      client_mode: ["focus-existing", "navigate-new"],
    },
    icons: [
      {
        src: "/yentl-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/visual-evidence/pipeline-smoke/2026-05-27/pw-07-source-picker-mobile.png",
        sizes: "390x1606",
        type: "image/png",
        form_factor: "narrow",
        label: "Mobile source picker",
      },
      {
        src: "/visual-evidence/pipeline-smoke/2026-05-27/01-session-source-picker-desktop.png",
        sizes: "1373x934",
        type: "image/png",
        form_factor: "wide",
        label: "Desktop source picker",
      },
    ],
    shortcuts: [
      {
        name: "Start a Yentl session",
        short_name: "Start",
        description: "Open the source picker.",
        url: "/session",
      },
      {
        name: "Saved sessions",
        short_name: "Saves",
        description: "Open saved reviews.",
        url: "/sessions",
      },
      {
        name: "Room mode",
        short_name: "Room",
        description: "Open the read-only TV room display.",
        url: "/tv",
      },
      {
        name: "Guest demo",
        short_name: "Demo",
        description: "Open a prepared sample.",
        url: "/demo",
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
    file_handlers: YENTL_FILE_HANDLERS,
  };
}
