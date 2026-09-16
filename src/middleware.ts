import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
]);

export default clerkMiddleware(async (auth, req) => {
  const hostname = req.nextUrl.hostname;
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost") ||
    process.env.NODE_ENV === "development";

  // Production domain canonical redirect — ONLY runs in production when explicitly enabled
  if (!isLocalhost && process.env.NODE_ENV === "production" && process.env.ENFORCE_PRODUCTION_DOMAIN === "true") {
    const host = req.headers.get("host") || "";
    if (host === "neuraloop.app") {
      return NextResponse.redirect(`https://www.neuraloop.app${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
    }
  }

  // Route protection
  if (!isPublicRoute(req)) {
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const { userId } = await auth();
        if (!userId) {
          if (isLocalhost) {
            const signInUrl = new URL("/sign-in", req.url);
            return NextResponse.redirect(signInUrl);
          }
          await auth.protect();
        }
      } catch {
        if (isLocalhost) {
          const signInUrl = new URL("/sign-in", req.url);
          return NextResponse.redirect(signInUrl);
        }
        await auth.protect();
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|webmanifest|png|jpg|jpeg|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
