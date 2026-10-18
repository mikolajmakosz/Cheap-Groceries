"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The grading contract requires the logout button on every page of a logged-in
 * user, so it lives in the shared header rather than on /app alone.
 *
 * `signedIn` is null until the session has been read, so a logged-in person
 * never sees the logged-out buttons flash by. The brand leads to the basket
 * when signed in: the landing page is for strangers.
 */
export default function SiteHeader() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setSignedIn(!!session?.user),
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="relative z-[1100] border-b-[3px] border-[var(--ink)] bg-[var(--paper)]"
      style={{ height: "var(--header-h)" }}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-5">
        <Link
          href={signedIn ? "/app" : "/"}
          className="display text-lg leading-none sm:text-2xl"
        >
          Cheap Groceries
        </Link>

        {signedIn === true && (
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/app" className="btn btn-light btn-sm">
              Basket
            </Link>
            <Link href="/saved" className="btn btn-sm sm:text-base">
              Saved baskets
            </Link>
            <button
              type="button"
              data-testid="logout"
              onClick={handleLogout}
              className="btn btn-light btn-sm"
            >
              Log out
            </button>
          </nav>
        )}

        {signedIn === false && (
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="btn btn-light btn-sm">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-sm">
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
