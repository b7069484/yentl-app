import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { ReportFlow } from "@/components/verdict/ReportFlow";

const STORAGE_KEY = "yentl.reports";

describe("ReportFlow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens when open=true", () => {
    render(<ReportFlow open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render dialog when open=false", () => {
    render(<ReportFlow open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows error when submitting without selecting a category", () => {
    render(<ReportFlow open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Submit report/i }));
    expect(screen.getByText("Please select a category.")).toBeInTheDocument();
  });

  it("persists report to localStorage after submit", async () => {
    const onClose = vi.fn();
    render(<ReportFlow open={true} onClose={onClose} verdictRef="verdict-123" />);

    fireEvent.click(screen.getByLabelText("Wrong verdict"));
    fireEvent.click(screen.getByRole("button", { name: /Submit report/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].category).toBe("Wrong verdict");
    expect(stored[0].verdict_ref).toBe("verdict-123");
    expect(stored[0].report_id).toBeTruthy();
    expect(stored[0].timestamp_iso).toBeTruthy();
  });

  it("closes after successful submit", async () => {
    const onClose = vi.fn();
    render(<ReportFlow open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Bad sources"));
    fireEvent.click(screen.getByRole("button", { name: /Submit report/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
