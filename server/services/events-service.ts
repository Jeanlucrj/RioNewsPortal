import type { Event, NewsCategory } from "@shared/schema";
import { randomUUID } from "crypto";
import { SymplaService } from "./sympla-service";
import { EventbriteService } from "./eventbrite-service";
import { storage } from "../storage";

const symplaService = new SymplaService();
const eventbriteService = new EventbriteService();

export class EventsService {
  async fetchEvents(category?: NewsCategory): Promise<Event[]> {
    // Try to get events from database first
    const dbEvents = await storage.getEvents(category);
    
    // If database has events, return ONLY database events (no mocks)
    if (dbEvents.length > 0) {
      return dbEvents;
    }
    
    // Only fallback to mock events when database is completely empty
    return this.getMockEvents(category);
  }

  async seedMockEvents(): Promise<number> {
    console.log("Seeding mock events to database...");
    const mockEvents = this.getMockEvents();
    
    if (mockEvents.length > 0) {
      const savedCount = await storage.saveEvents(mockEvents);
      await storage.clearEventsCache();
      console.log(`✅ Seeded ${savedCount} mock events to database`);
      return savedCount;
    }
    
    return 0;
  }

  async syncExternalEvents(): Promise<{ sympla: number; eventbrite: number; total: number; saved: number }> {
    console.log("Starting external events sync...");
    
    const [symplaEvents, eventbriteEvents] = await Promise.all([
      symplaService.fetchEvents(),
      eventbriteService.fetchEvents(),
    ]);

    const allEvents = [...symplaEvents, ...eventbriteEvents];
    
    // Save to database and get count of saved events
    let savedCount = 0;
    if (allEvents.length > 0) {
      savedCount = await storage.saveEvents(allEvents);
      console.log(`Saved/updated ${savedCount} out of ${allEvents.length} events to database`);
      
      // Clear events cache so next GET request fetches fresh data
      await storage.clearEventsCache();
    }
    
    console.log(`Synced ${symplaEvents.length} Sympla + ${eventbriteEvents.length} Eventbrite = ${allEvents.length} total events`);
    
    return {
      sympla: symplaEvents.length,
      eventbrite: eventbriteEvents.length,
      total: allEvents.length,
      saved: savedCount,
    };
  }

  private getMockEvents(category?: NewsCategory): Event[] {
    const allEvents: Event[] = [
      {
        id: randomUUID(),
        title: "Festival de Cinema do Rio",
        description: "Mostra competitiva com filmes brasileiros e internacionais no Cine Odeon.",
        imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
        category: "cultura",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        time: "19:00",
        venue: "Cine Odeon, Centro",
        ticketUrl: "https://example.com",
        price: "R$ 30,00",
      },
      {
        id: randomUUID(),
        title: "Flamengo x Palmeiras",
        description: "Decisão do Campeonato Brasileiro no Maracanã. Ingresso disponível.",
        imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80",
        category: "esportes",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: "16:00",
        venue: "Estádio do Maracanã",
        ticketUrl: "https://example.com",
        price: "A partir de R$ 80,00",
      },
      {
        id: randomUUID(),
        title: "Gilberto Gil - Turnê Tempo Rei",
        description: "Show celebrando 50 anos de carreira do mestre da MPB.",
        imageUrl: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=80",
        category: "shows",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        time: "21:00",
        venue: "Vivo Rio",
        ticketUrl: "https://example.com",
        price: "R$ 150,00 - R$ 300,00",
      },
      {
        id: randomUUID(),
        title: "Samba da Lapa",
        description: "Roda de samba tradicional com os melhores sambistas cariocas.",
        imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80",
        category: "vida-noturna",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        time: "22:00",
        venue: "Arcos da Lapa",
        price: "Gratuito",
      },
      {
        id: randomUUID(),
        title: "Exposição Portinari",
        description: "Retrospectiva inédita do maior pintor brasileiro com mais de 100 obras.",
        imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80",
        category: "cultura",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: "10:00",
        venue: "CCBB - Centro Cultural Banco do Brasil",
        price: "Gratuito (retirar ingresso)",
      },
      {
        id: randomUUID(),
        title: "Corrida de São Sebastião",
        description: "Prova de 10km pelas ruas mais bonitas do Rio de Janeiro.",
        imageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80",
        category: "esportes",
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        time: "07:00",
        venue: "Aterro do Flamengo",
        ticketUrl: "https://example.com",
        price: "R$ 60,00",
      },
      {
        id: randomUUID(),
        title: "Festival Planeta Atlântida Rio",
        description: "Dois dias de música com headliners nacionais e internacionais.",
        imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80",
        category: "shows",
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        time: "14:00",
        venue: "Parque Olímpico",
        ticketUrl: "https://example.com",
        price: "R$ 200,00 - R$ 600,00",
      },
      {
        id: randomUUID(),
        title: "Noite da Bossa Nova",
        description: "Tributo aos clássicos da bossa nova com apresentação de grandes nomes.",
        imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
        category: "vida-noturna",
        date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        time: "20:00",
        venue: "Blue Note Rio",
        ticketUrl: "https://example.com",
        price: "R$ 120,00",
      },
    ];

    if (category && category !== "geral") {
      return allEvents.filter(event => event.category === category);
    }

    return allEvents;
  }
}
