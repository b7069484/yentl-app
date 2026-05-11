import { describe, it, expect } from "vitest";
import { hashClaim, RecentSet } from "@/lib/dedup";

describe("hashClaim", () => {
  it("normalizes whitespace and case", () => {
    expect(hashClaim("Hello world.")).toBe(hashClaim("  HELLO   WORLD  "));
  });
  it("ignores trailing punctuation", () => {
    expect(hashClaim("foo")).toBe(hashClaim("foo."));
    expect(hashClaim("foo")).toBe(hashClaim("foo!?"));
  });
  it("distinguishes different content", () => {
    expect(hashClaim("foo")).not.toBe(hashClaim("bar"));
  });
});

describe("RecentSet", () => {
  it("caps size and evicts oldest", () => {
    const r = new RecentSet(3);
    r.add("a"); r.add("b"); r.add("c"); r.add("d");
    expect(r.has("a")).toBe(false);
    expect(r.has("d")).toBe(true);
    expect(r.size()).toBe(3);
  });
  it("re-adding existing key moves to end", () => {
    const r = new RecentSet(3);
    r.add("a"); r.add("b"); r.add("a"); r.add("c"); r.add("d");
    // Order after re-add: b, a, c, d → evict b → a, c, d
    expect(r.has("a")).toBe(true);
    expect(r.has("b")).toBe(false);
  });
});
