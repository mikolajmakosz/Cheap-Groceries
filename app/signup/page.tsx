"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  // Set when someone typed a product on the landing page before signing up.
  const pendingProduct = useSearchParams().get("add")?.trim() ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    // Email confirmation is off, so sign-up normally returns a session straight
    // away. If it does not, the address already exists: try logging in instead.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(
          "That email is already registered. Try logging in instead, or use a different address.",
        );
        setBusy(false);
        return;
      }
    }

    // Carry over what they typed on the landing page, so the basket is not
    // empty the moment they arrive. A failure here must not block sign-up.
    if (pendingProduct) {
      const { error: addError } = await supabase
        .from("basket_items")
        .insert({ name: pendingProduct });
      if (addError) console.warn("could not add the pending product", addError);
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <div className="card p-6">
      <h1 className="display text-4xl">Sign up</h1>
      {pendingProduct && (
        <p className="mt-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--y1)] px-3 py-2 text-sm">
          First in your basket: <strong>{pendingProduct}</strong>
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-bold"
          >
            Email
          </label>
          <input
            id="signup-email"
            data-testid="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 field"
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-bold"
          >
            Password
          </label>
          <input
            id="signup-password"
            data-testid="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 field"
          />
          <p className="mt-1 text-xs text-slate-500">6+ characters</p>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="signup-submit"
          disabled={busy}
          className="btn w-full py-3 text-lg"
        >
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-bold underline">
          Log in
        </Link>
      </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  // useSearchParams needs a Suspense boundary for the page to stay static.
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
