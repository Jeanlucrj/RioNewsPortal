// loremflickr.com — free, no key, keyword-based real photos
const BASE = "https://loremflickr.com/800/450";

const categoryKeywords: Record<string, string> = {
  esportes: "maracana,football,brazil,rio",
  cultura: "art,culture,museum,theater",
  shows: "concert,music,festival,stage",
  gastronomia: "food,restaurant,cuisine,chef",
  internacional: "world,city,international,politics",
  "vida-noturna": "nightlife,bar,party,city",
  geral: "rio,brazil,city",
};

const titleMappings: Array<{ words: string[]; query: string }> = [
  // Rio teams → Maracanã / Brazil football match photos
  { words: ["flamengo", "fla", "rubro-negro", "mengão"], query: "flamengo,maracana,football,rio" },
  { words: ["fluminense", "flu", "tricolor"], query: "fluminense,maracana,football,brazil" },
  { words: ["vasco", "gigante da colina"], query: "vasco,maracana,football,rio" },
  { words: ["botafogo", "glorioso", "estrela solitária"], query: "botafogo,maracana,football,rio" },
  { words: ["maracanã", "maracana"], query: "maracana,stadium,football,rio" },
  { words: ["copa", "libertadores", "brasileirão", "série a", "campeonato"], query: "football,championship,brazil,soccer" },
  // Other sports
  { words: ["basquete", "nba", "basketball"], query: "basketball,sport,arena" },
  { words: ["vôlei", "volei", "volleyball"], query: "volleyball,sport,beach" },
  { words: ["atletismo", "corrida", "maratona"], query: "athletics,running,sport" },
  // Culture / shows
  { words: ["carnaval", "samba", "desfile", "escola de samba"], query: "carnival,samba,parade,rio" },
  { words: ["praia", "copacabana", "ipanema", "barra"], query: "beach,ocean,rio,brazil" },
  { words: ["rock in rio", "lollapalooza", "festival"], query: "concert,festival,crowd,music" },
  { words: ["show", "apresentação", "turnê", "palco"], query: "concert,music,stage,performance" },
  { words: ["restaurante", "gastronomia", "chef", "culinária", "páscoa", "chocolate"], query: "food,restaurant,chef,cuisine" },
  { words: ["bar", "cerveja", "bebida", "noturna"], query: "bar,drinks,nightlife,city" },
  { words: ["arte", "museu", "exposição", "galeria"], query: "art,museum,gallery,exhibition" },
  { words: ["teatro", "espetáculo", "peça"], query: "theater,stage,brazil" },
  { words: ["música", "cantor", "banda", "álbum"], query: "music,concert,brazil" },
  { words: ["cinema", "filme", "ator", "atriz"], query: "cinema,movie,brazil" },
  { words: ["saúde", "hospital", "vacina", "médico"], query: "health,hospital,brazil" },
  { words: ["economia", "mercado", "negócio"], query: "business,economy,brazil" },
  { words: ["eua", "trump", "washington", "estados unidos"], query: "usa,washington,politics" },
  { words: ["europa", "paris", "london"], query: "europe,city,architecture" },
  { words: ["guerra", "conflito", "israel"], query: "world,conflict,international" },
  { words: ["segurança", "polícia", "violência", "crime"], query: "police,rio,brazil" },
  { words: ["política", "eleição", "prefeitura", "governo", "prefeito"], query: "politics,rio,brazil" },
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const urlCache = new Map<string, string>();

export function getDefaultImage(category: string, title: string, description?: string): string {
  const key = `${category}:${title}`;
  if (urlCache.has(key)) return urlCache.get(key)!;

  const text = ` ${title} ${description ?? ""} `.toLowerCase();
  const lock = hashCode(title) % 50;

  for (const { words, query } of titleMappings) {
    if (words.some(w => text.includes(w))) {
      const url = `${BASE}/${query}?lock=${lock}`;
      urlCache.set(key, url);
      return url;
    }
  }

  const catQuery = categoryKeywords[category] ?? "rio,brazil,city";
  const url = `${BASE}/${catQuery}?lock=${lock}`;
  urlCache.set(key, url);
  return url;
}
