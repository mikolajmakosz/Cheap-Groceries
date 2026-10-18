/**
 * The menu on the left of the basket page, like a supermarket's own: a handful
 * of aisles, each listing the catalogue terms that live in it.
 */
export type Category = { id: string; label: string; terms: string[] };

export const CATEGORIES: Category[] = [
  { id: "meat", label: "Meat", terms: ["pollo", "cerdo", "carne picada", "jamon cocido"] },
  { id: "fish", label: "Fish", terms: ["atun", "merluza", "salmon"] },
  { id: "dairy", label: "Dairy & eggs", terms: ["leche", "huevos", "mantequilla", "queso", "queso fresco", "yogur"] },
  { id: "bread", label: "Bread & cereal", terms: ["pan", "pan de molde", "cereales"] },
  { id: "pantry", label: "Rice, pasta & beans", terms: ["arroz", "pasta", "garbanzos", "lentejas", "alubias"] },
  { id: "oil", label: "Oil & sauces", terms: ["aceite", "tomate frito"] },
  { id: "produce", label: "Fruit & veg", terms: ["tomate", "cebolla", "patata", "platano", "manzana", "lechuga"] },
  { id: "drinks", label: "Drinks", terms: ["agua"] },
];
