import axios from "axios";
import type { Event, NewsCategory } from "@shared/schema";
import { detectCategory } from "@shared/categorization";
import { randomUUID } from "crypto";

const BLOGGER_FEED_URL = "https://agendaculturalriodejaneiro.blogspot.com/feeds/posts/default?alt=json";

export class BloggerEventsService {
    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, "").trim();
    }

    private extractField(content: string, fieldName: string): string | undefined {
        const regex = new RegExp(`${fieldName}:?\\s*([^\\n📍📅⏰🎟️🎫🍽️]+)`, "i");
        const match = content.match(regex);
        return match ? match[1].trim() : undefined;
    }

    async fetchEvents(): Promise<Event[]> {
        try {
            console.log("Fetching events from Blogger...");
            const response = await axios.get(BLOGGER_FEED_URL);

            if (!response.data || !response.data.feed || !response.data.feed.entry) {
                console.log("No entries found in Blogger feed.");
                return [];
            }

            const entries = response.data.feed.entry;
            const events: Event[] = entries.map((entry: any) => {
                const title = entry.title.$t;
                const contentHtml = entry.content.$t;
                const contentText = this.stripHtml(contentHtml);

                // Extract fields from content
                const venue = this.extractField(contentText, "Local") || this.extractField(contentText, "Endereço");
                const dateStr = this.extractField(contentText, "Data");
                const time = this.extractField(contentText, "Horário");
                const price = this.extractField(contentText, "Entrada") || this.extractField(contentText, "Ingressos");

                // Parse date
                let eventDate = new Date(entry.published.$t); // Default to pub date
                if (dateStr) {
                    const dayMatch = dateStr.match(/(\d{1,2})/);
                    if (dayMatch) {
                        const day = parseInt(dayMatch[1]);
                        eventDate.setDate(day);
                    }
                }

                // Detect category
                const category = detectCategory(title, contentText, "Agenda Cultural RJ");

                // Extract image
                let imageUrl = undefined;
                if (entry.media$thumbnail) {
                    imageUrl = entry.media$thumbnail.url.replace(/\/s72-c\//, "/s1600/"); // Get larger image
                }

                return {
                    id: entry.id.$t.split('-').pop() || randomUUID(),
                    title,
                    description: contentText.substring(0, 500),
                    imageUrl,
                    category,
                    date: eventDate.toISOString(),
                    time,
                    venue,
                    ticketUrl: entry.link.find((l: any) => l.rel === "alternate")?.href,
                    price,
                    source: "blogger-agenda-cultural",
                };
            });

            console.log(`Successfully parsed ${events.length} events from Blogger`);
            return events;
        } catch (error: any) {
            console.error("Error fetching events from Blogger:", error.message);
            return [];
        }
    }
}
