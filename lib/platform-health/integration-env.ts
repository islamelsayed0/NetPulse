/** Public integration env vars checked without external HTTP calls. */
export function missingIntegrationEnvVars(): string[] {
  const m: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) m.push("RESEND_API_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    m.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    m.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }
  return m;
}

export function integrationEnvDetail(missing: string[]): string {
  return `Missing: ${missing.join(", ")}`;
}
