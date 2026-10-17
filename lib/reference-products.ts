/**
 * The everyday thing a shopper means when they type a word.
 *
 * One reference product per term per store, chosen by hand: the ordinary
 * own-brand option in a sensible pack, not the cheapest row in the category.
 * Without this, "pollo" matches chicken carcasses at 1.07 and "leche" matches an
 * oat drink. Aliases are Spanish and English because the users are
 * international students; `label` is the English name shown in the app.
 */

export type ReferenceTerm = {
  /** Canonical key, also the Spanish word. */
  term: string;
  /**
   * A typical purchase, in the basis unit (grams, millilitres or pieces). A
   * basket is priced in servings, so it describes what a student really buys
   * rather than a kilo of sliced cheese.
   */
  serving: number;
  /**
   * What one "unit" of this product means, so shops can be compared fairly.
   * Packs differ between shops, so every price is converted to this basis.
   */
  basis: { amount: number; unit: "g" | "ml" | "ud"; label: string };
  /** English name shown to the user. */
  label: string;
  /** Everyday words, Spanish and English, that mean this term. */
  aliases: string[];
  /** Store name -> the exact product name chosen as the reference there. */
  stores: Record<string, string>;
};

export const REFERENCE_TERMS: ReferenceTerm[] = [
  { term: "pollo", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Chicken breast", aliases: ["pollo", "pechuga", "chicken", "chicken breast"], stores: { "Mercadona": "Filetes pechuga de pollo", "Dia": "Pechuga de pollo corte fino Selección de Dia 600 g aprox." } },
  { term: "cerdo", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Pork loin", aliases: ["cerdo", "lomo", "pork"], stores: { "Mercadona": "Filetes lomo de cerdo corte fino", "Dia": "Lomo de cerdo adobado Selección de Dia 300 g" } },
  { term: "carne picada", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Minced meat", aliases: ["carne picada", "picada", "mince", "minced meat", "ground beef"], stores: { "Mercadona": "Preparado de carne picada vacuno y cerdo", "Dia": "Carne picada de vacuno y cerdo Selección de Dia 500 g" } },
  { term: "jamon cocido", serving: 150, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Cooked ham", aliases: ["jamon cocido", "jamon", "ham"], stores: { "Mercadona": "Jamón cocido Hacendado lonchas", "Dia": "Jamón cocido extra 97% Dia Nuestra Alacena 150 g" } },
  { term: "leche", serving: 1000, basis: { amount: 1000, unit: "ml", label: "L" }, label: "Whole milk", aliases: ["leche", "leche entera", "milk"], stores: { "Mercadona": "Leche entera Hacendado", "Dia": "Leche entera Dia Láctea pack 6 x 1 L" } },
  { term: "huevos", serving: 12, basis: { amount: 12, unit: "ud", label: "dozen" }, label: "Eggs", aliases: ["huevos", "huevo", "eggs", "egg"], stores: { "Mercadona": "Huevos medianos M", "Dia": "Huevos medianos M de gallinas criadas en suelo Dia 12 unidades" } },
  { term: "mantequilla", serving: 250, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Butter", aliases: ["mantequilla", "butter"], stores: { "Mercadona": "Mantequilla con sal Hacendado", "Dia": "Mantequilla con sal Dia Láctea 250 g" } },
  { term: "queso", serving: 200, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Sliced cheese", aliases: ["queso", "cheese", "queso lonchas"], stores: { "Mercadona": "Queso lonchas fundido sándwich mezcla Hacendado", "Dia": "Queso fundido sándwich Dia Láctea 300 g" } },
  { term: "queso fresco", serving: 250, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Fresh cheese", aliases: ["queso fresco", "quark", "cottage"], stores: { "Mercadona": "Queso fresco Burgos desnatado 0% MG Hacendado", "Dia": "Queso fresco de Burgos 0% M.G. Dia Láctea 4 x 62.5 g" } },
  { term: "yogur", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Natural yogurt", aliases: ["yogur", "yogurt", "yoghurt"], stores: { "Mercadona": "Yogur natural Hacendado", "Dia": "Yogur natural desnatado Dia Láctea 6 x 125 g" } },
  { term: "pan", serving: 250, basis: { amount: 250, unit: "g", label: "loaf" }, label: "Bread", aliases: ["pan", "bread", "barra"], stores: { "Mercadona": "Barra de pan", "Dia": "Barra de pan Diana El Molino de Dia 250 g" } },
  { term: "pan de molde", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Sliced bread", aliases: ["pan de molde", "sliced bread", "toast"], stores: { "Mercadona": "Pan de molde blanco Hacendado", "Dia": "Pan de molde blanco El Molino de Dia 820 g" } },
  { term: "arroz", serving: 1000, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Rice", aliases: ["arroz", "rice"], stores: { "Mercadona": "Arroz redondo Hacendado", "Dia": "Arroz extra Dia Arrozona 1 Kg" } },
  { term: "pasta", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Pasta", aliases: ["pasta", "macarrones", "spaghetti", "penne", "noodles"], stores: { "Mercadona": "Pasta penne rigate Hacendado", "Dia": "Macarrones Dia Al Diante 500 g" } },
  { term: "cereales", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Corn flakes", aliases: ["cereales", "cereal", "corn flakes", "cornflakes"], stores: { "Mercadona": "Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos", "Dia": "Cereales copos de maíz corn flakes Gran Dia 500 g" } },
  { term: "garbanzos", serving: 400, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Chickpeas", aliases: ["garbanzos", "garbanzo", "chickpeas"], stores: { "Mercadona": "Garbanzo cocido Hacendado", "Dia": "Garbanzos cocidos Dia Vegecampo 400 g" } },
  { term: "lentejas", serving: 400, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Lentils", aliases: ["lentejas", "lenteja", "lentils"], stores: { "Mercadona": "Lenteja cocida Hacendado", "Dia": "Lentejas cocidas Dia Vegecampo 400 g" } },
  { term: "alubias", serving: 400, basis: { amount: 1000, unit: "g", label: "kg" }, label: "White beans", aliases: ["alubias", "judias", "beans", "white beans"], stores: { "Mercadona": "Alubia cocida blanca Hacendado", "Dia": "Alubias blancas cocidas Dia Vegecampo 400 g" } },
  { term: "atun", serving: 160, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Tuna", aliases: ["atun", "tuna"], stores: { "Mercadona": "Atún claro al natural Hacendado", "Dia": "Atún claro en aceite de oliva Dia Mari Marinera 3 x 60 g" } },
  { term: "merluza", serving: 400, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Hake", aliases: ["merluza", "hake", "white fish"], stores: { "Mercadona": "Rodajas de merluza del Cabo Hacendado ultracongeladas", "Dia": "Rodajas de merluza argentina Dia Mari Marinera 550 g" } },
  { term: "salmon", serving: 250, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Salmon", aliases: ["salmon", "salmón"], stores: { "Mercadona": "Rodaja de salmón", "Dia": "Lomos de salmón Dia Selección Mundial 250 g" } },
  { term: "aceite", serving: 1000, basis: { amount: 1000, unit: "ml", label: "L" }, label: "Olive oil", aliases: ["aceite", "aceite de oliva", "olive oil", "oil"], stores: { "Mercadona": "Aceite de oliva virgen extra Hacendado", "Dia": "Aceite de oliva virgen extra Dia La Almazara del Olivar 1 L" } },
  { term: "tomate frito", serving: 400, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Tomato sauce", aliases: ["tomate frito", "tomato sauce", "passata"], stores: { "Mercadona": "Tomate frito Hacendado", "Dia": "Tomate frito Dia Vegecampo 550 g" } },
  { term: "tomate", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Tomatoes", aliases: ["tomate", "tomates", "tomato", "tomatoes"], stores: { "Mercadona": "Tomate pera", "Dia": "Tomate pera bandeja 500 g" } },
  { term: "cebolla", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Onions", aliases: ["cebolla", "cebollas", "onion", "onions"], stores: { "Mercadona": "Cebollas rojas", "Dia": "Cebolla morada malla 500 g" } },
  { term: "patata", serving: 1000, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Potatoes", aliases: ["patata", "patatas", "potato", "potatoes"], stores: { "Mercadona": "Patata", "Dia": "Patatas para cocer 2 Kg" } },
  { term: "platano", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Bananas", aliases: ["platano", "plátano", "banana", "bananas"], stores: { "Mercadona": "Plátano de Canarias IGP", "Dia": "Plátano de canarias 1 Kg aprox." } },
  { term: "manzana", serving: 500, basis: { amount: 1000, unit: "g", label: "kg" }, label: "Apples", aliases: ["manzana", "manzanas", "apple", "apples"], stores: { "Mercadona": "Manzana Golden", "Dia": "Manzana Golden 1 Kg" } },
  { term: "lechuga", serving: 1, basis: { amount: 1, unit: "ud", label: "piece" }, label: "Lettuce", aliases: ["lechuga", "lettuce", "ensalada", "salad"], stores: { "Mercadona": "Lechuga Iceberg", "Dia": "Lechuga iceberg unidad" } },
  { term: "agua", serving: 1500, basis: { amount: 1000, unit: "ml", label: "L" }, label: "Water", aliases: ["agua", "water"], stores: { "Mercadona": "Agua mineral grande Fuente Dehesa", "Dia": "Agua mineral Dia 1,5 L" } },
];
