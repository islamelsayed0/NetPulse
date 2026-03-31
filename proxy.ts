import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

/**
 * Clerk dev instances require a "dev browser" handshake. Requests without
 * Sec-Fetch-Dest: document (uptime probes, curl, some monitors) are not
 * handshake-eligible and `auth.protect()` would otherwise emit Next's internal
 * 404 rewrite. Skip Clerk entirely on public operational routes so health and
 * cron always return real responses.
 */
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const signIn = new URL("/sign-in", req.url).toString();
    await auth.protect({ unauthenticatedUrl: signIn });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/((?!health/|cron/|check-monitors).*)",
    "/(trpc)(.*)",
  ],
};
