import { describe, expect, it } from "vitest";
import { isPrivateIp, isHttpScheme } from "@/app/api/source-preview/ssrf-guard";

describe("isHttpScheme", () => {
  it("allows http and https", () => {
    expect(isHttpScheme("http://example.com")).toBe(true);
    expect(isHttpScheme("https://example.com")).toBe(true);
  });

  it("blocks file/data/ftp/ws/etc", () => {
    expect(isHttpScheme("file:///etc/passwd")).toBe(false);
    expect(isHttpScheme("data:text/html,x")).toBe(false);
    expect(isHttpScheme("ftp://example.com")).toBe(false);
    expect(isHttpScheme("ws://example.com")).toBe(false);
    expect(isHttpScheme("not a url")).toBe(false);
  });
});

describe("isPrivateIp", () => {
  it("flags IPv4 loopback", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.255.255.255")).toBe(true);
  });

  it("flags IPv4 RFC 1918 ranges", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
  });

  it("flags AWS/cloud link-local metadata", () => {
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("169.254.0.1")).toBe(true);
  });

  it("flags IPv6 loopback and link-local", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("172.15.255.255")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
    expect(isPrivateIp("169.253.255.255")).toBe(false);
  });

  it("allows public IPv6 addresses", () => {
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
  });

  it("treats malformed input as private (fail-closed)", () => {
    expect(isPrivateIp("not an ip")).toBe(true);
    expect(isPrivateIp("")).toBe(true);
  });
});
