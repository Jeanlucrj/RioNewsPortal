/**
 * Busca fotos do Rio de Janeiro no Pixabay e Pexels.
 * A query é construída a partir das TAGS do artigo gerado pelo Gemini,
 * garantindo que a foto seja contextualmente relevante ao conteúdo.
 *
 * Env vars (pelo menos uma):
 *   PIXABAY_API_KEY  — pixabay.com/api/docs
 *   PEXELS_API_KEY   — pexels.com/api
 */

// Termos base por categoria — sempre inclui "Rio de Janeiro"
const CATEGORY_BASE: Record<string, string> = {
  geral:          "Rio de Janeiro",
  esportes:       "Rio de Janeiro esporte",
  cultura:        "Rio de Janeiro cultura",
  shows:          "Rio de Janeiro show música",
  gastronomia:    "Rio de Janeiro gastronomia comida",
  internacional:  "Rio de Janeiro",
  "vida-noturna": "Rio de Janeiro noite",
};

/**
 * Monta a query de busca priorizando as tags do artigo.
 * Tags geradas pelo Gemini são as mais semanticamente precisas.
 *
 * Exemplos:
 *   tags ["flamengo","brasileirao"] → "Rio de Janeiro flamengo brasileirao"
 *   tags ["carnaval","samba","lapa"] → "Rio de Janeiro carnaval samba lapa"
 */
function buildQuery(category: string, tags: string[], title?: string): string {
  const base = CATEGORY_BASE[category] ?? "Rio de Janeiro";

  // Use tags as primary keywords (they're the most contextual)
  if (tags.length > 0) {
    const tagKeywords = tags
      .map(t => t.replace(/-/g, " "))
      .slice(0, 3)
      .join(" ");
    return `${base} ${tagKeywords}`;
  }

  // Fallback: extract meaningful words from title
  if (title) {
    const words = title
      .replace(/[^\w\sÀ-ú]/g, " ")
      .split(" ")
      .filter(w => w.length > 4)
      .slice(0, 3)
      .join(" ");
    if (words) return `${base} ${words}`;
  }

  return base;
}

function pickRandom<T>(arr: T[], max = 15): T {
  const pool = arr.slice(0, max);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Pixabay ───────────────────────────────────────────────────────────────────
async function fromPixabay(query: string): Promise<string | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const url =
      `https://pixabay.com/api/?key=${key}` +
      `&q=${encodeURIComponent(query)}` +
      `&image_type=photo&orientation=horizontal` +
      `&min_width=800&min_height=450&per_page=20&safesearch=true`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as { hits?: { largeImageURL: string; webformatURL: string }[] };
    if (!data.hits?.length) return null;
    const hit = pickRandom(data.hits);
    return hit.largeImageURL || hit.webformatURL;
  } catch (e: any) {
    console.warn(`⚠️  [Pixabay] "${query}":`, e.message);
    return null;
  }
}

// ── Pexels ────────────────────────────────────────────────────────────────────
async function fromPexels(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const url =
      `https://api.pexels.com/v1/search` +
      `?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`;
    const resp = await fetch(url, { headers: { Authorization: key } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as {
      photos?: { src: { large2x: string; large: string; medium: string } }[]
    };
    if (!data.photos?.length) return null;
    const photo = pickRandom(data.photos);
    return photo.src.large2x || photo.src.large || photo.src.medium;
  } catch (e: any) {
    console.warn(`⚠️  [Pexels] "${query}":`, e.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Busca uma foto contextualmente relevante ao artigo.
 *
 * @param category  Categoria do artigo
 * @param tags      Tags geradas pelo Gemini — usadas como query principal
 * @param title     Título do artigo — fallback se tags vazias
 * @param usedUrls  URLs já usadas recentemente — evita repetição
 */
export async function fetchStockImage(
  category: string,
  tags: string[] = [],
  title?: string,
  usedUrls: Set<string> = new Set()
): Promise<string | null> {
  const query = buildQuery(category, tags, title);
  console.log(`🖼️  [stock] query: "${query}"`);

  // Try with full contextual query first
  let image = (await fromPixabay(query)) ?? (await fromPexels(query));

  // If image was already used, retry with category-only query for variety
  if (image && usedUrls.has(image)) {
    const broadQuery = CATEGORY_BASE[category] ?? "Rio de Janeiro";
    console.log(`🔄 [stock] imagem já usada — retry com "${broadQuery}"`);
    image = (await fromPixabay(broadQuery)) ?? (await fromPexels(broadQuery)) ?? image;
  }

  if (image) {
    console.log(`✅ [stock] ${image.slice(0, 80)}`);
  } else {
    console.warn(`⚠️  [stock] sem resultado para "${query}"`);
  }
  return image;
}
