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
  // #region agent log
  {
    const p = new URL(req.url).pathname;
    fetch("http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "5c64e3",
      },
      body: JSON.stringify({
        sessionId: "5c64e3",
        location: "proxy.ts:clerkMiddleware",
        message: "middleware enter",
        data: { pathname: p },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
  }
  // #endregion
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
