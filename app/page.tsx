import Link from "next/link";
import LandingBasketDemo from "@/components/LandingBasketDemo";

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
        Write your shopping list once. CestaPro prices it at the supermarkets
        you can walk to from campus, and shows you where to go.
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
          <p className="mt-1 font-semibold">See what it costs</p>
          <p className="mt-1 text-sm text-slate-600">
            The same basket, priced at each supermarket we cover.
          </p>
        </li>
        <li>
          <p className="text-sm font-semibold text-emerald-600">Step 3</p>
          <p className="mt-1 font-semibold">Walk to the right one</p>
          <p className="mt-1 text-sm text-slate-600">
            On the map, with the walk from IE Tower. Your list is saved for
            next week.
          </p>
        </li>
      </ol>

      <LandingBasketDemo />

      <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
        Prices come from each shop&apos;s own listings and are dated in the app,
        so you always know how fresh they are.
      </p>
    </main>
  );
}
