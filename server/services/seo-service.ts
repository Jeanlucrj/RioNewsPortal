// Google Indexing API integration
import { google } from "googleapis";

export class SeoService {
  private jwtClient: any;
  private isConfigured: boolean = false;

  constructor() {
    this.initClient();
  }

  private initClient() {
    try {
      // O usuário precisará colocar o GOOGLE_SERVICE_ACCOUNT_JSON nas variáveis de ambiente
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.warn("⚠️  GOOGLE_SERVICE_ACCOUNT_JSON não configurado. Indexing API desabilitada.");
        this.isConfigured = false;
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
      this.isConfigured = false;
    }
  }

  /**
   * Dispara a API de Indexação do Google para uma URL específica
   * @param url A URL completa da notícia (ex: https://rionews.com.br/noticia/123)
   * @param type 'URL_UPDATED' para novas notícias ou atualizações, 'URL_DELETED' para remoções
   */
  async notifyGoogle(url: string, type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED") {
    if (!this.isConfigured) return false;

    try {
      await this.jwtClient.authorize();
      
      const indexing = google.indexing({ version: "v3", auth: this.jwtClient });
      
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: type,
        },
      });
      
      console.log(`✅ Google Indexing API notificada: ${type} para ${url}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao notificar Google Indexing API para ${url}:`, error.message);
      return false;
    }
  }
}

export const seoService = new SeoService();
