import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("app manifest", () => {
  it("registers Yentl as a mobile/web share target", () => {
    const data = manifest();

    expect(data.start_url).toBe("/session");
    expect(data.share_target).toMatchObject({
      action: "/session",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    });
  });
});
