import { Calendar, MapPin, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventCardProps {
  event: Event;
}

const categoryLabels: Record<string, string> = {
  cultura: "Cultura",
  esportes: "Esportes",
  shows: "Shows",
  "vida-noturna": "Vida Noturna",
  geral: "Geral",
};

const categoryColors: Record<string, string> = {
  cultura: "bg-cultura",
  esportes: "bg-esportes",
  shows: "bg-shows",
  "vida-noturna": "bg-vida-noturna",
  geral: "bg-primary",
};

export function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.date);
  const day = format(eventDate, "dd", { locale: ptBR });
  const month = format(eventDate, "MMM", { locale: ptBR }).toUpperCase();

  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 transition-all duration-200"
      data-testid={`card-event-${event.id}`}
    >
      <div className="flex gap-4 p-6">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-accent rounded-md flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" data-testid={`text-event-day-${event.id}`}>
              {day}
            </span>
            <span className="text-xs text-muted-foreground" data-testid={`text-event-month-${event.id}`}>
              {month}
            </span>
          </div>
        </div>

        {event.imageUrl && (
          <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              data-testid={`img-event-${event.id}`}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <Badge
            className={`mb-2 uppercase text-xs font-bold tracking-wide ${categoryColors[event.category]} text-white`}
            data-testid={`badge-event-category-${event.id}`}
          >
            {categoryLabels[event.category]}
          </Badge>
          <h3
            className="text-lg font-semibold mb-2 line-clamp-1"
            data-testid={`text-event-title-${event.id}`}
          >
            {event.title}
          </h3>
          <p
            className="text-sm text-muted-foreground mb-3 line-clamp-2"
            data-testid={`text-event-description-${event.id}`}
          >
            {event.description}
          </p>

          <div className="space-y-1 text-sm text-muted-foreground">
            {event.time && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span data-testid={`text-event-time-${event.id}`}>{event.time}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span data-testid={`text-event-venue-${event.id}`}>{event.venue}</span>
              </div>
            )}
          </div>

          {event.ticketUrl && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              asChild
              data-testid={`button-tickets-${event.id}`}
            >
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                <Ticket className="h-4 w-4 mr-2" />
                Ingressos
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
