import { logoFor } from "@/lib/shops";

/**
 * A shop's logo, falling back to its name for chains we hold no logo for.
 * The name is always available to assistive technology.
 */
export default function ShopLogo({
  shop,
  height = 20,
}: {
  shop: string;
  height?: number;
}) {
  const logo = logoFor(shop);

  if (!logo) {
    return <span className="text-sm font-semibold">{shop}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt={shop}
      title={shop}
      style={{ height }}
      className="w-auto max-w-none"
    />
  );
}
