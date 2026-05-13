import { describe, expect, it } from "vitest";
import { rmsFromTimeDomain } from "@/components/session/AudioMeter";

describe("rmsFromTimeDomain", () => {
  it("returns 0 for total silence (all samples == 128)", () => {
    const buf = new Uint8Array(512).fill(128);
    expect(rmsFromTimeDomain(buf)).toBe(0);
  });

  it("returns ~1.0 for max-amplitude square wave", () => {
    const buf = new Uint8Array(512);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 0 : 255;
    const rms = rmsFromTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.9);
    expect(rms).toBeLessThanOrEqual(1.0);
  });

  it("returns ~0.5 for a half-amplitude square wave", () => {
    const buf = new Uint8Array(512);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 64 : 192;   // ±64 around 128
    const rms = rmsFromTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.4);
    expect(rms).toBeLessThan(0.6);
  });

  it("returns ~0.707 for a full-scale sine wave", () => {
    const buf = new Uint8Array(512);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.round(128 + 127 * Math.sin((i / buf.length) * 2 * Math.PI * 8));
    }
    const rms = rmsFromTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.65);
    expect(rms).toBeLessThan(0.75);
  });
});
