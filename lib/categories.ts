/**
 * The menu on the left of the basket page, laid out like Mercadona's own: an
 * aisle opens into sections, each listing the catalogue terms that live there.
 * Only products priced at all four supermarkets are in the catalogue, so only
 * those are here.
 */
export type Section = { id: string; label: string; terms: string[] };
export type Category = { id: string; label: string; sections: Section[] };

export const CATEGORIES: Category[] = [
  {
    id: "produce",
    label: "Fruit & veg",
    sections: [
      { id: "fruit", label: "Fruit", terms: ["platano", "naranja"] },
      { id: "veg", label: "Vegetables", terms: ["tomate", "cebolla", "pepino"] },
    ],
  },
  {
    id: "meat",
    label: "Meat",
    sections: [
      { id: "poultry", label: "Chicken & turkey", terms: ["pollo", "pavo"] },
      { id: "cold-cuts", label: "Cold cuts", terms: ["jamon cocido"] },
    ],
  },
  {
    id: "fish",
    label: "Fish",
    sections: [
      { id: "fresh-fish", label: "Fresh & frozen", terms: ["merluza"] },
      { id: "canned-fish", label: "Canned", terms: ["atun", "sardinas"] },
    ],
  },
  {
    id: "dairy",
    label: "Dairy",
    sections: [
      { id: "milk", label: "Milk", terms: ["leche", "leche semidesnatada"] },
      { id: "yogurt", label: "Yogurt", terms: ["yogur", "yogur griego"] },
      { id: "cheese", label: "Cheese", terms: ["queso fresco", "queso rallado"] },
      { id: "eggs", label: "Eggs", terms: ["huevos"] },
    ],
  },
  {
    id: "bread",
    label: "Bread & biscuits",
    sections: [
      { id: "bread-loaves", label: "Bread", terms: ["pan", "pan de molde"] },
      { id: "biscuits", label: "Biscuits", terms: ["galletas"] },
    ],
  },
  {
    id: "pantry",
    label: "Pasta & beans",
    sections: [
      { id: "rice", label: "Rice", terms: ["arroz"] },
      { id: "pasta", label: "Pasta", terms: ["pasta", "espaguetis"] },
      { id: "beans", label: "Beans & sweetcorn", terms: ["garbanzos", "lentejas", "alubias", "maiz dulce"] },
    ],
  },
  {
    id: "oil",
    label: "Oil, salt & sauces",
    sections: [
      { id: "oil-types", label: "Olive oil", terms: ["aceite"] },
      { id: "sauces", label: "Sauces", terms: ["tomate frito", "mayonesa", "ketchup"] },
      { id: "salt-vinegar", label: "Salt & vinegar", terms: ["sal", "vinagre"] },
    ],
  },
  {
    id: "sweet",
    label: "Breakfast & sweet",
    sections: [
      { id: "sugar-flour", label: "Sugar & flour", terms: ["azucar", "harina"] },
      { id: "spreads", label: "Jam & cocoa", terms: ["mermelada", "cacao soluble"] },
      { id: "coffee", label: "Coffee", terms: ["cafe molido"] },
    ],
  },
  {
    id: "drinks",
    label: "Drinks",
    sections: [
      { id: "water", label: "Water", terms: ["agua"] },
      { id: "soft", label: "Soft drinks & juice", terms: ["coca cola", "zumo de naranja"] },
    ],
  },
];

/** Every term in the menu, in menu order. */
export function allMenuTerms(): string[] {
  return CATEGORIES.flatMap((c) => c.sections.flatMap((s) => s.terms));
}
