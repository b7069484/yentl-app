import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("ulid", () => ({
  ulid: () => "claim-quick-1",
}));

const mockSetPrerecordStage = vi.fn();
const mockSetSource = vi.fn();
const mockStartSession = vi.fn();
const mockAddClaim = vi.fn();
const mockUpdateClaim = vi.fn();
let mockStartedAt: string | null = null;

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      startedAt: mockStartedAt,
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
      startSession: mockStartSession,
      addClaim: mockAddClaim,
      updateClaim: mockUpdateClaim,
    };
    return selector ? selector(state) : state;
  }),
}));

import { ClaimQuickCheckPane } from "@/components/session/ingest-panes/claim-quick-check-pane";

beforeEach(() => {
  vi.clearAllMocks();
  mockStartedAt = null;
  global.fetch = vi.fn();
});

function mockVerificationFetch() {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        primary_label: "PARTIAL",
        score: 55,
        annotations: ["Early evidence is mixed."],
        explanation: "Initial read is mixed.",
        sources: [],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        primary_label: "TRUE",
        score: 92,
        annotations: ["Confirmed by official records."],
        explanation: "The claim is supported.",
        sources: [
          {
            url: "https://example.gov/source",
            domain: "example.gov",
            reputation: "high",
          },
        ],
      }),
    });
  global.fetch = fetchMock;
  return fetchMock;
}

describe("ClaimQuickCheckPane", () => {
  it("renders the claim entry and context prompt", () => {
    render(<ClaimQuickCheckPane />);
    expect(screen.getByRole("heading", { name: /Check one specific claim/i })).toBeTruthy();
    expect(screen.getByLabelText("Claim")).toBeTruthy();
    expect(screen.getByLabelText(/Optional context/i)).toBeTruthy();
  });

  it("Back to sources returns to the source picker", () => {
    render(<ClaimQuickCheckPane />);
    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });

  it("asks for a complete factual claim before checking", () => {
    render(<ClaimQuickCheckPane />);
    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "Taxes" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));
    expect(screen.getByRole("alert").textContent).toContain("complete factual claim");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("starts a claim-only session, verifies the claim, and routes to claims", async () => {
    const fetchMock = mockVerificationFetch();
    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "The city approved a $42 million school repair bond in 2024." },
    });
    fireEvent.change(screen.getByLabelText(/Optional context/i), {
      target: { value: "The claim refers to Springfield city council." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(mockAddClaim).toHaveBeenCalledWith(expect.objectContaining({
        id: "claim-quick-1",
        claim_text: "The city approved a $42 million school repair bond in 2024.",
        status: "checking",
        topic: "Quick check",
      }));
    });

    expect(mockSetSource).toHaveBeenCalledWith(expect.objectContaining({
      kind: "text_doc",
      intent: "claim_only",
    }));
    expect(mockStartSession).toHaveBeenCalledWith(
      "Claim check: The city approved a $42 million school repair bond in 2024.",
    );

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith("claim-quick-1", expect.objectContaining({
        primary_label: "TRUE",
        status: "confirmed",
      }));
      expect(mockRouterPush).toHaveBeenCalledWith("/session?view=claims");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/verify-provisional", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim_text: "The city approved a $42 million school repair bond in 2024.",
        source_context: "The claim refers to Springfield city council.",
      }),
    }));
    expect(fetchMock).toHaveBeenCalledWith("/api/verify-confirmed", expect.any(Object));
  });

  it("does not restart the session when one already exists", async () => {
    mockStartedAt = "2026-05-25T12:00:00.000Z";
    mockVerificationFetch();
    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "The policy took effect on January 1, 2026." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/session?view=claims");
    });
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockSetSource).not.toHaveBeenCalled();
  });

  it("shows retry guidance when quick-check verification is rate-limited", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "9" }),
      json: async () => ({
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      }),
    });
    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "The city approved a school repair bond in 2024." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Wait about 9 seconds");
    });
  });
});
