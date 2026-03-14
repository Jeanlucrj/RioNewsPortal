import { type NewsCategory } from "./schema.js";

export const categoryKeywords: Record<Exclude<NewsCategory, "geral">, string[]> = {
    esportes: [
        "brasileirão", "campeonato brasileiro", "futebol", "escalação", "gol", "estádio",
        "maracanã", "flamengo", "fluminense", "vasco", "botafogo", "palmeiras", "corinthians",
        "libertadores", "champions league", "copa do brasil", "partida", "placar", "convocação"
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
    "vida-noturna": ["noite", "balada", "festa", "clube", "vida noturna", "boate", "rooftop"],
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

export function detectCategory(
    title: string,
    description?: string,
    sourceName?: string,
    externalCategories?: string[]
): NewsCategory {
    const lowerTitle = title.toLowerCase();
    const lowerDesc = (description || "").toLowerCase().substring(0, 150);
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
        if (category === "esportes" && (isGazeta || sportsBlacklist.some(term => lowerTitle.includes(term)))) continue;

        const keywords = categoryKeywords[category];
        if (keywords.some(keyword => matchKeyword(lowerTitle, keyword))) {
            titleMatches.push(category);
        }
    }

    if (titleMatches.length === 1) return titleMatches[0];
    if (titleMatches.length > 1) return "geral";

    const descMatches: NewsCategory[] = [];
    for (const category of priorityOrder) {
        if (category === "esportes" && (isGazeta || sportsBlacklist.some(term => lowerDesc.includes(term)))) continue;

        const keywords = categoryKeywords[category];
        if (keywords.some(keyword => matchKeyword(lowerDesc, keyword))) {
            descMatches.push(category);
        }
    }

    if (descMatches.length === 1) return descMatches[0];

    return "geral";
}
