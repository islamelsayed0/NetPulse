import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { npDebug } from "@/lib/netpulse-runtime-debug";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  } catch (e) {
    // #region agent log
    npDebug("H3", "proxy.ts:auth.protect", {
      pathname: req.nextUrl.pathname,
      errName: e instanceof Error ? e.name : "unknown",
      hasClerkPk: Boolean(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
      ),
      hasClerkSecret: Boolean(process.env.CLERK_SECRET_KEY?.trim()),
    });
    // #endregion
    throw e;
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
