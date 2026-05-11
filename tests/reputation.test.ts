import { describe, it, expect } from "vitest";
import { classifyDomain, extractDomain } from "@/lib/reputation";

describe("extractDomain", () => {
  it("strips protocol, path, subdomain", () => {
    expect(extractDomain("https://www.reuters.com/world/123")).toBe("reuters.com");
    expect(extractDomain("http://www.bbc.co.uk/news")).toBe("bbc.co.uk");
    expect(extractDomain("https://nature.com")).toBe("nature.com");
  });
});

describe("classifyDomain", () => {
  it("returns high for known top-tier", () => {
    expect(classifyDomain("reuters.com")).toBe("high");
    expect(classifyDomain("apnews.com")).toBe("high");
    expect(classifyDomain("nature.com")).toBe("high");
  });
  it("returns high for .gov and .edu", () => {
    expect(classifyDomain("cdc.gov")).toBe("high");
    expect(classifyDomain("mit.edu")).toBe("high");
  });
  it("returns mid for unknown domain", () => {
    expect(classifyDomain("some-random-blog.com")).toBe("mid");
  });
  it("returns low for known low-tier", () => {
    expect(classifyDomain("infowars.com")).toBe("low");
  });
});
