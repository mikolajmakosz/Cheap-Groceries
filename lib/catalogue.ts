import { CATALOGUE_DATA } from "./catalogue-data.ts";

/** What a product's label says per 100 g (or 100 ml). */
export type Per100 = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
  salt: number;
};

export type Offer = {
  /** The product's name as the shop lists it, pack size included. */
  name: string;
  /** What the pack costs. */
  price_eur: number;
  /** What one basis unit costs (per kg, per L, per dozen…), the same in every shop. */
  unit_price: number;
  image: string | null;
  url: string | null;
  checked_on: string;
  /** The label of this shop's own product, when one has been collected. */
  nutrition?: Per100;
};

export type CatalogueEntry = {
  /** Canonical key (the Spanish word). */
  term: string;
  /** English name shown in the app. */
  label: string;
  /** A typical purchase in the basis unit; a basket is priced in servings. */
  serving: number;
  /** What `unit_price` is a price per, so shops compare like with like. */
  basis: { amount: number; unit: "g" | "ml" | "ud"; label: string };
  aliases: string[];
  /** Store name -> that shop's reference product for this term. */
  offers: Record<string, Offer>;
};

export const CATALOGUE: CatalogueEntry[] = CATALOGUE_DATA;

export const CATALOGUE_STORES: string[] = [
  ...new Set(CATALOGUE.flatMap((entry) => Object.keys(entry.offers))),
].sort();

/** Lowercase, strip accents, collapse whitespace. "Leche Entera" -> "leche entera". */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
