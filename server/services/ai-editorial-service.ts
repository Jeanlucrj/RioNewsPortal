import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NewsArticle } from "../../shared/schema.js";

export interface GeneratedArticle {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  sources: string[];
  imageUrl?: string;
}

export interface GenerateOptions {
  category: string;
  sourceArticles: NewsArticle[];
  tone?: "jornalistico" | "descontraido" | "analitico";
  focus?: string;
}

const categoryPrompts: Record<string, string> = {
  cultura: "cultura carioca, arte, música, literatura e expressões culturais do Rio de Janeiro",
  esportes: "esportes, especialmente futebol carioca (Flamengo, Fluminense, Vasco, Botafogo), atletismo e demais modalidades no Rio",
  shows: "shows, festivais, espetáculos, cinema e entretenimento no Rio de Janeiro",
  gastronomia: "gastronomia, restaurantes, bares, culinária e experiências gastronômicas cariocas",
  internacional: "notícias internacionais com perspectiva e impacto para o público carioca",
  "vida-noturna": "vida noturna, bares, clubes, festas e entretenimento noturno no Rio de Janeiro",
  geral: "notícias gerais de Rio de Janeiro, cotidiano, política local e temas de interesse da cidade",
};

export async function generateArticle(options: GenerateOptions): Promise<GeneratedArticle> {
  const { category, sourceArticles, tone = "jornalistico", focus } = options;

  if (sourceArticles.length === 0) {
    throw new Error("Nenhum artigo fonte fornecido para geração");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const categoryContext = categoryPrompts[category] || categoryPrompts.geral;
  const toneDesc = {
    jornalistico: "jornalístico profissional, objetivo e claro",
    descontraido: "descontraído, próximo do leitor carioca, com leveza sem perder credibilidade",
    analitico: "analítico e aprofundado, com contexto e interpretação dos fatos",
  }[tone];

  const sourceSummary = sourceArticles
    .slice(0, 8)
    .map((a, i) =>
      `[Fonte ${i + 1}] ${a.source}\nTítulo: ${a.title}\nResumo: ${a.description || ""}${a.content ? `\nConteúdo: ${a.content.slice(0, 400)}` : ""}`
    )
    .join("\n\n---\n\n");

  const focusInstruction = focus
    ? `\n\nFoco temático solicitado: **${focus}**. O artigo deve dar destaque especial a este aspecto.`
    : "";

  const prompt = `Você é um jornalista sênior do **Diário do Carioca**, portal de notícias do Rio de Janeiro. Crie artigos originais e exclusivos baseados em notícias de diferentes fontes.

## Categoria: ${category.toUpperCase()}
Tema: ${categoryContext}
Tom editorial: ${toneDesc}
${focusInstruction}

## Notícias fonte:
${sourceSummary}

## Tarefa:
Crie um artigo ORIGINAL para o Diário do Carioca. O artigo deve:
1. Ser completamente original — não copie trechos das fontes
2. Ter perspectiva carioca — contextualize para o público do Rio
3. Acrescentar análise ou contexto local quando relevante
4. Ser factualmente preciso — baseie-se apenas nos fatos fornecidos
5. Ter entre 400-600 palavras no corpo

## Responda APENAS com JSON válido, sem texto adicional:

{
  "title": "Título impactante (máx 90 caracteres)",
  "description": "Lead do artigo — resumo em 2-3 frases (máx 200 caracteres)",
  "content": "Corpo completo em HTML. Use <p> para parágrafos, <strong> para ênfases, <h2> para subtítulos. Mínimo 3 parágrafos.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "sources": ["Nome da fonte 1", "Nome da fonte 2"]
}

As tags devem ser palavras-chave em minúsculas (ex: "flamengo", "carnaval", "gastronomia-carioca").`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON — Gemini sometimes wraps in markdown
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
    text.match(/```\s*([\s\S]*?)\s*```/) ||
    text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Resposta da IA não contém JSON válido");
  }

  const jsonStr = (jsonMatch[1] || jsonMatch[0]).trim();
  const parsed = JSON.parse(jsonStr) as GeneratedArticle;

  if (!parsed.title || !parsed.description || !parsed.content) {
    throw new Error("Artigo gerado incompleto — faltam campos obrigatórios");
  }

  // Get the first available valid image from the source articles
  const sourceImage = sourceArticles.find(a => a.imageUrl && a.imageUrl.startsWith("http"))?.imageUrl;

  return {
    title: parsed.title,
    description: parsed.description,
    content: parsed.content,
    category,
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    imageUrl: sourceImage,
  };
}
