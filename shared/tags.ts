// Auto-extract tags from article title + description
const TAG_DICTIONARY: Record<string, string[]> = {
  // Times cariocas
  flamengo: ["flamengo", "rubro-negro", "mengão", "fla"],
  fluminense: ["fluminense", "flu", "tricolor"],
  vasco: ["vasco", "vascão", "cruzmaltino"],
  botafogo: ["botafogo", "botafoguense", "estrela solitária"],

  // Esportes
  futebol: ["futebol", "brasileirão", "copa do brasil", "libertadores", "serie a", "série a", "campeonato"],
  vôlei: ["vôlei", "volei", "superliga"],
  tênis: ["tênis", "roland garros", "wimbledon", "us open"],
  olimpíadas: ["olimpíadas", "olimpiadas", "jogos olímpicos"],

  // Lugares do Rio
  maracanã: ["maracanã", "maracana"],
  copacabana: ["copacabana"],
  ipanema: ["ipanema"],
  lapa: ["lapa"],
  "barra da tijuca": ["barra da tijuca", "barra"],
  tijuca: ["tijuca"],
  "centro rio": ["centro do rio", "centro da cidade"],
  rocinha: ["rocinha"],

  // Cultura e entretenimento
  carnaval: ["carnaval", "samba", "desfile", "escola de samba"],
  "rock in rio": ["rock in rio"],
  cinema: ["cinema", "filme", "bilheteria", "oscar"],
  teatro: ["teatro", "peça", "musical"],
  exposição: ["exposição", "exposicao", "museu", "galeria"],

  // Política e segurança
  eleições: ["eleições", "eleicoes", "candidato", "urna", "tse"],
  "segurança pública": ["segurança pública", "policia", "polícia", "crime", "homicídio", "assalto", "milícia"],
  política: ["política", "politica", "governo", "prefeitura", "câmara", "senado"],

  // Economia
  economia: ["economia", "inflação", "pib", "desemprego", "bolsa de valores"],
  petróleo: ["petrobras", "petróleo", "pré-sal"],

  // Internacional
  trump: ["trump", "donald trump"],
  "guerra ucrânia": ["ucrânia", "ukraine", "zelensky", "guerra"],
  china: ["china", "beijing", "xi jinping"],
  argentina: ["argentina", "buenos aires", "milei"],

  // Gastronomia
  gastronomia: ["restaurante", "chef", "culinária", "gastronomia", "cardápio", "prato"],
  churrasco: ["churrasco", "churrascaria"],
  pizza: ["pizza", "pizzaria"],

  // Saúde
  dengue: ["dengue", "aedes aegypti"],
  covid: ["covid", "covid-19", "coronavirus", "vacina"],
  saúde: ["saúde", "hospital", "sus", "medicamento"],

  // Tecnologia
  ia: ["inteligência artificial", "ia", "chatgpt", "openai"],
  tecnologia: ["tecnologia", "startup", "app", "aplicativo"],
};

export function extractTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const found = new Set<string>();

  for (const [tag, keywords] of Object.entries(TAG_DICTIONARY)) {
    if (keywords.some(kw => text.includes(kw))) {
      found.add(tag);
    }
  }

  return [...found].slice(0, 6); // max 6 tags per article
}
