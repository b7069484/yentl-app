import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { AudioMeter, rmsFromTimeDomain } from "@/components/session/AudioMeter";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it("invokes onRmsSample with the latest rendered RMS value", () => {
    const samples: number[] = [];
    installAudioContextMock(192);

    render(createElement(AudioMeter, {
      stream: {} as MediaStream,
      onRmsSample: (rms: number) => samples.push(rms),
    }));

    expect(samples.length).toBeGreaterThan(0);
    expect(samples[0]).toBeGreaterThanOrEqual(0);
    expect(samples[0]).toBeLessThanOrEqual(1);
    expect(samples[0]).toBeGreaterThan(0.4);
    expect(samples[0]).toBeLessThan(0.6);
  });
});

function installAudioContextMock(sampleValue: number) {
  const analyser = {
    fftSize: 0,
    frequencyBinCount: 4,
    getByteTimeDomainData: vi.fn((buf: Uint8Array) => {
      buf.fill(sampleValue);
    }),
  };
  const source = { connect: vi.fn() };

  class MockAudioContext {
    createMediaStreamSource = vi.fn(() => source);
    createAnalyser = vi.fn(() => analyser);
    close = vi.fn();
  }

  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: MockAudioContext,
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}
