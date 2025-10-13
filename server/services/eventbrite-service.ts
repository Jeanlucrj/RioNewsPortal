import axios from "axios";
import type { Event, NewsCategory } from "@shared/schema";

const EVENTBRITE_BASE_URL = "https://www.eventbriteapi.com/v3";
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_API_KEY;

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description: {
    text: string;
  };
  logo?: {
    url: string;
  };
  category_id: string;
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end: {
    timezone: string;
    local: string;
    utc: string;
  };
  venue?: {
    name: string;
    address: {
      city: string;
      region: string;
    };
  };
  url: string;
  ticket_availability?: {
    minimum_ticket_price?: {
      display: string;
    };
  };
}

export class EventbriteService {
  private mapCategory(categoryId: string): NewsCategory {
    const categoryMap: Record<string, NewsCategory> = {
      '103': 'shows', // Music
      '105': 'shows', // Performing & Visual Arts
      '104': 'vida-noturna', // Food & Drink
      '110': 'cultura', // Festivals & Fairs
      '108': 'esportes', // Sports & Fitness
      '113': 'cultura', // Community & Culture
    };

    return categoryMap[categoryId] || 'geral';
  }

  async fetchEvents(): Promise<Event[]> {
    if (!EVENTBRITE_TOKEN) {
      console.warn("EVENTBRITE_API_KEY not configured, skipping Eventbrite integration");
      return [];
    }

    try {
      const response = await axios.get(`${EVENTBRITE_BASE_URL}/users/me/owned_events/`, {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_TOKEN}`,
        },
        params: {
          expand: 'venue,ticket_availability',
          status: 'live',
        },
      });

      if (!response.data || !response.data.events) {
        return [];
      }

      const events: Event[] = response.data.events.map((event: EventbriteEvent) => {
        const eventDate = new Date(event.start.local);
        
        return {
          id: `eventbrite-${event.id}`,
          title: event.name.text,
          description: event.description?.text || '',
          imageUrl: event.logo?.url,
          category: this.mapCategory(event.category_id),
          date: event.start.local,
          time: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          venue: event.venue ? `${event.venue.name}, ${event.venue.address.city} - ${event.venue.address.region}` : '',
          ticketUrl: event.url,
          price: event.ticket_availability?.minimum_ticket_price?.display || 'Ver no Eventbrite',
        };
      });

      console.log(`Fetched ${events.length} events from Eventbrite`);
      return events;
    } catch (error) {
      console.error("Error fetching events from Eventbrite:", error);
      return [];
    }
  }
}
