import type { Event, NewsCategory } from "../../shared/schema.js";
import { randomUUID } from "crypto";
import { SymplaService } from "./sympla-service.js";
import { EventbriteService } from "./eventbrite-service.js";
import { BloggerEventsService } from "./blogger-events-service.js";
import { storage } from "../storage.js";

const symplaService = new SymplaService();
const eventbriteService = new EventbriteService();
const bloggerService = new BloggerEventsService();

export class EventsService {
  async fetchEvents(category?: NewsCategory): Promise<Event[]> {
    return storage.getEvents(category);
  }

  async syncExternalEvents(): Promise<{ saved: number; errors: number }> {
    console.log("🔄 Inciando sincronização de eventos de múltiplas fontes...");

    const results = await Promise.allSettled([
      symplaService.fetchEvents(),
      eventbriteService.fetchEvents(),
      bloggerService.fetchEvents()
    ]);

    let allEvents: Event[] = [];
    let errorCount = 0;

    results.forEach((result, index) => {
      const sourceNames = ['Sympla', 'Eventbrite', 'Blogger'];
      if (result.status === 'fulfilled') {
        allEvents = [...allEvents, ...result.value];
        console.log(`✅ ${sourceNames[index]}: Encontrados ${result.value.length} eventos.`);
      } else {
        errorCount++;
        console.error(`❌ Erro ao buscar eventos do ${sourceNames[index]}:`, result.reason);
      }
    });

    if (allEvents.length === 0) {
      console.warn("⚠️ Nenhum evento encontrado em nenhuma das fontes.");
      return { saved: 0, errors: errorCount };
    }

    // Filter out past events before saving
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureEvents = allEvents.filter(e => new Date(e.date) >= today);

    console.log(`💾 Salvando ${futureEvents.length} eventos futuros no banco de dados...`);
    const savedCount = await storage.saveEvents(futureEvents);

    // Cleanup very old events
    await storage.cleanupOldEvents(2);

    return { saved: savedCount, errors: errorCount };
  }
}

export const eventsService = new EventsService();
