import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ActivityFeed,
  formatTs,
} from "@/components/session/activity-feed";
import type { ActivityClaim, ActivityMarker, ActivityEvent } from "@/components/session/activity-feed";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CLAIM_EVENT: ActivityClaim = {
  kind: "claim",
  id: "claim-001",
  ts: 43,
  speakerId: 0,
  speakerLabel: "Alice",
  verdict: "FALSE",
  score: 12,
  quote: "Vaccines cause autism",
};

const MARKER_EVENT: ActivityMarker = {
  kind: "marker",
  id: "marker-001",
  ts: 703,
  speakerId: 1,
  speakerLabel: "Bob",
  markerType: "fallacy",
  display: "Slippery Slope",
  severity: "clear",
  quote: "If we allow X then everything falls apart",
};

function buildClaimHref(id: string) {
  return `/session/claims/${id}`;
}

function buildMarkerHref(id: string) {
  return `/session/markers/${id}`;
}

// ─── 1. Heading "Recent activity" ────────────────────────────────────────────

describe("ActivityFeed – heading", () => {
  it('renders the heading "Recent activity"', () => {
    render(
      <ActivityFeed
        events={[CLAIM_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    expect(screen.getByText("Recent activity")).toBeTruthy();
  });
});

// ─── 2. Empty events → placeholder ───────────────────────────────────────────

describe("ActivityFeed – empty state", () => {
  it('renders "No claims or markers yet — keep talking." when events is empty', () => {
    render(
      <ActivityFeed
        events={[]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    expect(
      screen.getByText("No claims or markers yet — keep talking."),
    ).toBeTruthy();
  });

  it("renders no anchor rows when events is empty (only the transcript link)", () => {
    const { container } = render(
      <ActivityFeed
        events={[]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // Only 1 anchor should exist: the "See full transcript →" link
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(1);
  });
});

// ─── 3. Claim event → VerdictChip with correct verdict ───────────────────────

describe("ActivityFeed – claim row", () => {
  it("renders a VerdictChip showing the correct verdict label for a claim", () => {
    render(
      <ActivityFeed
        events={[CLAIM_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // VerdictChip renders "False" for the FALSE verdict
    expect(screen.getByText("False")).toBeTruthy();
  });
});

// ─── 4. Marker event → MarkerChip with correct display ───────────────────────

describe("ActivityFeed – marker row", () => {
  it("renders a MarkerChip showing the correct display text for a marker", () => {
    render(
      <ActivityFeed
        events={[MARKER_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    expect(screen.getByText("Slippery Slope")).toBeTruthy();
  });
});

// ─── 5. Each row is an anchor with correct href ───────────────────────────────

describe("ActivityFeed – row hrefs", () => {
  it("claim row href matches buildClaimHref(id)", () => {
    const { container } = render(
      <ActivityFeed
        events={[CLAIM_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // Two anchors: the row + the transcript link
    const anchors = Array.from(container.querySelectorAll("a"));
    const rowAnchor = anchors.find(
      (a) => a.getAttribute("href") === "/session/claims/claim-001",
    );
    expect(rowAnchor).toBeTruthy();
  });

  it("marker row href matches buildMarkerHref(id)", () => {
    const { container } = render(
      <ActivityFeed
        events={[MARKER_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    const anchors = Array.from(container.querySelectorAll("a"));
    const rowAnchor = anchors.find(
      (a) => a.getAttribute("href") === "/session/markers/marker-001",
    );
    expect(rowAnchor).toBeTruthy();
  });
});

// ─── 6. Quote text appears inside the row ────────────────────────────────────

describe("ActivityFeed – quote rendering", () => {
  it("renders the claim quote text inside the row", () => {
    render(
      <ActivityFeed
        events={[CLAIM_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    expect(screen.getByText(/Vaccines cause autism/)).toBeTruthy();
  });

  it("renders the marker quote text inside the row", () => {
    render(
      <ActivityFeed
        events={[MARKER_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    expect(screen.getByText(/If we allow X then everything falls apart/)).toBeTruthy();
  });
});

// ─── 7. formatTs helper ───────────────────────────────────────────────────────

describe("formatTs – helper export", () => {
  it('formatTs(43) → "00:43"', () => {
    expect(formatTs(43)).toBe("00:43");
  });

  it('formatTs(703) → "11:43"', () => {
    expect(formatTs(703)).toBe("11:43");
  });

  it('formatTs(0) → "00:00"', () => {
    expect(formatTs(0)).toBe("00:00");
  });

  it("formats minutes correctly for exactly 60 seconds", () => {
    expect(formatTs(60)).toBe("01:00");
  });

  it("pads single-digit seconds with a leading zero", () => {
    expect(formatTs(65)).toBe("01:05");
  });
});

// ─── 8. "See full transcript →" link ─────────────────────────────────────────

describe("ActivityFeed – transcript link", () => {
  it('renders a link to "/session?view=transcript"', () => {
    const { container } = render(
      <ActivityFeed
        events={[]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    const link = container.querySelector(
      'a[href="/session?view=transcript"]',
    );
    expect(link).not.toBeNull();
  });

  it("the transcript link contains 'See full transcript'", () => {
    render(
      <ActivityFeed
        events={[]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    expect(screen.getByText(/See full transcript/)).toBeTruthy();
  });
});

// ─── 9. Speaker avatar has bg-spk-N class ────────────────────────────────────

describe("ActivityFeed – speaker avatar", () => {
  it("speaker avatar element contains bg-spk- in its className", () => {
    const { container } = render(
      <ActivityFeed
        events={[CLAIM_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // The avatar span should have a bg-spk-N class
    // speakerId=0 → (0 % 6) + 1 = 1 → bg-spk-1
    const avatarSpan = container.querySelector('[class*="bg-spk-"]');
    expect(avatarSpan).not.toBeNull();
    expect(avatarSpan?.className).toContain("bg-spk-");
  });

  it("speaker avatar class is bg-spk-1 for speakerId=0", () => {
    const { container } = render(
      <ActivityFeed
        events={[CLAIM_EVENT]}  // speakerId: 0 → index 1
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    const avatarSpan = container.querySelector(".bg-spk-1");
    expect(avatarSpan).not.toBeNull();
  });

  it("speaker avatar class is bg-spk-2 for speakerId=1", () => {
    const { container } = render(
      <ActivityFeed
        events={[MARKER_EVENT]}  // speakerId: 1 → index 2
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    const avatarSpan = container.querySelector(".bg-spk-2");
    expect(avatarSpan).not.toBeNull();
  });

  it("renders the first letter of speakerLabel inside the avatar", () => {
    render(
      <ActivityFeed
        events={[CLAIM_EVENT]}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // CLAIM_EVENT.speakerLabel = "Alice" → first letter "A"
    const avatarText = screen.getByText("A");
    expect(avatarText).toBeTruthy();
  });
});

// ─── 10. Multiple events render correctly ────────────────────────────────────

describe("ActivityFeed – multiple events", () => {
  const EVENTS: ActivityEvent[] = [CLAIM_EVENT, MARKER_EVENT];

  it("renders two rows for two events", () => {
    const { container } = render(
      <ActivityFeed
        events={EVENTS}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // 2 event rows + 1 transcript link = 3 anchors
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(3);
  });

  it("shows formatted timestamps for both events", () => {
    render(
      <ActivityFeed
        events={EVENTS}
        buildClaimHref={buildClaimHref}
        buildMarkerHref={buildMarkerHref}
      />,
    );
    // ts=43 → "00:43", ts=703 → "11:43"
    expect(screen.getByText("00:43")).toBeTruthy();
    expect(screen.getByText("11:43")).toBeTruthy();
  });
});
