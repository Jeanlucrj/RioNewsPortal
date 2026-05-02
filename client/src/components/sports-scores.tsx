import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import type { SportMatch } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RIO_TEAMS = new Set([
  "Flamengo", "Fluminense", "Vasco da Gama", "Vasco", "Botafogo"
]);

function isRioTeam(name: string) {
  return [...RIO_TEAMS].some(t => name.includes(t));
}

function TeamName({ name }: { name: string }) {
  const short: Record<string, string> = {
    "Flamengo": "FLA",
    "Fluminense": "FLU",
    "Vasco da Gama": "VAS",
    "Vasco": "VAS",
    "Botafogo": "BOT",
  };
  const abbr = Object.entries(short).find(([k]) => name.includes(k))?.[1];
  return (
    <span className={`font-bold text-sm ${isRioTeam(name) ? "text-foreground" : "text-muted-foreground"}`}>
      {abbr ?? name.split(" ")[0].slice(0, 3).toUpperCase()}
    </span>
  );
}

function MatchCard({ match }: { match: SportMatch }) {
  const isFinished = match.status === "Match Finished" || match.status === "Finalizado";
  const isNext = match.status === "Próximo";
  const dateStr = format(new Date(match.date), "dd/MM", { locale: ptBR });

  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-muted/50 min-w-[90px]">
      <span className="text-[10px] text-muted-foreground truncate max-w-full text-center leading-tight">
        {match.league?.replace("Brazilian ", "").slice(0, 12)}
      </span>
      <div className="flex items-center gap-1.5">
        <TeamName name={match.homeTeam} />
        {isFinished ? (
          <span className="text-sm font-mono font-bold tabular-nums">
            {match.homeScore ?? 0}
            <span className="text-muted-foreground mx-0.5">-</span>
            {match.awayScore ?? 0}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground font-mono">vs</span>
        )}
        <TeamName name={match.awayTeam} />
      </div>
      <span className={`text-[10px] font-medium ${isNext ? "text-primary" : "text-muted-foreground"}`}>
        {isNext ? dateStr : isFinished ? "FIM" : match.status}
      </span>
    </div>
  );
}

export function SportsScores() {
  const { data: recent } = useQuery<SportMatch[]>({
    queryKey: ["/api/sports/matches", "v2"],
    queryFn: () => fetch("/api/sports/matches?v=2").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: next } = useQuery<SportMatch[]>({
    queryKey: ["/api/sports/next", "v2"],
    queryFn: () => fetch("/api/sports/next?v=2").then(r => r.json()),
    staleTime: 30 * 60 * 1000,
  });

  // Filter to show only matches involving Rio teams
  const rioRecent = recent?.filter(m => isRioTeam(m.homeTeam) || isRioTeam(m.awayTeam)).slice(0, 4) ?? [];
  const rioNext = next?.filter(m => isRioTeam(m.homeTeam) || isRioTeam(m.awayTeam)).slice(0, 2) ?? [];

  const matches = [...rioNext, ...rioRecent].slice(0, 5);

  if (matches.length === 0) return null;

  return (
    <div className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <Link href="/categoria/esportes" className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
            <span className="hidden sm:inline">PLACAR</span>
          </Link>
          <div className="flex gap-2 overflow-x-auto">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
