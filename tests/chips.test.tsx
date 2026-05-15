import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  VerdictChip,
  MarkerChip,
  SpeakerChip,
  SourceChip,
  TopicChip,
} from "@/components/session/chips";

// ─── VerdictChip ─────────────────────────────────────────────────────────────

describe("VerdictChip", () => {
  it("renders base text class on all verdicts", () => {
    const verdicts = [
      "TRUE", "MOSTLY_TRUE", "PARTIAL", "MISLEADING",
      "OMISSION", "FALSE", "UNVERIFIABLE", "OPINION",
    ] as const;
    for (const verdict of verdicts) {
      const { container } = render(<VerdictChip verdict={verdict} />);
      const chip = container.firstChild as HTMLElement;
      // All chips carry the base 10px text class
      expect(chip.className).toContain("text-[10px]");
    }
  });

  it("renders FALSE with an X icon (two line elements)", () => {
    const { container } = render(<VerdictChip verdict="FALSE" />);
    const lines = container.querySelectorAll("svg line");
    expect(lines.length).toBe(2);
  });

  it("renders CHECKING with a spinner that has animate-spin", () => {
    const { container } = render(<VerdictChip verdict="CHECKING" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  it("renders score when provided for scored verdicts", () => {
    const { container } = render(<VerdictChip verdict="TRUE" score={92} />);
    expect(container.textContent).toContain("92");
  });

  it("does NOT render score for UNVERIFIABLE", () => {
    const { container } = render(<VerdictChip verdict="UNVERIFIABLE" score={50} />);
    // score span should not appear
    const scoreSpan = container.querySelector("span.opacity-75");
    expect(scoreSpan).toBeNull();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<VerdictChip verdict="FALSE" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies italic class for OMISSION", () => {
    const { container } = render(<VerdictChip verdict="OMISSION" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("italic");
  });

  it("applies italic class for OPINION", () => {
    const { container } = render(<VerdictChip verdict="OPINION" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("italic");
  });
});

// ─── MarkerChip ───────────────────────────────────────────────────────────────

describe("MarkerChip", () => {
  it("renders the display text", () => {
    render(<MarkerChip type="fallacy" display="Ad Hominem" />);
    expect(screen.getByText("Ad Hominem")).toBeTruthy();
  });

  it("fallacy applies purple color class", () => {
    const { container } = render(<MarkerChip type="fallacy" display="Straw Man" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("text-purple");
  });

  it("bias applies amber-2 color class", () => {
    const { container } = render(<MarkerChip type="bias" display="Confirmation Bias" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("text-amber-2");
  });

  it("rhetoric applies pink color class", () => {
    const { container } = render(<MarkerChip type="rhetoric" display="Loaded Language" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("text-pink");
  });

  it("renders severity suffix when provided", () => {
    render(<MarkerChip type="fallacy" display="Tu Quoque" severity="blatant" />);
    expect(screen.getByText("blatant")).toBeTruthy();
  });

  it("does not render severity suffix when omitted", () => {
    const { container } = render(<MarkerChip type="bias" display="Anchoring" />);
    const severitySpan = container.querySelector("span.opacity-70");
    expect(severitySpan).toBeNull();
  });

  it("renders archetypeIcon when provided", () => {
    const icon = <span data-testid="archetype-icon">★</span>;
    render(<MarkerChip type="rhetoric" display="Dog Whistle" archetypeIcon={icon} />);
    expect(screen.getByTestId("archetype-icon")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<MarkerChip type="fallacy" display="Hasty Generalization" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ─── SpeakerChip ─────────────────────────────────────────────────────────────

describe("SpeakerChip", () => {
  it("renders label text when not editing", () => {
    render(<SpeakerChip speakerId={0} label="Speaker 1" />);
    expect(screen.getByText("Speaker 1")).toBeTruthy();
  });

  it("click invokes onEditStart when not editing", () => {
    const onEditStart = vi.fn();
    render(<SpeakerChip speakerId={0} label="Speaker 1" onEditStart={onEditStart} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onEditStart).toHaveBeenCalledTimes(1);
  });

  it("renders input when editing=true", () => {
    render(<SpeakerChip speakerId={1} label="Speaker 2" editing />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("Enter key invokes onSave with trimmed value", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <SpeakerChip speakerId={0} label="Speaker 1" editing onSave={onSave} />,
    );
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "  Alice  ");
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledWith("Alice");
  });

  it("Escape key invokes onCancel", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <SpeakerChip speakerId={0} label="Speaker 1" editing onCancel={onCancel} />,
    );
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("blur invokes onSave", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <SpeakerChip speakerId={0} label="Speaker 1" editing onSave={onSave} />
        <button>other</button>
      </>,
    );
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Bob");
    await user.click(screen.getByRole("button", { name: "other" }));
    expect(onSave).toHaveBeenCalledWith("Bob");
  });

  it("shows numeric badge when speakerId >= 6", () => {
    const { container } = render(<SpeakerChip speakerId={6} label="Speaker 7" />);
    // Badge shows speakerId + 1 = 7
    expect(container.textContent).toContain("7");
  });

  it("does NOT show numeric badge when speakerId < 6", () => {
    const { container } = render(<SpeakerChip speakerId={5} label="Speaker 6" />);
    // No badge element with absolute positioning
    const badge = container.querySelector("span.absolute");
    expect(badge).toBeNull();
  });

  it("applies the correct CSS variable for speaker color dot", () => {
    const { container } = render(<SpeakerChip speakerId={2} label="Speaker 3" />);
    // speakerId=2 → paletteIndex=3 → --spk-3
    const dot = container.querySelector("[aria-hidden]") as HTMLElement;
    expect(dot?.style.backgroundColor).toBe("var(--spk-3)");
  });
});

// ─── SourceChip ───────────────────────────────────────────────────────────────

describe("SourceChip", () => {
  it("renders domain text", () => {
    render(
      <SourceChip domain="bbc.com" stance="supports" reputationTier="high" />,
    );
    expect(screen.getByText(/bbc\.com/)).toBeTruthy();
  });

  it("renders supports stance dot with green class", () => {
    const { container } = render(
      <SourceChip domain="reuters.com" stance="supports" reputationTier="mid" />,
    );
    const dot = container.querySelector("[data-stance='supports']") as HTMLElement;
    expect(dot?.className).toContain("bg-green");
  });

  it("renders contradicts stance dot with red class", () => {
    const { container } = render(
      <SourceChip domain="example.com" stance="contradicts" reputationTier="low" />,
    );
    const dot = container.querySelector("[data-stance='contradicts']") as HTMLElement;
    expect(dot?.className).toContain("bg-red");
  });

  it("renders mixed stance dot with orange class", () => {
    const { container } = render(
      <SourceChip domain="example.org" stance="mixed" reputationTier="mid" />,
    );
    const dot = container.querySelector("[data-stance='mixed']") as HTMLElement;
    expect(dot?.className).toContain("bg-orange");
  });

  it("applies high-tier inset shadow for reputationTier=high", () => {
    const { container } = render(
      <SourceChip domain="nature.com" stance="supports" reputationTier="high" />,
    );
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("shadow-[inset_0_0_0_1px_rgba(15,138,95,0.15)]");
  });

  it("does NOT apply inset shadow for reputationTier=mid", () => {
    const { container } = render(
      <SourceChip domain="cnn.com" stance="mixed" reputationTier="mid" />,
    );
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).not.toContain("shadow-[inset");
  });

  it("renders dateText suffix when provided", () => {
    render(
      <SourceChip domain="nyt.com" stance="supports" reputationTier="mid" dateText="Jan 2024" />,
    );
    expect(screen.getByText(/Jan 2024/)).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <SourceChip domain="bbc.com" stance="supports" reputationTier="high" onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ─── TopicChip ────────────────────────────────────────────────────────────────

describe("TopicChip", () => {
  it("renders the topic text", () => {
    render(<TopicChip topic="climate" />);
    expect(screen.getByText("climate")).toBeTruthy();
  });

  it("applies uppercase CSS class", () => {
    const { container } = render(<TopicChip topic="health" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain("uppercase");
  });

  it("renders multi-word topics", () => {
    render(<TopicChip topic="foreign policy" />);
    expect(screen.getByText("foreign policy")).toBeTruthy();
  });
});
