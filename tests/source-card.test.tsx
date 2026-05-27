import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Source } from "@/lib/types";
import { SourceCard } from "@/components/session/source-card";

function source(overrides: Partial<Source> = {}): Source {
  return {
    url: "https://example.com/report",
    domain: "example.com",
    title: "Example source report",
    reputation_tier: "high",
    stance: "supports",
    excerpt: "The report gives the relevant context.",
    ...overrides,
  };
}

describe("SourceCard", () => {
  it("renders a validated source-provided thumbnail with provenance", () => {
    render(
      <SourceCard
        source={source({
          title: "Open Graph Study",
          preview: {
            image_url: "https://cdn.example.com/thumb.jpg",
            image_alt: "Publisher thumbnail",
            title: "Publisher preview title",
            description: "Preview description",
            fetched_at: Date.now(),
            image_status: "validated",
            image_source: "open_graph",
            image_content_type: "image/jpeg",
            image_dimensions: { width: 640, height: 360 },
            image_final_url: "https://cdn.example.com/thumb.jpg",
            validated_at: Date.now(),
            unavailable_reason: null,
          },
        })}
      />,
    );

    const image = screen.getByAltText("Publisher thumbnail") as HTMLImageElement;
    expect(image.src).toContain("https://cdn.example.com/thumb.jpg");
    expect(screen.getByText("Verified Open Graph thumbnail")).toBeTruthy();
    expect(screen.getByText(/Open Graph .* image\/jpeg .* 640x360/)).toBeTruthy();
    expect(screen.getByText("Publisher preview title")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Open Graph Study/i });
    expect(link.getAttribute("href")).toBe("https://example.com/report");
  });

  it("shows an explicit no-thumbnail fallback with the source-safety reason", () => {
    render(
      <SourceCard
        source={source({
          domain: "blocked.example",
          preview: {
            image_url: null,
            image_alt: null,
            title: "Blocked preview",
            description: null,
            fetched_at: Date.now(),
            image_status: "blocked",
            image_source: "open_graph",
            image_content_type: null,
            image_dimensions: null,
            image_final_url: null,
            validated_at: null,
            unavailable_reason: "Source image was blocked by the source safety check.",
          },
        })}
      />,
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("No source thumbnail")).toBeTruthy();
    expect(screen.getByText("Source image was blocked by the source safety check.")).toBeTruthy();
    expect(screen.getByText("Yentl did not invent a replacement image.")).toBeTruthy();
  });

  it("hides non-source-provided images even when a URL exists", () => {
    render(
      <SourceCard
        source={source({
          preview: {
            image_url: "https://cdn.example.com/generated-looking.png",
            image_alt: "Generated-looking image",
            title: null,
            description: null,
            fetched_at: Date.now(),
            image_status: "validated",
            image_source: "none",
            image_content_type: "image/png",
            image_dimensions: { width: 512, height: 512 },
            image_final_url: "https://cdn.example.com/generated-looking.png",
            validated_at: Date.now(),
            unavailable_reason: null,
          },
        })}
      />,
    );

    expect(screen.queryByAltText("Generated-looking image")).toBeNull();
    expect(screen.getByText("No source thumbnail")).toBeTruthy();
    expect(screen.getByText("Thumbnail hidden because it is not a validated source-provided image.")).toBeTruthy();
  });
});
