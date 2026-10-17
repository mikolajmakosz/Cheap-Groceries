/**
 * The everyday thing a student means when they type a word. One reference product per te
 * rm per store, chosen by hand: the ordinary own-brand option, not the cheapest row in t
 * he category. Without this, 'pollo' matches chicken carcasses at 1.07 and 'leche' match
 * es an oat drink. Aliases are Spanish and English, because the users are international 
 * students in Madrid.
 */

export type ReferenceTerm = {
  /** Canonical catalogue term, also stored on the product row. */
  term: string;
  /** Everyday words, Spanish and English, that mean this term. */
  aliases: string[];
  /** Store name -> the exact product name chosen as the reference. */
  stores: Record<string, string>;
};

export const REFERENCE_TERMS: ReferenceTerm[] = [
  { term: "pollo", aliases: ["pollo", "pechuga", "chicken", "chicken breast"], stores: { "Mercadona": "Filetes pechuga de pollo" } },
  { term: "cerdo", aliases: ["cerdo", "lomo", "pork"], stores: { "Mercadona": "Filetes lomo de cerdo corte fino" } },
  { term: "carne picada", aliases: ["carne picada", "picada", "mince", "minced meat", "ground beef"], stores: { "Mercadona": "Preparado de carne picada vacuno y cerdo" } },
  { term: "jamon cocido", aliases: ["jamon cocido", "jamon", "ham"], stores: { "Mercadona": "Jamón cocido Hacendado lonchas" } },
  { term: "leche", aliases: ["leche", "leche entera", "milk"], stores: { "Mercadona": "Leche entera Hacendado" } },
  { term: "huevos", aliases: ["huevos", "huevo", "eggs", "egg"], stores: { "Mercadona": "Huevos medianos M" } },
  { term: "mantequilla", aliases: ["mantequilla", "butter"], stores: { "Mercadona": "Mantequilla con sal Hacendado" } },
  { term: "queso", aliases: ["queso", "cheese", "queso lonchas"], stores: { "Mercadona": "Queso lonchas fundido sándwich mezcla Hacendado" } },
  { term: "queso fresco", aliases: ["queso fresco", "quark", "cottage"], stores: { "Mercadona": "Queso fresco batido desnatado 0% MG Hacendado" } },
  { term: "yogur", aliases: ["yogur", "yogurt", "yoghurt"], stores: { "Mercadona": "Yogur natural Hacendado" } },
  { term: "pan", aliases: ["pan", "bread", "barra"], stores: { "Mercadona": "Barra de pan" } },
  { term: "pan de molde", aliases: ["pan de molde", "sliced bread", "toast"], stores: { "Mercadona": "Pan de molde blanco Hacendado" } },
  { term: "arroz", aliases: ["arroz", "rice"], stores: { "Mercadona": "Arroz redondo Hacendado" } },
  { term: "pasta", aliases: ["pasta", "macarrones", "spaghetti", "penne", "noodles"], stores: { "Mercadona": "Pasta penne rigate Hacendado" } },
  { term: "cereales", aliases: ["cereales", "cereal", "corn flakes", "cornflakes"], stores: { "Mercadona": "Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos" } },
  { term: "garbanzos", aliases: ["garbanzos", "garbanzo", "chickpeas"], stores: { "Mercadona": "Garbanzo cocido Hacendado" } },
  { term: "lentejas", aliases: ["lentejas", "lenteja", "lentils"], stores: { "Mercadona": "Lenteja cocida Hacendado" } },
  { term: "alubias", aliases: ["alubias", "judias", "beans", "white beans"], stores: { "Mercadona": "Alubia cocida blanca Hacendado" } },
  { term: "atun", aliases: ["atun", "tuna"], stores: { "Mercadona": "Atún claro al natural Hacendado" } },
  { term: "merluza", aliases: ["merluza", "hake", "white fish"], stores: { "Mercadona": "Rodajas de merluza del Cabo descongelada" } },
  { term: "salmon", aliases: ["salmon", "salmón"], stores: { "Mercadona": "Rodaja de salmón" } },
  { term: "aceite", aliases: ["aceite", "aceite de oliva", "olive oil", "oil"], stores: { "Mercadona": "Aceite de oliva virgen extra Hacendado Gran Selección" } },
  { term: "tomate frito", aliases: ["tomate frito", "tomato sauce", "passata"], stores: { "Mercadona": "Tomate frito Hacendado" } },
  { term: "tomate", aliases: ["tomate", "tomates", "tomato", "tomatoes"], stores: { "Mercadona": "Tomate pera" } },
  { term: "cebolla", aliases: ["cebolla", "cebollas", "onion", "onions"], stores: { "Mercadona": "Cebollas rojas" } },
  { term: "patata", aliases: ["patata", "patatas", "potato", "potatoes"], stores: { "Mercadona": "Patata" } },
  { term: "platano", aliases: ["platano", "plátano", "banana", "bananas"], stores: { "Mercadona": "Plátano de Canarias IGP" } },
  { term: "manzana", aliases: ["manzana", "manzanas", "apple", "apples"], stores: { "Mercadona": "Manzana Golden" } },
  { term: "lechuga", aliases: ["lechuga", "lettuce", "ensalada", "salad"], stores: { "Mercadona": "Lechuga Iceberg" } },
  { term: "agua", aliases: ["agua", "water"], stores: { "Mercadona": "Agua mineral grande Aguadoy" } },
];
