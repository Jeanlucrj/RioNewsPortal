import { type NewsCategory } from "./schema.js";

// Keywords that are unambiguously sports (not also place names)
const unambiguousSportsKeywords = [
    "brasileirão", "campeonato brasileiro", "futebol", "escalação", "gol", "estádio",
    "maracanã", "libertadores", "champions league", "copa do brasil", "placar", "convocação",
    "palmeiras", "corinthians", "são paulo fc", "grêmio", "internacional", "atlético",
    "série a", "série b", "copa sul-americana", "seleção brasileira", "técnico",
    "atacante", "zagueiro", "goleiro", "meia", "lateral", "artilheiro",
    "rodada", "semifinal", "final do campeonato"
];

// Keywords that are ALSO place names in Rio — require extra sports context to classify as sports
const ambiguousSportsKeywords = [
    "botafogo", "flamengo", "fluminense", "vasco"
];

// Context words that confirm sports intent when found alongside ambiguous keywords
const sportsContextWords = [
    "jogo", "time", "clube", "gol", "futebol", "partida", "campeonato", "rodada",
    "escalação", "técnico", "reforço", "contratação", "jogador", "atacante",
    "zagueiro", "goleiro", "meia", "torcida", "torcedor", "vitória", "derrota",
    "empate", "classificação", "rebaixamento", "série a", "série b",
    "brasileirão", "libertadores", "copa", "estádio", "maracanã", "placar",
    "pênalti", "falta", "cartão", "arbitragem", "árbitro", "var",
    "semifinal", "quartas", "oitavas", "grupo", "fase", "turno",
    "artilheiro", "capitão", "titular", "reserva", "banco", "substituição"
];

// Words that strongly indicate the keyword is being used as a place name, not a team
const placeContextWords = [
    "bairro", "rua", "avenida", "praia", "zona sul", "zona norte", "zona oeste",
    "casarão", "desaba", "desabamento", "incêndio", "prédio", "edifício",
    "morador", "moradores", "comunidade", "favela", "estação", "metrô",
    "trânsito", "acidente", "operário", "bombeiros", "resgate", "hospital",
    "delegacia", "assalto", "arrastão", "obra", "prefeitura",
    "restaurante", "bar", "shopping", "loja", "mercado"
];

export const categoryKeywords: Record<Exclude<NewsCategory, "geral">, string[]> = {
    esportes: [
        ...unambiguousSportsKeywords,
        ...ambiguousSportsKeywords,
    ],
    shows: [
        "show", "festival de música", "concerto", "banda", "samba", "rock", "turnê",
        "ingressos", "setlist", "cantor", "cantora", "musical", "palco"
    ],
    cultura: [
        "cinema", "filme", "teatro", "exposição", "museu", "literatura", "livro",
        "novela", "ator", "atriz", "streaming", "documentário", "arte", "galeria"
    ],
    gastronomia: [
        "restaurante", "gastronomia", "culinária", "cardápio", "degustação", "vinhos",
        "chef", "comer e beber", "receita", "bar", "petiscos"
    ],
    internacional: [
        "estados unidos", "eua", "china", "europa", "rússia", "ucrânia", "guerra",
        "trump", "biden", "macron", "putin", "xi jinping", "otan", "onu", "diplomacia",
        "chanceler", "itamaraty", "relações exteriores"
    ],
    "vida-noturna": [
        "balada", "vida noturna", "boate", "nightclub", "night club",
        "pista de dança", "dj set", "open bar", "happy hour", "after office", "after party",
        "réveillon", "reveillon", "rooftop bar", "bares noturnos", "bar noturno",
        "festa noturna", "pedra do sal", "rio scenarium", "clubbing",
        "barzinho", "noite carioca", "noite no rio",
    ],
    cidade: [
        "prefeitura do rio", "prefeitura municipal", "cet-rio", "obras municipais",
        "manutenção urbana", "pavimentação", "iluminação pública", "calçada",
        "secretaria municipal", "subprefeitura", "brt", "transcarioca",
    ],
};

// Map source/API categories to our local categories
const externalCategoryMapping: Record<string, NewsCategory> = {
    // G1 categories
    "esportes": "esportes",
    "futebol": "esportes",
    "pop & arte": "cultura",
    "turismo e viagem": "geral",
    "economia": "geral",
    "política": "geral",
    "mundo": "internacional",

    // NewsData.io categories
    "business": "geral",
    "entertainment": "cultura",
    "environment": "geral",
    "food": "gastronomia",
    "health": "geral",
    "politics": "geral",
    "science": "geral",
    "sports": "esportes",
    "technology": "geral",
    "top": "geral",
    "world": "internacional",
    "tourism": "geral"
};

