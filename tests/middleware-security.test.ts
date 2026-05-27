import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  protect: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  createRouteMatcher: (patterns: string[]) => {
    return (req: Request) => {
      const pathname = new URL(req.url).pathname;
      return patterns.some((pattern) => {
        if (pattern.endsWith("(.*)")) {
          return pathname.startsWith(pattern.slice(0, -4));
        }
        return pathname === pattern;
      });
    };
  },
  clerkMiddleware: (
    handler: (auth: { protect: () => Promise<void> }, req: Request) => Promise<void>,
  ) => {
    return async (req: Request) => {
      await handler({ protect: clerkMocks.protect }, req);
      return new Response(null, { status: 204 });
    };
  },
}));

describe("middleware security launch gates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps production session entry guest-first by default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/session"), {} as never);

    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });

  it("keeps production cost-bearing API routes guest-first unless product auth is required", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/api/deepgram/token"), {} as never);

    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });

  it("protects production session entry when product auth is required", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("YENTL_REQUIRE_AUTH", "1");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/session"), {} as never);

    expect(clerkMocks.protect).toHaveBeenCalledTimes(1);
  });

  it("protects production cost-bearing API routes when product auth is required", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("YENTL_REQUIRE_AUTH", "1");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/api/deepgram/token"), {} as never);

    expect(clerkMocks.protect).toHaveBeenCalledTimes(1);
  });

  it("protects production internal project APIs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/api/corpus-sample"), {} as never);

    expect(clerkMocks.protect).toHaveBeenCalledTimes(1);
  });

  it("protects production project flow comment writes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/api/project-flow-comments"), {} as never);

    expect(clerkMocks.protect).toHaveBeenCalledTimes(1);
  });

  it("protects production project dashboards", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    const { default: middleware } = await import("@/proxy");

    await middleware(new NextRequest("http://localhost/project/validation"), {} as never);

    expect(clerkMocks.protect).toHaveBeenCalledTimes(1);
  });

  it("blocks production project dashboards when Clerk is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const { default: middleware } = await import("@/proxy");

    const res = await middleware(new NextRequest("http://localhost/project/validation"), {} as never);

    expect(res?.status).toBe(404);
    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });

  it("blocks production internal APIs when Clerk is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const { default: middleware } = await import("@/proxy");

    const res = await middleware(new NextRequest("http://localhost/api/project-flow-comments"), {} as never);

    expect(res?.status).toBe(404);
    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });
});
