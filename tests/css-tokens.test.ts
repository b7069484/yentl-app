import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("globals.css ring token", () => {
  const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf-8");

  it("defines --ring token in :root", () => {
    expect(css).toMatch(/--ring:\s*oklch\([^)]+\)/);
  });

  it("--ring token has an accompanying contrast comment", () => {
    expect(css).toMatch(/contrast/i);
  });
});