const sportsBlacklist = [
    "nuclear", "militar", "bélico", "armas", "ogivas", "mísseis", "exército",
    "marinha", "aeronáutica", "defesa nacional", "otan", "nato", "parlamento",
    "eleições", "diplomacia", "presidente", "macron", "biden", "trump",
    "vagas", "trabalho", "emprego", "concurso", "oportunidade", "renda", "salário"
];

function matchKeyword(text: string, keyword: string): boolean {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^\\wÀ-ÿ])${escapedKeyword}([^\\wÀ-ÿ]|$)`, 'i');
    return regex.test(text);
}

/**
 * Checks if an ambiguous keyword (e.g. "botafogo") is being used in a sports
 * context vs. as a place name. Returns true only if there is sufficient sports
 * context AND no strong place-name context.
 */
function isAmbiguousKeywordSports(fullText: string): boolean {
    const lower = fullText.toLowerCase();
    const hasPlaceContext = placeContextWords.some(w => lower.includes(w));
    const hasSportsContext = sportsContextWords.some(w => lower.includes(w));

    // If place context is present and no sports context, it's NOT sports
    if (hasPlaceContext && !hasSportsContext) return false;
    // If sports context is present, it IS sports
    if (hasSportsContext) return true;
    // No context at all — default to NOT sports (safer to leave as geral)
    return false;
}

/**
 * Checks if a text matches a sports keyword, handling ambiguous keywords
 * (team names that are also neighborhood names) with context awareness.
 */
function matchesSportsKeyword(text: string, fullText: string): boolean {
    // Check unambiguous keywords first
    if (unambiguousSportsKeywords.some(kw => matchKeyword(text, kw))) {
        return true;
    }
    // Check ambiguous keywords only if context confirms sports
    if (ambiguousSportsKeywords.some(kw => matchKeyword(text, kw))) {
        return isAmbiguousKeywordSports(fullText);
    }
    return false;
}

export function detectCategory(
    title: string,
    description?: string,
    sourceName?: string,
    externalCategories?: string[]
): NewsCategory {
    const lowerTitle = title.toLowerCase();
    const lowerDesc = (description || "").toLowerCase().substring(0, 300);
    const fullText = lowerTitle + " " + lowerDesc;
    const isGazeta = sourceName?.toLowerCase().includes("gazeta do povo");

    if (externalCategories && externalCategories.length > 0) {
        for (const extCat of externalCategories) {
            const mapped = externalCategoryMapping[extCat.toLowerCase()];
            if (mapped && mapped !== "geral") {
                if (mapped === "esportes" && (isGazeta || sportsBlacklist.some(term => lowerTitle.includes(term)))) {
                    return "geral";
                }
                return mapped;
            }
        }
    }

    const priorityOrder: Exclude<NewsCategory, "geral">[] = ["esportes", "internacional", "shows", "cultura", "gastronomia", "vida-noturna"];

    const titleMatches: NewsCategory[] = [];
    for (const category of priorityOrder) {
        if (category === "esportes") {
            if (isGazeta || sportsBlacklist.some(term => lowerTitle.includes(term))) continue;
            if (matchesSportsKeyword(lowerTitle, fullText)) {
                titleMatches.push(category);
            }
            continue;
        }

        const keywords = categoryKeywords[category];
        if (keywords.some(keyword => matchKeyword(lowerTitle, keyword))) {
            titleMatches.push(category);
        }
    }

    if (titleMatches.length === 1) return titleMatches[0];
    if (titleMatches.length > 1) return "geral";

    const descMatches: NewsCategory[] = [];
    for (const category of priorityOrder) {
        if (category === "esportes") {
            if (isGazeta || sportsBlacklist.some(term => lowerDesc.includes(term))) continue;
            if (matchesSportsKeyword(lowerDesc, fullText)) {
                descMatches.push(category);
            }
            continue;
        }

        const keywords = categoryKeywords[category];
        if (keywords.some(keyword => matchKeyword(lowerDesc, keyword))) {
            descMatches.push(category);
        }
    }

    if (descMatches.length === 1) return descMatches[0];

    return "geral";
}
