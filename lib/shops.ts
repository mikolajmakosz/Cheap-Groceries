/** Logos the shops publish on their own sites, used only to tell them apart. */
export const SHOP_LOGOS: Record<string, string> = {
  Dia: "/logos/dia.svg",
  Mercadona: "/logos/mercadona.svg",
};

export function logoFor(chain: string): string | null {
  return SHOP_LOGOS[chain] ?? null;
}
