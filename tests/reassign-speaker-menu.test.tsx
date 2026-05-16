import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Speaker } from "@/lib/types";

// ── Session store mock ────────────────────────────────────────────────────────

const mockReassignUtterance = vi.fn();
const mockAddNewSpeaker = vi.fn();

let mockSpeakers: Speaker[] = [];

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      speakers: mockSpeakers,
      reassignUtterance: mockReassignUtterance,
      addNewSpeaker: mockAddNewSpeaker,
    };
    return selector(state);
  }),
}));

// paletteFor is imported from TranscriptView — mock it simply
vi.mock("@/components/session/TranscriptView", () => ({
  paletteFor: vi.fn((id: number) => ({
    dot: `bg-spk-${id + 1}`,
    label: "text-ink",
    border: `border-spk-${id + 1}`,
  })),
}));

// ── Import under test ─────────────────────────────────────────────────────────

import { ReassignSpeakerMenu } from "@/components/session/reassign-speaker-menu";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderMenu(transcriptIndex = 0, speakerId: number | null = 0) {
  return render(
    <ReassignSpeakerMenu transcriptIndex={transcriptIndex} speakerId={speakerId} />,
  );
}

/** Open the menu by clicking its trigger with userEvent (Radix needs pointer events). */
async function openMenu(triggerTestId: string) {
  const user = userEvent.setup();
  const trigger = screen.getByTestId(triggerTestId);
  await user.click(trigger);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSpeakers = [
    { id: 0, label: "Speaker 1" },
    { id: 1, label: "Speaker 2" },
  ];
  mockAddNewSpeaker.mockReturnValue(2);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ReassignSpeakerMenu — renders trigger", () => {
  it("renders the trigger button with the current speaker label", () => {
    renderMenu(0, 0);
    expect(screen.getByTestId("reassign-trigger-0")).toBeTruthy();
  });

  it("renders 'Unknown' label when speakerId is null", () => {
    renderMenu(0, null);
    const trigger = screen.getByTestId("reassign-trigger-0");
    expect(trigger.textContent).toContain("Unknown");
  });
});

describe("ReassignSpeakerMenu — dropdown content", () => {
  it("opens dropdown and renders all known speakers as options", async () => {
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");

    await waitFor(() => {
      expect(screen.getByTestId("reassign-option-0")).toBeTruthy();
      expect(screen.getByTestId("reassign-option-1")).toBeTruthy();
    });
  });

  it("renders 'Add new speaker' option", async () => {
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    await waitFor(() => {
      expect(screen.getByTestId("reassign-add-new")).toBeTruthy();
    });
  });

  it("shows all speaker labels in the dropdown", async () => {
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    // "Speaker 1" appears in both the trigger and the dropdown option —
    // use getAllByText and confirm there are ≥2 matches (trigger + option).
    await waitFor(() => {
      const sp1Matches = screen.getAllByText("Speaker 1");
      expect(sp1Matches.length).toBeGreaterThanOrEqual(2);
      // "Speaker 2" only appears inside the dropdown
      expect(screen.getByText("Speaker 2")).toBeTruthy();
    });
  });
});

describe("ReassignSpeakerMenu — interactions", () => {
  it("clicking a speaker option calls reassignUtterance with that id", async () => {
    renderMenu(2, 0);
    await openMenu("reassign-trigger-2");
    const option = await screen.findByTestId("reassign-option-1");
    await userEvent.setup().click(option);
    expect(mockReassignUtterance).toHaveBeenCalledWith(2, 1);
  });

  it("clicking 'Add new speaker' calls addNewSpeaker and then reassignUtterance", async () => {
    mockAddNewSpeaker.mockReturnValue(3);
    renderMenu(1, 0);
    await openMenu("reassign-trigger-1");
    const addNew = await screen.findByTestId("reassign-add-new");
    await userEvent.setup().click(addNew);
    expect(mockAddNewSpeaker).toHaveBeenCalledTimes(1);
    expect(mockReassignUtterance).toHaveBeenCalledWith(1, 3);
  });

  it("does not call reassignUtterance when trigger is clicked but no option is selected", async () => {
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    // No option selected — expect no call
    expect(mockReassignUtterance).not.toHaveBeenCalled();
  });
});

describe("ReassignSpeakerMenu — edge cases", () => {
  it("renders correctly when there are no speakers yet", async () => {
    mockSpeakers = [];
    renderMenu(0, null);
    await openMenu("reassign-trigger-0");
    // Should still render the Add new speaker option
    await waitFor(() => {
      expect(screen.getByTestId("reassign-add-new")).toBeTruthy();
    });
  });

  it("renders correctly with a single speaker", async () => {
    mockSpeakers = [{ id: 0, label: "Alice" }];
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    await waitFor(() => {
      expect(screen.getByTestId("reassign-option-0")).toBeTruthy();
      expect(screen.getByTestId("reassign-add-new")).toBeTruthy();
    });
  });
});
