import { connection } from "next/server";

/**
 * Says whether this build actually received its Supabase configuration.
 * It reports presence, never the values — the project ref is public anyway,
 * and the key is deliberately left out.
 */
export async function GET() {
  // Opts out of prerendering, so the answer reflects this deployment's
  // runtime environment rather than whatever was set at build time.
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null;

  return Response.json({
    supabaseUrlPresent: Boolean(url),
    publishableKeyPresent: Boolean(key),
    supabaseHost: url ? new URL(url).host : null,
    keyPrefix: key ? key.slice(0, 15) : null,
  });
}
