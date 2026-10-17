/**
 * Says whether this build actually received its Supabase configuration.
 * It reports presence, never the values — the project ref is public anyway,
 * and the key is deliberately left out.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null;

  return Response.json({
    supabaseUrlPresent: Boolean(url),
    publishableKeyPresent: Boolean(key),
    supabaseHost: url ? new URL(url).host : null,
    keyPrefix: key ? key.slice(0, 15) : null,
  });
}
