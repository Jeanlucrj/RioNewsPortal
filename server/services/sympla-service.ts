import axios from "axios";
import type { Event, NewsCategory } from "@shared/schema";

const SYMPLA_BASE_URL = "https://api.sympla.com.br/public/v3";
const SYMPLA_TOKEN = process.env.SYMPLA_API_KEY;

interface SymplaEvent {
  id: number;
  name: string;
  detail: string;
  image: string;
  category: string;
  start_date: string;
  end_date: string;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  url: string;
}

export class SymplaService {
  private mapCategory(symplaCategory: string): NewsCategory {
    const categoryMap: Record<string, NewsCategory> = {
      'cultura': 'cultura',
      'arte': 'cultura',
      'musica': 'shows',
      'show': 'shows',
      'festa': 'vida-noturna',
      'balada': 'vida-noturna',
      'esporte': 'esportes',
      'futebol': 'esportes',
    };

    const lowerCategory = symplaCategory.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }

    return 'geral';
  }

  async fetchEvents(): Promise<Event[]> {
    if (!SYMPLA_TOKEN) {
      console.warn("SYMPLA_API_KEY not configured, skipping Sympla integration");
      return [];
    }

    try {
      const response = await axios.get(`${SYMPLA_BASE_URL}/events`, {
        headers: {
          's_token': SYMPLA_TOKEN,
        },
      });

      if (!response.data || !response.data.data) {
        return [];
      }

      const events: Event[] = response.data.data.map((event: SymplaEvent) => {
        const eventDate = new Date(event.start_date);
        
        return {
          id: `sympla-${event.id}`,
          title: event.name,
          description: event.detail || '',
          imageUrl: event.image,
          category: this.mapCategory(event.category || ''),
          date: event.start_date,
          time: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          venue: event.address ? `${event.address.name}, ${event.address.city} - ${event.address.state}` : '',
          ticketUrl: event.url,
          price: 'Ver no Sympla',
        };
      });

      console.log(`Fetched ${events.length} events from Sympla`);
      return events;
    } catch (error) {
      console.error("Error fetching events from Sympla:", error);
      return [];
    }
  }
}
