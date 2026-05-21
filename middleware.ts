import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/session(.*)",
  "/account(.*)",
]);

const isKeylessLocalDev =
  process.env.NODE_ENV !== "production" &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const middleware = isKeylessLocalDev
  ? function keylessLocalDevMiddleware() {
      return NextResponse.next();
    }
  : clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    });

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
