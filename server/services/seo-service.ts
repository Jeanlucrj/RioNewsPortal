// Google Indexing API integration (Node.js / Vercel backend)
import { google } from "googleapis";

const SITE_URL = process.env.SITE_URL || "https://odiariocarioca.com.br";

export class SeoService {
  private jwtClient: any;
  private isConfigured: boolean = false;

  constructor() {
    this.initClient();
  }

  private initClient() {
    try {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.warn("⚠️  GOOGLE_SERVICE_ACCOUNT_JSON não configurado. Indexing API desabilitada.");
        return;
      }

      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

      this.jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/indexing"],
      });

      this.isConfigured = true;
    } catch (error) {
      console.error("❌ Falha ao inicializar cliente do Google Indexing API:", error);
    }
  }

  /**
   * Notifica a API de Indexação do Google para uma URL completa.
   * @param url  URL completa da notícia, ex: https://odiariocarioca.com.br/noticia/meu-slug
   * @param type URL_UPDATED (novo/atualizado) ou URL_DELETED (removido)
   */
  async notifyGoogle(url: string, type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED") {
    if (!this.isConfigured) return false;

    try {
      await this.jwtClient.authorize();

      const indexing = google.indexing({ version: "v3", auth: this.jwtClient });
      await indexing.urlNotifications.publish({ requestBody: { url, type } });

      console.log(`✅ Google Indexing API: ${type} → ${url}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Google Indexing API falhou para ${url}:`, error.message);
      return false;
    }
  }

  /**
   * Atalho: notifica o Google ao publicar uma notícia pelo ID (news_articles).
   * @param articleId  ID do artigo na tabela news_articles
   */
  async notifyArticle(articleId: string) {
    const url = `${SITE_URL}/noticia/${encodeURIComponent(articleId)}`;
    return this.notifyGoogle(url, "URL_UPDATED");
  }

  /**
   * Atalho: notifica o Google ao publicar uma notícia pelo slug (tabela noticias).
   * @param slug  Slug único, ex: "flamengo-vence-fluminense-2025"
   */
  async notifySlug(slug: string) {
    const url = `${SITE_URL}/noticia/${slug}`;
    return this.notifyGoogle(url, "URL_UPDATED");
  }
}

export const seoService = new SeoService();
