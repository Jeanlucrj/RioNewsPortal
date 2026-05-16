/**
 * Busca fotos contextuais no Pixabay e Pexels.
 * Queries em inglês para maximizar cobertura das APIs.
 *
 * Env vars (pelo menos uma):
 *   PIXABAY_API_KEY  — pixabay.com/api/docs
 *   PEXELS_API_KEY   — pexels.com/api
 */

// Base queries em inglês por categoria
const CATEGORY_BASE: Record<string, string> = {
  geral:          "Rio de Janeiro city",
  esportes:       "Rio de Janeiro sport",
  cultura:        "Rio de Janeiro culture art",
  shows:          "Rio de Janeiro concert music",
  gastronomia:    "Rio de Janeiro food restaurant",
  internacional:  "international world news",
  "vida-noturna": "Rio de Janeiro nightlife bar",
  cidade:         "Rio de Janeiro city urban",
};

// Queries específicas por subfeed da categoria cidade
const FEED_QUERY: Record<string, string> = {
  "cet-rio":        "Rio de Janeiro traffic roads transport street",
  "saude":          "Rio de Janeiro health hospital medicine clinic",
  "infraestrutura": "Rio de Janeiro construction urban infrastructure building",
};

// Mapeamento português → inglês para extrair keywords do título
const PT_EN: Array<[string, string]> = [
  ["obras", "construction"],
  ["obra", "construction"],
  ["trânsito", "traffic"],
  ["transito", "traffic"],
  ["pavimentação", "pavement"],
  ["calçada", "sidewalk"],
  ["acidente", "accident"],
  ["interdição", "road closure"],
  ["semáforo", "traffic light"],
  ["viaduto", "viaduct"],
  ["túnel", "tunnel"],
  ["ponte", "bridge"],
  ["metrô", "subway"],
  ["metro", "subway"],
  ["ônibus", "bus"],
  ["trem", "train"],
  ["saúde", "health"],
  ["hospital", "hospital"],
  ["vacina", "vaccine"],
  ["vacinação", "vaccination"],
  ["dengue", "dengue mosquito"],
  ["médico", "doctor"],
  ["clinica", "clinic"],
  ["água", "water"],
  ["esgoto", "sewage"],
  ["lixo", "garbage"],
  ["escola", "school"],
  ["creche", "daycare"],
  ["colégio", "school"],
  ["parque", "park"],
  ["praça", "square plaza"],
  ["iluminação", "street lighting"],
  ["arborização", "trees urban"],
  ["manutenção", "maintenance"],
  ["prefeitura", "city hall"],
  ["bairro", "neighborhood"],
  ["favela", "favela community"],
  ["comunidade", "community"],
  ["praia", "beach"],
  ["lagoa", "lake"],
  ["carnaval", "carnival"],
  ["rua", "street"],
  ["avenida", "avenue"],
];

function titleKeywords(title?: string): string {
  if (!title) return "";
  const text = title.toLowerCase();
  const found: string[] = [];
  for (const [pt, en] of PT_EN) {
    if (text.includes(pt)) {
      found.push(en.split(" ")[0]);
      if (found.length >= 2) break;
    }
  }
  if (found.length > 0) return found.join(" ");
  return title
    .replace(/[^\w\sÀ-ú]/g, " ")
    .split(" ")
    .filter(w => w.length > 5)
    .slice(0, 2)
    .join(" ");
}

function buildQuery(category: string, tags: string[], title?: string, feedName?: string): string {
  // Feed-specific query para subfeeds de cidade
  if (feedName) {
    const key = feedName
      .toLowerCase()
      .replace(/prefeitura do rio\s*[-–]?\s*/i, "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .trim();
    for (const [feedKey, query] of Object.entries(FEED_QUERY)) {
      if (key.includes(feedKey)) {
        const kw = titleKeywords(title);
        return kw ? `${query} ${kw}` : query;
      }
    }
  }

  const base = CATEGORY_BASE[category] ?? "Rio de Janeiro city";
  const kw = titleKeywords(title);

  if (kw) return `${base} ${kw}`;

  if (tags.length > 0) {
    return `${base} ${tags.slice(0, 2).map(t => t.replace(/-/g, " ")).join(" ")}`;
  }

  return base;
}

function pickRandom<T>(arr: T[], max = 15): T {
  const pool = arr.slice(0, max);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Página aleatória 1–5 para variar o pool de resultados a cada chamada
function randomPage(): number {
  return Math.ceil(Math.random() * 5);
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
      `&min_width=800&min_height=450&per_page=20&page=${randomPage()}&safesearch=true`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as { hits?: { largeImageURL: string; webformatURL: string }[] };
    if (!data.hits?.length) return null;
    return pickRandom(data.hits).largeImageURL || pickRandom(data.hits).webformatURL;
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
      `?query=${encodeURIComponent(query)}&per_page=20&page=${randomPage()}&orientation=landscape`;
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
 * @param tags      Tags extraídas do artigo
 * @param title     Título do artigo — usado para extrair keywords contextuais
 * @param usedUrls  URLs já usadas nesta sessão — evita repetição entre artigos
 * @param feedName  Nome do feed RSS — habilita queries específicas por subfeed
 */
export async function fetchStockImage(
  category: string,
  tags: string[] = [],
  title?: string,
  usedUrls: Set<string> = new Set(),
  feedName?: string,
): Promise<string | null> {
  const query = buildQuery(category, tags, title, feedName);
  console.log(`🖼️  [stock] query: "${query}" (feed: ${feedName ?? "—"})`);

  let image = (await fromPixabay(query)) ?? (await fromPexels(query));

  // Imagem já usada: tenta com query mais ampla do subfeed
  if (image && usedUrls.has(image)) {
    const broadQuery = feedName
      ? buildQuery(category, [], undefined, feedName)
      : (CATEGORY_BASE[category] ?? "Rio de Janeiro city");
    console.log(`🔄 [stock] imagem repetida — retry com "${broadQuery}"`);
    image = (await fromPixabay(broadQuery)) ?? (await fromPexels(broadQuery)) ?? image;
  }

  if (image) {
    console.log(`✅ [stock] ${image.slice(0, 80)}`);
  } else {
    console.warn(`⚠️  [stock] sem resultado para "${query}"`);
  }
  return image;
}
