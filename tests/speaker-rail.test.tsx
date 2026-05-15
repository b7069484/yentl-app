import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeakerRail } from "@/components/session/speaker-rail";
import type { Speaker } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SPEAKERS_3: Speaker[] = [
  { id: 0, label: "Speaker 1" },
  { id: 1, label: "Speaker 2" },
  { id: 2, label: "Speaker 3" },
];

function noop() {}

// ─── 1. Zero speakers → empty placeholder ────────────────────────────────────

describe("SpeakerRail – empty state", () => {
  it("renders placeholder text when speakers array is empty", () => {
    render(
      <SpeakerRail speakers={[]} activeSpeakerId={null} onRename={noop} />,
    );
    expect(screen.getByText("Listening for voices…")).toBeTruthy();
  });

  it("renders no chip buttons when speakers array is empty", () => {
    const { container } = render(
      <SpeakerRail speakers={[]} activeSpeakerId={null} onRename={noop} />,
    );
    // Chip renders role="button" when not editing
    const buttons = container.querySelectorAll("[role='button']");
    expect(buttons.length).toBe(0);
  });
});

// ─── 2. Three speakers → 3 chip labels ───────────────────────────────────────

describe("SpeakerRail – speaker chips", () => {
  it("renders a chip for each speaker with the correct label", () => {
    render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={null} onRename={noop} />,
    );
    expect(screen.getByText("Speaker 1")).toBeTruthy();
    expect(screen.getByText("Speaker 2")).toBeTruthy();
    expect(screen.getByText("Speaker 3")).toBeTruthy();
  });
});

// ─── 3. activeSpeakerId → ring wrapper ───────────────────────────────────────

describe("SpeakerRail – active speaker ring", () => {
  it("applies ring-2 class to the active chip wrapper", () => {
    const { container } = render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={1} onRename={noop} />,
    );
    // The wrapper div for the active chip should have ring-2
    const ringWrapper = container.querySelector(".ring-2");
    expect(ringWrapper).not.toBeNull();
  });

  it("does NOT apply ring-2 to inactive chip wrappers", () => {
    const { container } = render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={1} onRename={noop} />,
    );
    const ringWrappers = container.querySelectorAll(".ring-2");
    // Only 1 ring wrapper — only the active speaker
    expect(ringWrappers.length).toBe(1);
  });
});

// ─── 4. activeSpeakerId === null → no ring ───────────────────────────────────

describe("SpeakerRail – no active speaker", () => {
  it("renders no ring wrapper when activeSpeakerId is null", () => {
    const { container } = render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={null} onRename={noop} />,
    );
    const ringWrappers = container.querySelectorAll(".ring-2");
    expect(ringWrappers.length).toBe(0);
  });
});

// ─── 5. activeSpeakerId !== null → middle bars green ─────────────────────────

describe("SpeakerRail – status meter colors", () => {
  it("middle 3 meter bars use bg-green when activeSpeakerId is set", () => {
    const { container } = render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={0} onRename={noop} />,
    );
    const greenBars = container.querySelectorAll(".bg-green");
    // Exactly 3 middle bars should be green
    expect(greenBars.length).toBe(3);
  });

  // ─── 6. activeSpeakerId === null → all bars ink-4 ────────────────────────

  it("all meter bars use bg-ink-4 when activeSpeakerId is null", () => {
    const { container } = render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={null} onRename={noop} />,
    );
    const inkBars = container.querySelectorAll(".bg-ink-4");
    // All 5 bars should be ink-4
    expect(inkBars.length).toBe(5);
    const greenBars = container.querySelectorAll(".bg-green");
    expect(greenBars.length).toBe(0);
  });
});

// ─── 7. Click idle chip → enters editing state ───────────────────────────────

describe("SpeakerRail – rename interaction", () => {
  it("clicking an idle chip puts that chip into editing state (input appears)", () => {
    render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={null} onRename={noop} />,
    );
    // Initially no input
    expect(screen.queryByRole("textbox")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Speaker 1/ }));
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  // ─── 8. Edit + Enter → onRename called with trimmed value ────────────────

  it("pressing Enter calls onRename with the trimmed value", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={null} onRename={onRename} />,
    );

    // Open edit on Speaker 1 (id=0)
    fireEvent.click(screen.getByRole("button", { name: /Speaker 1/ }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "  Alice  ");
    await user.keyboard("{Enter}");

    expect(onRename).toHaveBeenCalledWith(0, "Alice");
  });

  // ─── 9. Edit + Escape → onRename NOT called ──────────────────────────────

  it("pressing Escape cancels edit without calling onRename", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(
      <SpeakerRail speakers={SPEAKERS_3} activeSpeakerId={null} onRename={onRename} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Speaker 1/ }));
    await user.keyboard("{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    // Edit mode should be closed
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  // ─── 10. Click chip B while editing chip A → save A, open B ─────────────

  it("clicking a different chip while editing saves the pending value and opens new edit", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    const speakers: Speaker[] = [
      { id: 0, label: "Speaker 1" },
      { id: 1, label: "Speaker 2" },
    ];
    render(
      <SpeakerRail speakers={speakers} activeSpeakerId={null} onRename={onRename} />,
    );

    // Start editing Speaker 1
    fireEvent.click(screen.getByRole("button", { name: /Speaker 1/ }));
    const inputA = screen.getByRole("textbox");
    await user.clear(inputA);
    await user.type(inputA, "Alice");

    // Click Speaker 2 chip — Speaker 2 is not editing, so it has role="button".
    // Use userEvent so that focus/blur events fire in the correct sequence
    // (blur on chip A's input before the click handler on chip B).
    await user.click(screen.getByRole("button", { name: /Speaker 2/ }));

    // onRename should have been called for speaker id=0 with "Alice"
    expect(onRename).toHaveBeenCalledWith(0, "Alice");
    // Speaker 2 should now be in edit mode
    expect(screen.getByRole("textbox")).toBeTruthy();
  });
});

// ─── 11. Speaker id ≥ 6 → numeric badge appears ──────────────────────────────

describe("SpeakerRail – numeric badge for id >= 6", () => {
  it("renders a numeric badge for a speaker with id=6", () => {
    const speakers: Speaker[] = [{ id: 6, label: "Speaker 7" }];
    const { container } = render(
      <SpeakerRail speakers={speakers} activeSpeakerId={null} onRename={noop} />,
    );
    // Badge shows speakerId + 1 = 7
    // The absolute badge span from SpeakerChip
    const badge = container.querySelector("span.absolute");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("7");
  });
});

// ─── 12. Empty + activeSpeakerId === null → no errors ────────────────────────

describe("SpeakerRail – empty + no active speaker", () => {
  it("renders placeholder and meter without errors when empty and no active speaker", () => {
    const { container } = render(
      <SpeakerRail speakers={[]} activeSpeakerId={null} onRename={noop} />,
    );
    // Placeholder text
    expect(screen.getByText("Listening for voices…")).toBeTruthy();
    // Meter should still render (5 bars)
    const bars = container.querySelectorAll(".bg-ink-4");
    expect(bars.length).toBe(5);
    // No errors (test just completing without throw is the assertion)
  });
});
