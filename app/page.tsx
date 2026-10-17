import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
        For international students in Madrid
      </p>

      <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Stop overpaying for your weekly shop
      </h1>

      <p className="mt-4 text-lg text-slate-600">
        Write your shopping list once. CestaPro shows you what it costs at
        Mercadona and Dia, and which one is cheaper this week.
      </p>

      <div className="mt-8">
        <Link
          href="/signup"
          className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
        >
          Sign up — it&apos;s free
        </Link>
        <p className="mt-3 text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        <li>
          <p className="text-sm font-semibold text-emerald-600">Step 1</p>
          <p className="mt-1 font-semibold">Type what you buy</p>
          <p className="mt-1 text-sm text-slate-600">
            &ldquo;pollo&rdquo;, &ldquo;leche entera&rdquo;, &ldquo;arroz&rdquo;
            — plain words, one per line.
          </p>
        </li>
        <li>
          <p className="text-sm font-semibold text-emerald-600">Step 2</p>
          <p className="mt-1 font-semibold">See both totals</p>
          <p className="mt-1 text-sm text-slate-600">
            The same basket, priced at each supermarket, side by side.
          </p>
        </li>
        <li>
          <p className="text-sm font-semibold text-emerald-600">Step 3</p>
          <p className="mt-1 font-semibold">Shop where it is cheaper</p>
          <p className="mt-1 text-sm text-slate-600">
            Your list is saved, so next week takes ten seconds.
          </p>
        </li>
      </ol>

      <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
        Prices are collected by hand and dated in the app, so you always know how
        fresh they are.
      </p>
    </main>
  );
}
