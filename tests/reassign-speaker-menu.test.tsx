import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Speaker, TranscriptSegment } from "@/lib/types";

// ── Session store mock ────────────────────────────────────────────────────────

const mockReassignUtterance = vi.fn();
const mockAddNewSpeaker = vi.fn();
const mockSplitSegmentAt = vi.fn();

let mockSpeakers: Speaker[] = [];
let mockTranscript: TranscriptSegment[] = [];

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector: (s: unknown) => unknown) => {
    const state = {
      speakers: mockSpeakers,
      transcript: mockTranscript,
      reassignUtterance: mockReassignUtterance,
      addNewSpeaker: mockAddNewSpeaker,
      splitSegmentAt: mockSplitSegmentAt,
    };
    return selector(state);
  }),
}));

// paletteFor is imported from lib/client/speaker-palette — mock it simply
vi.mock("@/lib/client/speaker-palette", () => ({
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
  // Default transcript: a two-sentence, multi-word segment at index 0
  mockTranscript = [
    {
      text: "Hello world. Goodbye now.",
      start: 10,
      end: 20,
      is_final: true,
      speaker_id: 0,
    },
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

// ── Split & reassign UI flow ───────────────────────────────────────────────────

// computeSplitTime is exported for unit-testing the formula directly
import { computeSplitTime } from "@/components/session/reassign-speaker-menu";

describe("computeSplitTime", () => {
  it("splits at the midpoint for word index 1 of 4", () => {
    // text: "Hello world. Goodbye now." → 4 words
    // split after word index 1 (zero-based) → (2/4) through the duration
    const time = computeSplitTime("Hello world. Goodbye now.", 10, 20, 1);
    expect(time).toBeCloseTo(15, 5); // 10 + (2/4)*10 = 15
  });

  it("splits at the first boundary for word index 0 of 4", () => {
    const time = computeSplitTime("Hello world. Goodbye now.", 10, 20, 0);
    expect(time).toBeCloseTo(12.5, 5); // 10 + (1/4)*10 = 12.5
  });

  it("handles two-word segment correctly", () => {
    const time = computeSplitTime("Hello world", 0, 10, 0);
    expect(time).toBeCloseTo(5, 5); // 0 + (1/2)*10 = 5
  });
});

describe("ReassignSpeakerMenu — Split & reassign sub-menu", () => {
  it("shows the 'Split & reassign…' sub-trigger when segment has multiple words", async () => {
    // mockTranscript[0] has 4 words: "Hello world. Goodbye now."
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    await waitFor(() => {
      expect(screen.getByTestId("split-reassign-trigger")).toBeTruthy();
    });
  });

  it("shows disabled split item when segment has only one word", async () => {
    mockTranscript = [
      { text: "Hello", start: 10, end: 20, is_final: true, speaker_id: 0 },
    ];
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    await waitFor(() => {
      expect(screen.getByTestId("split-reassign-disabled")).toBeTruthy();
    });
  });

  it("shows word chips when sub-menu is opened", async () => {
    const user = userEvent.setup();
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");

    // hover the sub-trigger to open sub-content
    const subTrigger = await screen.findByTestId("split-reassign-trigger");
    await user.hover(subTrigger);

    await waitFor(() => {
      // segWords = ["Hello", "world.", "Goodbye", "now."]
      // We show all but the last word as split points (3 chips: indices 0,1,2)
      expect(screen.getByTestId("split-word-chips")).toBeTruthy();
    });

    // Verify individual word chips are in the DOM (indices 0,1,2 — not the last word)
    const wordChips = screen.queryAllByTestId(/^split-word-\d+$/);
    expect(wordChips.length).toBe(3); // 4 words → 3 split boundaries
  });

  it("shows split-word-chips only for all-but-last words", async () => {
    mockTranscript = [
      { text: "First Second Third", start: 0, end: 9, is_final: true, speaker_id: 0 },
    ];
    const user = userEvent.setup();
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");

    const subTrigger = await screen.findByTestId("split-reassign-trigger");
    await user.hover(subTrigger);

    await waitFor(() => {
      expect(screen.getByTestId("split-word-chips")).toBeTruthy();
    });
    // 3 words → 2 boundaries (chips at indices 0 and 1)
    const chips = screen.queryAllByTestId(/^split-word-\d+$/);
    expect(chips.length).toBe(2);
  });

  it("calls splitSegmentAt with correct args after word chip click then speaker pick", async () => {
    // Segment: text="Hello world. Goodbye now." start=10 end=20 speaker_id=0
    // Words: ["Hello", "world.", "Goodbye", "now."]
    // Step 1: click word at index 1 ("world.") — e.preventDefault() keeps sub-menu open
    //         and transitions to speaker-picker step
    // Step 2: click Speaker 2 (id=1) → splitSegmentAt called
    // Expected splitTime = 10 + (2/4)*(20-10) = 15
    const user = userEvent.setup();
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");

    // Open the "Split & reassign…" sub-menu
    const subTrigger = await screen.findByTestId("split-reassign-trigger");
    await user.hover(subTrigger);

    // Word chips are now in DOM — click word at index 1 ("world.")
    // This fires onSelect with e.preventDefault(), keeping the sub-menu open
    // and updating splitWordIndex state to show the speaker picker
    const wordChip = await screen.findByTestId("split-word-1");
    // userEvent dispatches synthetic pointerdown, which Radix's DropdownMenu
    // treats as an outside-click and closes the sub-menu BEFORE onSelect can
    // fire. fireEvent.click skips the pointer phase and triggers onSelect
    // directly, mirroring what a real click ultimately does in the browser
    // (Radix's outside-click handler doesn't fire when the click target is
    // inside the menu).
    fireEvent.click(wordChip);

    // After word pick, the sub-content should now show the speaker picker
    await waitFor(() => {
      expect(screen.getByTestId("split-speaker-option-1")).toBeTruthy();
    });

    // Pick Speaker 2 (id=1) — use fireEvent to avoid userEvent's pointer dismiss
    const speakerOption = screen.getByTestId("split-speaker-option-1");
    fireEvent.click(speakerOption);

    expect(mockSplitSegmentAt).toHaveBeenCalledTimes(1);
    const [calledIndex, calledTime, calledSpeaker] = mockSplitSegmentAt.mock.calls[0];
    expect(calledIndex).toBe(0);
    expect(calledTime).toBeCloseTo(15, 5);
    expect(calledSpeaker).toBe(1);
  });

  it("does not call splitSegmentAt when menu is opened but no word is selected", async () => {
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");
    expect(mockSplitSegmentAt).not.toHaveBeenCalled();
  });

  it("Back button returns from speaker picker to word chips", async () => {
    // Step through: open sub-menu → pick word → see speaker picker → click Back
    // → assert word chips visible again, no splitSegmentAt call
    const user = userEvent.setup();
    renderMenu(0, 0);
    await openMenu("reassign-trigger-0");

    const subTrigger = await screen.findByTestId("split-reassign-trigger");
    await user.hover(subTrigger);

    const wordChip = await screen.findByTestId("split-word-1");
    fireEvent.click(wordChip);

    // We're on the speaker picker now
    await waitFor(() => {
      expect(screen.getByTestId("split-speaker-option-1")).toBeTruthy();
    });
    expect(screen.getByTestId("split-back-button")).toBeTruthy();

    // Click Back — should re-render the word chips
    fireEvent.click(screen.getByTestId("split-back-button"));

    await waitFor(() => {
      expect(screen.getByTestId("split-word-chips")).toBeTruthy();
    });
    // Speaker picker is gone
    expect(screen.queryByTestId("split-speaker-option-1")).toBeNull();
    // And we never called splitSegmentAt
    expect(mockSplitSegmentAt).not.toHaveBeenCalled();
  });
});
