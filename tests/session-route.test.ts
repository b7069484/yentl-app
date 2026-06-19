import { describe, expect, it } from "vitest";
import { sessionHrefForTvContext, tvHrefForSessionContext } from "@/lib/client/session-route";

describe("session route helpers", () => {
  it("carries validation context into and out of TV room mode", () => {
    const sessionSearch = "demo=validation&sample=extension_snapshot&view=claims";

    expect(tvHrefForSessionContext(sessionSearch)).toBe(
      "/tv?demo=validation&sample=extension_snapshot",
    );
    expect(sessionHrefForTvContext("demo=validation&sample=extension_snapshot")).toBe(
      "/session?demo=validation&sample=extension_snapshot&view=overview",
    );
  });

  it("carries saved-session restore context back to the workspace", () => {
    expect(tvHrefForSessionContext("restore=sess-123&view=overview")).toBe(
      "/tv?restore=sess-123",
    );
    expect(sessionHrefForTvContext("restore=sess-123")).toBe(
      "/session?restore=sess-123&view=overview",
    );
  });

  it("falls back to plain routes when there is no restorable context", () => {
    expect(tvHrefForSessionContext("source=audio-file")).toBe("/tv");
    expect(sessionHrefForTvContext("source=audio-file")).toBe("/session");
  });
});
