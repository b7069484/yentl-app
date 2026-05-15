import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricTile } from "@/components/session/metric-tile";
import type { MetricSegment } from "@/components/session/metric-tile";

// ─── 1. Renders label and value ───────────────────────────────────────────────

describe("MetricTile – basic rendering", () => {
  it("renders the label text", () => {
    render(<MetricTile label="CLAIMS" value="8" />);
    expect(screen.getByText("CLAIMS")).toBeTruthy();
  });

  it("renders the value text", () => {
    render(<MetricTile label="CLAIMS" value="8" />);
    expect(screen.getByText("8")).toBeTruthy();
  });
});

// ─── 2. href → anchor with correct href ──────────────────────────────────────

describe("MetricTile – with href", () => {
  it("renders an anchor element when href is provided", () => {
    const { container } = render(
      <MetricTile label="CLAIMS" value="8" href="/foo" />,
    );
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("/foo");
  });
});

// ─── 3. No href → div, not anchor ────────────────────────────────────────────

describe("MetricTile – without href", () => {
  it("renders a div (not an anchor) when href is absent", () => {
    const { container } = render(<MetricTile label="SESSION" value="11:43" />);
    const anchor = container.querySelector("a");
    expect(anchor).toBeNull();
    // The root element should be a div
    const div = container.querySelector("div");
    expect(div).not.toBeNull();
  });
});

// ─── 4. Segments → correct segment divs ──────────────────────────────────────

describe("MetricTile – segments", () => {
  const segments: MetricSegment[] = [
    { flex: 4, colorClass: "bg-green" },
    { flex: 2, colorClass: "bg-red" },
  ];

  it("renders two segment divs with correct classes", () => {
    const { container } = render(
      <MetricTile label="CLAIMS" value="6" segments={segments} />,
    );
    const greenDiv = container.querySelector(".bg-green");
    const redDiv = container.querySelector(".bg-red");
    expect(greenDiv).not.toBeNull();
    expect(redDiv).not.toBeNull();
  });
});

// ─── 5. Segments with flex:0 are NOT rendered ─────────────────────────────────

describe("MetricTile – zero-flex segments", () => {
  it("does not render a div for a segment with flex: 0", () => {
    const segments: MetricSegment[] = [
      { flex: 4, colorClass: "bg-green" },
      { flex: 0, colorClass: "bg-orange", label: "PARTIAL" },
      { flex: 2, colorClass: "bg-red" },
    ];
    const { container } = render(
      <MetricTile label="CLAIMS" value="6" segments={segments} />,
    );
    const orangeDiv = container.querySelector(".bg-orange");
    expect(orangeDiv).toBeNull();
  });
});

// ─── 6. Auto-legend renders correct text ──────────────────────────────────────

describe("MetricTile – auto-legend", () => {
  it("renders auto-legend labels when segments have labels", () => {
    const segments: MetricSegment[] = [
      { flex: 4, colorClass: "bg-green", label: "TRUE" },
      { flex: 1, colorClass: "bg-orange", label: "PARTIAL" },
      { flex: 2, colorClass: "bg-red", label: "FALSE" },
      { flex: 1, colorClass: "bg-slate", label: "UNV" },
    ];
    render(<MetricTile label="CLAIMS" value="8" segments={segments} />);
    expect(screen.getByText(/TRUE/)).toBeTruthy();
    expect(screen.getByText(/PARTIAL/)).toBeTruthy();
    expect(screen.getByText(/FALSE/)).toBeTruthy();
    expect(screen.getByText(/UNV/)).toBeTruthy();
  });
});

// ─── 7. Custom legend prop → auto-legend skipped ──────────────────────────────

describe("MetricTile – custom legend", () => {
  it("renders the custom legend when the legend prop is provided", () => {
    const segments: MetricSegment[] = [
      { flex: 3, colorClass: "bg-purple", label: "FALLACY" },
    ];
    const customLegend = (
      <div data-testid="custom-legend">Custom Legend</div>
    );
    render(
      <MetricTile
        label="MARKERS"
        value="5"
        segments={segments}
        legend={customLegend}
      />,
    );
    expect(screen.getByTestId("custom-legend")).toBeTruthy();
    // The auto-legend text (from label prop on segment) should NOT appear via auto-render
    // because the custom legend replaces it. "FALLACY" might still appear if the custom
    // legend renders it, but our custom legend here does not contain "FALLACY".
    expect(screen.queryByText("FALLACY")).toBeNull();
  });
});

// ─── 8. Footer prop → rendered below value ────────────────────────────────────

describe("MetricTile – footer", () => {
  it("renders footer content when footer prop is provided", () => {
    const footer = (
      <div className="flex justify-between">
        <span>
          <b>42</b> utterances
        </span>
        <span>
          <b>312</b> wpm
        </span>
      </div>
    );
    render(<MetricTile label="SESSION" value="11:43" footer={footer} />);
    expect(screen.getByText(/utterances/)).toBeTruthy();
    expect(screen.getByText(/wpm/)).toBeTruthy();
  });
});

// ─── 9. segments AND footer both visible ──────────────────────────────────────

describe("MetricTile – segments + footer together", () => {
  it("renders both bar segments and footer when both props are provided", () => {
    const segments: MetricSegment[] = [
      { flex: 4, colorClass: "bg-green", label: "TRUE" },
      { flex: 2, colorClass: "bg-red", label: "FALSE" },
    ];
    const footer = <span data-testid="tile-footer">footer content</span>;
    const { container } = render(
      <MetricTile
        label="CLAIMS"
        value="6"
        segments={segments}
        footer={footer}
      />,
    );
    // Bar should be present
    expect(container.querySelector(".bg-green")).not.toBeNull();
    // Footer should also be present
    expect(screen.getByTestId("tile-footer")).toBeTruthy();
  });
});

// ─── 10. value="11:43" renders correctly ──────────────────────────────────────

describe("MetricTile – time value", () => {
  it("renders a time-formatted value without parsing issues", () => {
    render(<MetricTile label="SESSION" value="11:43" />);
    expect(screen.getByText("11:43")).toBeTruthy();
  });
});

// ─── 11. Wrapper uses bg-paper border border-line ────────────────────────────

describe("MetricTile – base classes", () => {
  it("the wrapping element has bg-paper, border, and border-line classes", () => {
    const { container } = render(<MetricTile label="CLAIMS" value="8" />);
    // The root element (first child of container) is the tile wrapper
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("bg-paper");
    expect(wrapper.className).toContain("border");
    expect(wrapper.className).toContain("border-line");
  });

  it("the Link wrapper also has bg-paper, border, and border-line classes", () => {
    const { container } = render(
      <MetricTile label="CLAIMS" value="8" href="/claims" />,
    );
    const anchor = container.querySelector("a") as HTMLElement;
    expect(anchor.className).toContain("bg-paper");
    expect(anchor.className).toContain("border");
    expect(anchor.className).toContain("border-line");
  });
});
