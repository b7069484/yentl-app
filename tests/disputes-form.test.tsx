import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DisputeForm } from "@/components/disputes/DisputeForm";

describe("DisputeForm (Phase 1c Task 3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all required fields + submit button", () => {
    render(<DisputeForm sessionId="sess_1" claimId={null} />);
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evidence url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what should we correct/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit dispute/i })).toBeInTheDocument();
  });

  it("shows the claim id when one is provided", () => {
    render(<DisputeForm sessionId="sess_1" claimId="claim_abc" />);
    expect(screen.getByText(/claim_abc/)).toBeInTheDocument();
  });

  it("does not show a claim chip when claimId is null (session-wide dispute)", () => {
    const { container } = render(<DisputeForm sessionId="sess_1" claimId={null} />);
    expect(container.textContent).not.toMatch(/Disputing claim/);
  });

  it("shows success state after a successful POST", async () => {
    const mockFetch = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "dispute_xyz" }), { status: 200 }),
      );

    render(<DisputeForm sessionId="sess_1" claimId={null} />);
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/what should we correct/i), {
      target: { value: "The figure is from a different year than claimed." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit dispute/i }));

    await screen.findByRole("status");
    expect(screen.getByText(/Thanks/)).toBeInTheDocument();
    expect(screen.getByText(/dispute_xyz/)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the POST fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "save failed" }), { status: 500 }),
    );

    render(<DisputeForm sessionId="sess_1" claimId={null} />);
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/what should we correct/i), {
      target: { value: "The figure is from a different year than claimed." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit dispute/i }));

    await screen.findByRole("alert");
    expect(screen.getByText(/save failed/i)).toBeInTheDocument();
  });
});
