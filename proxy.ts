import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // #region agent log
    fetch("http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "d60220",
      },
      body: JSON.stringify({
        sessionId: "d60220",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "proxy.ts:protect",
        message: "middleware protect branch",
        data: { pathname: req.nextUrl.pathname },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
