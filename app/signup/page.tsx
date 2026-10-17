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
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      {pendingProduct && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          We will start your basket with <strong>{pendingProduct}</strong>.
        </p>
      )}
      <p className="mt-2 text-sm text-slate-600">
        Email and password. No confirmation email, you are in straight away.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-slate-700"
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-slate-700"
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600"
          />
          <p className="mt-1 text-xs text-slate-500">At least 6 characters.</p>
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
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
      </p>
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
