import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ClaimCard } from "@/lib/types";

const mockRouterPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => mockSearchParams,
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
let mockClaims: ClaimCard[] = [];

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      startedAt: mockStartedAt,
      claims: mockClaims,
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
  mockClaims = [];
  mockSearchParams = new URLSearchParams();
  global.fetch = vi.fn();
});

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "existing-claim-1",
    claim_text: "The city approved a $42 million school repair bond in 2024.",
    utterance_start: 0,
    utterance_end: 0,
    speaker_id: null,
    topic: "Quick check",
    topic_secondary: null,
    primary_label: "TRUE",
    score: 92,
    annotations: ["Confirmed by official records."],
    explanation: "The claim is supported.",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ClaimQuickCheckPane", () => {
  it("renders the claim entry and context prompt", () => {
    render(<ClaimQuickCheckPane />);
    expect(screen.getByRole("heading", { name: /Check one specific claim/i })).toBeTruthy();
    expect(screen.getByLabelText("Claim")).toBeTruthy();
    expect(screen.getByLabelText(/Optional context/i)).toBeTruthy();
  });

  it("renders a mobile quick-check action sheet that reflects readiness", async () => {
    mockVerificationFetch();
    render(<ClaimQuickCheckPane />);

    const sheet = screen.getByTestId("mobile-quick-check-sheet");
    expect(sheet.className).toContain("sm:hidden");
    expect(sheet.textContent).toContain("Add a factual claim");

    const mobileButton = screen.getByRole("button", {
      name: "Check claim from mobile action sheet",
    }) as HTMLButtonElement;
    expect(mobileButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "The city approved a $42 million school repair bond in 2024." },
    });

    expect(sheet.textContent).toContain("Ready to check");
    expect(mobileButton.disabled).toBe(false);

    fireEvent.click(mobileButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });
  });

  it("Back to sources returns to the source picker", () => {
    render(<ClaimQuickCheckPane />);
    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });

  it("loads the deterministic validation claim and sends its source trail context", async () => {
    const fetchMock = mockVerificationFetch();
    render(<ClaimQuickCheckPane />);

    fireEvent.click(screen.getByRole("button", { name: "Load validation claim" }));

    expect(screen.getByLabelText("Claim")).toHaveValue(
      "City spending rose by twelve percent this year without raising taxes.",
    );
    expect((screen.getByLabelText(/Optional context/i) as HTMLTextAreaElement).value).toContain(
      "Yentl document validation brief",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });

    const provisionalBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(provisionalBody).toMatchObject({
      claim_text: "City spending rose by twelve percent this year without raising taxes.",
      source_context: expect.stringContaining("source trail"),
      claim_context: {
        speaker_id: null,
        topic: "Quick check",
        stance: "asserted",
        attribution_status: "not_available",
        attribution_reasons: ["manual_user_action"],
      },
    });
    const confirmedBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(confirmedBody).toEqual(provisionalBody);
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

  it("asks for context before checking an ambiguous standalone claim", () => {
    render(<ClaimQuickCheckPane />);
    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "He said it was illegal yesterday." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    expect(screen.getByRole("alert").textContent).toContain("Add context before checking");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockAddClaim).not.toHaveBeenCalled();
  });

  it("allows an ambiguous claim once the user adds context", async () => {
    const fetchMock = mockVerificationFetch();
    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "He said it was illegal yesterday." },
    });
    fireEvent.change(screen.getByLabelText(/Optional context/i), {
      target: { value: "A city inspector said the school repair vote violated state procurement rules on June 8, 2026." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      claim_text: "He said it was illegal yesterday.",
      source_context: "A city inspector said the school repair vote violated state procurement rules on June 8, 2026.",
    });
  });

  it("starts a claim-only session, verifies the claim, and routes to the result detail", async () => {
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
        stance: "asserted",
        source_context: "The claim refers to Springfield city council.",
        ownership: expect.objectContaining({
          owner_speaker_id: null,
          attribution_status: "not_available",
          attribution_reasons: ["manual_user_action"],
          stance: "asserted",
        }),
      }));
    });

    expect(mockSetSource).toHaveBeenCalledWith(expect.objectContaining({
      kind: "text_doc",
      intent: "claim_only",
      initial_text: expect.stringContaining("The claim refers to Springfield city council."),
    }));
    expect(mockStartSession).toHaveBeenCalledWith(
      "Claim check: The city approved a $42 million school repair bond in 2024.",
    );

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith("claim-quick-1", expect.objectContaining({
        primary_label: "TRUE",
        status: "confirmed",
      }));
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/verify-provisional", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
    const provisionalBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(provisionalBody).toEqual({
      claim_text: "The city approved a $42 million school repair bond in 2024.",
      source_context: "The claim refers to Springfield city council.",
      claim_context: {
        speaker_id: null,
        topic: "Quick check",
        stance: "asserted",
        attribution_status: "not_available",
        attribution_reasons: ["manual_user_action"],
      },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/verify-confirmed", expect.any(Object));
    const confirmedBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(confirmedBody).toEqual(provisionalBody);
  });

  it("shows source-search progress after the first read while confirmed search is pending", async () => {
    const provisional = deferred<{
      ok: boolean;
      json: () => Promise<{
        primary_label: string;
        score: number;
        annotations: string[];
        explanation: string;
        sources: never[];
      }>;
    }>();
    const confirmed = deferred<{
      ok: boolean;
      json: () => Promise<{
        primary_label: string;
        score: number;
        annotations: string[];
        explanation: string;
        sources: never[];
      }>;
    }>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(provisional.promise)
      .mockReturnValueOnce(confirmed.promise);
    global.fetch = fetchMock;

    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "The city approved a $42 million school repair bond in 2024." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("quick-check-progress").textContent).toContain(
        "Building first read",
      );
    });
    expect(screen.getByTestId("mobile-quick-check-sheet").textContent).toContain(
      "Building first read",
    );

    provisional.resolve({
      ok: true,
      json: async () => ({
        primary_label: "PARTIAL",
        score: 55,
        annotations: ["Early evidence is mixed."],
        explanation: "Initial read is mixed.",
        sources: [],
      }),
    });

    await waitFor(() => {
      expect(screen.getByTestId("quick-check-progress").textContent).toContain(
        "Searching source evidence",
      );
    });
    expect(screen.getByTestId("mobile-quick-check-sheet").textContent).toContain(
      "Searching source evidence",
    );
    expect(screen.getByRole("button", { name: "Searching sources" })).toBeTruthy();
    expect(screen.getByText("Initial read ready")).toBeTruthy();
    expect(screen.getByText("Source search in progress")).toBeTruthy();

    confirmed.resolve({
      ok: true,
      json: async () => ({
        primary_label: "TRUE",
        score: 92,
        annotations: ["Confirmed by official records."],
        explanation: "The claim is supported.",
        sources: [],
      }),
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });
  });

  it("detects duplicate quick-check claims and opens the existing result", async () => {
    mockClaims = [makeClaim()];
    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "  The city approved a $42 million school repair bond in 2024! " },
    });

    expect(screen.getByRole("status").textContent).toContain("Already checked");
    expect(screen.getByTestId("mobile-quick-check-sheet").textContent).toContain(
      "Existing result ready",
    );
    expect((screen.getByRole("button", { name: /^Check claim$/i }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Open existing result/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockAddClaim).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/existing-claim-1");
  });

  it("preserves validation route context when opening quick-check detail results", async () => {
    mockSearchParams = new URLSearchParams(
      "demo=validation&sample=source_quote_anchors&title=Source fixture",
    );
    mockVerificationFetch();
    render(<ClaimQuickCheckPane />);

    fireEvent.change(screen.getByLabelText("Claim"), {
      target: { value: "The policy took effect on January 1, 2026." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Check claim$/i }));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/session/detail/claim/claim-quick-1?demo=validation&sample=source_quote_anchors&title=Source+fixture",
      );
    });
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
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockSetSource).not.toHaveBeenCalled();
  });

  it("routes to a retryable result card when quick-check verification is rate-limited", async () => {
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
      expect(mockUpdateClaim).toHaveBeenCalledWith("claim-quick-1", expect.objectContaining({
        status: "provisional",
        primary_label: "UNVERIFIABLE",
        score: 0,
        annotations: ["Verification interrupted"],
        explanation: expect.stringContaining("Wait about 9 seconds"),
        sources: [],
      }));
      expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-quick-1");
    });
  });
});
