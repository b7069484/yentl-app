import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isAlwaysProtectedRoute = createRouteMatcher([
  "/project(.*)",
  "/account(.*)",
]);

const isSessionRoute = createRouteMatcher([
  "/session(.*)",
]);

const isInternalApiRoute = createRouteMatcher([
  "/api/corpus-sample",
  "/api/project-flow-comments",
]);

const isCostBearingApiRoute = createRouteMatcher([
  "/api/analyze-rhetoric",
  "/api/deepgram/token",
  "/api/devil-advocate",
  "/api/extract-claims",
  "/api/media-ingest",
  "/api/source-preview",
  "/api/synthesize",
  "/api/transcribe-batch",
  "/api/upload-audio",
  "/api/verify-confirmed",
  "/api/verify-provisional",
  "/api/youtube-ingest",
]);

const isProduction = process.env.NODE_ENV === "production";
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const productAuthRequired = process.env.YENTL_REQUIRE_AUTH === "1";

function notFound(req: NextRequest): NextResponse {
  if (new URL(req.url).pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 404 });
}

const proxy = !clerkConfigured
  ? function keylessProxy(req: NextRequest) {
      const protectedWithoutClerk =
        isProduction &&
        (
          isAlwaysProtectedRoute(req) ||
          isInternalApiRoute(req) ||
          (productAuthRequired && (isSessionRoute(req) || isCostBearingApiRoute(req)))
        );

      if (protectedWithoutClerk) return notFound(req);
      return NextResponse.next();
    }
  : clerkMiddleware(async (auth, req) => {
      const isProtectedCostBearingApi = productAuthRequired && isProduction && isCostBearingApiRoute(req);

      const isProtectedInternalApi = isProduction && isInternalApiRoute(req);

      if (
        isAlwaysProtectedRoute(req) ||
        (productAuthRequired && isSessionRoute(req)) ||
        isProtectedCostBearingApi ||
        isProtectedInternalApi
      ) {
        await auth.protect();
      }
    });

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
