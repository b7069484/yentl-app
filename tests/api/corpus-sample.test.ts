import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/corpus-sample/route";

function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/corpus-sample?id=${id}`);
}

describe("GET /api/corpus-sample", () => {
  it("returns a functional Watch sample with transcript, claims, and markers", async () => {
    const res = await GET(makeRequest("cable_008") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("cable_008");
    expect(json.source.kind).toBe("youtube");
    expect(json.source.video_id).toBe("0UYx55YNRv0");
    expect(json.segments.length).toBeGreaterThan(0);
    expect(json.claims).toHaveLength(1);
    expect(json.markers).toHaveLength(6);
    expect(json.replay.errors).toEqual([]);
  });

  it("returns the provisional verification sample with mapped labels", async () => {
    const res = await GET(makeRequest("israel_010") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claims.length).toBe(14);
    expect(json.claims[0].status).toBe("provisional");
    expect(json.claims[0].primary_label).toBe("UNVERIFIABLE");
    expect(json.markers.length).toBe(4);
  });

  it("rejects unknown sample ids", async () => {
    const res = await GET(makeRequest("unknown") as never);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("UNKNOWN_SAMPLE");
  });
});
