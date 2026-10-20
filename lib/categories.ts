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
      { id: "fruit", label: "Fruit", terms: ["platano", "naranja", "manzana", "aguacate", "limon", "fresas", "uvas", "pera", "mandarina"] },
      { id: "veg", label: "Vegetables", terms: ["tomate", "cebolla", "pepino", "patata", "lechuga", "zanahoria", "pimiento rojo", "brocoli", "espinacas", "calabacin", "berenjena", "champiñon"] },
    ],
  },
  {
    id: "meat",
    label: "Meat",
    sections: [
      { id: "poultry", label: "Chicken & turkey", terms: ["pollo", "pavo", "contramuslos de pollo", "hamburguesa de pollo"] },
      { id: "pork-beef", label: "Pork & beef", terms: ["hamburguesa"] },
      { id: "cold-cuts", label: "Cold cuts & sausages", terms: ["jamon cocido", "salchichas de pollo", "bacon", "mortadela"] },
    ],
  },
  {
    id: "fish",
    label: "Fish",
    sections: [
      { id: "fresh-fish", label: "Fresh & frozen", terms: ["merluza", "salmon", "salmon ahumado", "gambas peladas", "langostinos cocidos", "calamares a la romana"] },
      { id: "canned-fish", label: "Canned", terms: ["atun", "sardinas", "atun en aceite", "caballa", "mejillones en escabeche", "anchoas"] },
    ],
  },
  {
    id: "dairy",
    label: "Dairy & eggs",
    sections: [
      { id: "milk", label: "Milk & drinks", terms: ["leche", "leche semidesnatada", "leche desnatada", "leche sin lactosa", "batido de chocolate"] },
      { id: "yogurt", label: "Yogurt", terms: ["yogur", "yogur griego", "yogur proteinas", "yogur fresa", "kefir"] },
      { id: "desserts", label: "Desserts", terms: ["flan"] },
      { id: "cream", label: "Butter & cream", terms: ["nata para montar", "mantequilla", "margarina"] },
      { id: "cheese", label: "Cheese", terms: ["queso fresco", "queso rallado", "queso mozzarella", "mozzarella rallada", "queso curado", "queso semicurado"] },
      { id: "eggs", label: "Eggs", terms: ["huevos", "claras de huevo"] },
    ],
  },
  {
    id: "bread",
    label: "Bread & biscuits",
    sections: [
      { id: "bread-loaves", label: "Bread", terms: ["pan", "pan de molde", "pan de molde integral", "tortillas de trigo"] },
      { id: "bakery", label: "Pastries", terms: ["croissants", "magdalenas"] },
      { id: "biscuits", label: "Biscuits", terms: ["galletas", "galletas digestive"] },
    ],
  },
  {
    id: "frozen",
    label: "Frozen & ready",
    sections: [
      { id: "frozen", label: "Frozen", terms: ["patatas prefritas", "pizza barbacoa", "pizza jamon y queso", "nuggets de pollo", "lasana bolonesa", "menestra de verduras"] },
      { id: "ready-meals", label: "Ready & fresh", terms: ["tortilla de patatas", "masa de pizza", "masa de hojaldre", "guacamole"] },
    ],
  },
  {
    id: "pantry",
    label: "Rice, pasta & tins",
    sections: [
      { id: "rice", label: "Rice & grains", terms: ["arroz", "arroz basmati", "arroz integral", "arroz vaporizado"] },
      { id: "pasta", label: "Pasta", terms: ["pasta", "espaguetis", "macarrones", "fideos", "pasta integral", "tortellini"] },
      { id: "beans", label: "Beans & sweetcorn", terms: ["garbanzos", "lentejas", "alubias", "maiz dulce"] },
      { id: "tins", label: "Tins, jars & soups", terms: ["tomate triturado", "tomate troceado", "aceitunas rellenas", "aceitunas negras", "aceitunas verdes", "pepinillos", "pimientos del piquillo", "caldo de pollo", "caldo de verduras", "gazpacho", "pure de patatas", "hummus"] },
    ],
  },
  {
    id: "oil",
    label: "Oil, salt & sauces",
    sections: [
      { id: "oil-types", label: "Oil", terms: ["aceite", "aceite de girasol", "aceite de oliva suave"] },
      { id: "sauces", label: "Sauces", terms: ["tomate frito", "mayonesa", "ketchup", "salsa barbacoa", "alioli", "salsa de soja"] },
      { id: "salt-vinegar", label: "Salt & vinegar", terms: ["sal", "vinagre", "vinagre balsamico"] },
    ],
  },
  {
    id: "sweet",
    label: "Breakfast & sweet",
    sections: [
      { id: "breakfast", label: "Cereal & oats", terms: ["copos de avena", "cereales"] },
      { id: "sugar-flour", label: "Sugar & flour", terms: ["azucar", "harina", "pan rallado", "azucar moreno", "leche condensada"] },
      { id: "spreads", label: "Honey, jam & chocolate", terms: ["mermelada", "cacao soluble", "miel", "crema de cacao", "chocolate negro"] },
      { id: "coffee", label: "Coffee", terms: ["cafe molido"] },
    ],
  },
  {
    id: "snacks",
    label: "Snacks & nuts",
    sections: [
      { id: "snacks", label: "Snacks & nuts", terms: ["almendras", "cacahuetes", "pistachos", "pasas", "nachos", "palomitas", "frutos secos variados"] },
    ],
  },
  {
    id: "drinks",
    label: "Drinks",
    sections: [
      { id: "water", label: "Water", terms: ["agua", "agua con gas"] },
      { id: "soft", label: "Soft drinks & juice", terms: ["coca cola", "zumo de naranja", "refresco de naranja", "refresco de limon", "zumo de pina", "zumo de manzana"] },
      { id: "beer", label: "Beer", terms: ["cerveza", "cerveza sin alcohol"] },
    ],
  },
];

/** Every term in the menu, in menu order. */
export function allMenuTerms(): string[] {
  return CATEGORIES.flatMap((c) => c.sections.flatMap((s) => s.terms));
}
