import { CATALOGUE_DATA } from "./catalogue-data.ts";

export type Offer = {
  /** The product's name as the shop lists it. */
  name: string;
  price_eur: number;
  /** Pack size in grams or millilitres, when the shop states one. */
  size_g: number | null;
  image: string | null;
  url: string | null;
  checked_on: string;
};

export type CatalogueEntry = {
  /** Canonical key (the Spanish word). */
  term: string;
  /** English name shown in the app. */
  label: string;
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
