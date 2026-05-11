import { describe, it, expect } from "vitest";
import { toJSON } from "@/lib/export/json";
import type { Session } from "@/lib/types";

describe("toJSON", () => {
  it("serializes a session faithfully and adds duration", () => {
    const session: Session = {
      title: "Test",
      started_at: "2026-05-11T10:00:00.000Z",
      ended_at: "2026-05-11T10:05:00.000Z",
      transcript: [{ text: "hi", start: 0, end: 1, is_final: true }],
      claims: [],
      markers: [],
    };
    const json = toJSON(session);
    const parsed = JSON.parse(json);
    expect(parsed.title).toBe("Test");
    expect(parsed.duration_seconds).toBe(300);
    expect(parsed.transcript[0].text).toBe("hi");
  });

  it("omits ended_at + duration if missing", () => {
    const session: Session = {
      title: "Open",
      started_at: "2026-05-11T10:00:00.000Z",
      transcript: [],
      claims: [],
      markers: [],
    };
    const parsed = JSON.parse(toJSON(session));
    expect(parsed.duration_seconds).toBeUndefined();
    expect(parsed.ended_at).toBeUndefined();
  });
});
