import { describe, expect, it } from "vitest";
import { friendlyApiErrorMessage } from "@/lib/client/api-errors";

describe("friendlyApiErrorMessage", () => {
  it("turns rate limits into retry copy with Retry-After", () => {
    expect(friendlyApiErrorMessage({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests",
      retryAfterSec: "12",
    })).toBe("Yentl is receiving too many requests right now. Wait about 12 seconds and try again.");
  });

  it("turns missing source consent into a recoverable instruction", () => {
    expect(friendlyApiErrorMessage({
      status: 428,
      code: "SOURCE_CONSENT_REQUIRED",
    })).toMatch(/Confirm you have permission/i);
  });

  it("keeps ordinary server messages when there is no known code", () => {
    expect(friendlyApiErrorMessage({
      status: 400,
      message: "audio exceeds 4-hour cap",
      fallback: "fallback",
    })).toBe("audio exceeds 4-hour cap");
  });
});
