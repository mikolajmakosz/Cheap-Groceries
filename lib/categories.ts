/**
 * The menu on the left of the basket page, laid out like Mercadona's own: an
 * aisle opens into sections, each listing the catalogue terms that live there.
 */
export type Section = { id: string; label: string; terms: string[] };
export type Category = { id: string; label: string; sections: Section[] };

export const CATEGORIES: Category[] = [
  {
    id: "produce",
    label: "Fruit & veg",
    sections: [
      { id: "fruit", label: "Fruit", terms: ["platano", "manzana", "naranja", "limon"] },
      { id: "veg", label: "Vegetables", terms: ["tomate", "cebolla", "patata", "lechuga", "pepino", "champiñon", "calabacin"] },
    ],
  },
  {
    id: "meat",
    label: "Meat",
    sections: [
      { id: "poultry", label: "Chicken & turkey", terms: ["pollo", "pavo"] },
      { id: "pork-beef", label: "Pork & beef", terms: ["cerdo", "carne picada", "hamburguesa"] },
      { id: "cold-cuts", label: "Cold cuts", terms: ["jamon cocido"] },
    ],
  },
  {
    id: "fish",
    label: "Fish",
    sections: [
      { id: "fresh-fish", label: "Fresh & frozen", terms: ["merluza", "salmon"] },
      { id: "canned-fish", label: "Canned", terms: ["atun", "sardinas", "calvo"] },
    ],
  },
  {
    id: "dairy",
    label: "Dairy & eggs",
    sections: [
      { id: "milk", label: "Milk", terms: ["leche", "leche semidesnatada", "pascual"] },
      { id: "yogurt", label: "Yogurt", terms: ["yogur", "yogur griego", "danone"] },
      { id: "cheese", label: "Cheese", terms: ["queso", "queso fresco", "queso rallado"] },
      { id: "eggs-butter", label: "Eggs & butter", terms: ["huevos", "mantequilla"] },
    ],
  },
  {
    id: "bread",
    label: "Bread & biscuits",
    sections: [
      { id: "bread-loaves", label: "Bread", terms: ["pan", "pan de molde"] },
      { id: "cereal", label: "Cereal & biscuits", terms: ["cereales", "galletas"] },
    ],
  },
  {
    id: "pantry",
    label: "Rice, pasta & beans",
    sections: [
      { id: "rice", label: "Rice", terms: ["arroz", "brillante"] },
      { id: "pasta", label: "Pasta", terms: ["pasta", "espaguetis", "gallo"] },
      { id: "beans", label: "Beans & sweetcorn", terms: ["garbanzos", "lentejas", "alubias", "maiz dulce"] },
    ],
  },
  {
    id: "oil",
    label: "Oil, salt & sauces",
    sections: [
      { id: "oil-types", label: "Olive oil", terms: ["aceite", "ybarra", "carbonell"] },
      { id: "sauces", label: "Sauces", terms: ["tomate frito", "orlando", "mayonesa", "ketchup"] },
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
      { id: "water", label: "Water", terms: ["agua", "font vella"] },
      { id: "soft", label: "Soft drinks & juice", terms: ["refresco cola", "coca cola", "zumo de naranja"] },
      { id: "alcohol", label: "Beer", terms: ["cerveza"] },
    ],
  },
];

/** Every term in the menu, in menu order. */
export function allMenuTerms(): string[] {
  return CATEGORIES.flatMap((c) => c.sections.flatMap((s) => s.terms));
}
