/** Debug-only: safe booleans/lengths only — no secrets. */
export function npDebug(
  hypothesisId: string,
  location: string,
  data: Record<string, unknown>
): void {
  const payload = {
    sessionId: "9b6afc",
    hypothesisId,
    location,
    message: "netpulse-runtime",
    data,
    timestamp: Date.now(),
  };
  // Vercel / local server logs (Runtime Logs)
  console.error("[NP_DEBUG]", JSON.stringify(payload));
  // Local debug ingest (Cursor session)
  if (typeof fetch !== "undefined") {
    fetch(
      "http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "9b6afc",
        },
        body: JSON.stringify(payload),
      }
    ).catch(() => {});
  }
}
