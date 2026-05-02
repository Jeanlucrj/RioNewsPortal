import axios from "axios";
import type { SportTeam, SportMatch } from "../../shared/schema.js";

// ESPN public API — no key required, always updated
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1";

const RIO_TEAMS = {
  flamengo:   { espnId: "819",  name: "Flamengo" },
  fluminense: { espnId: "3445", name: "Fluminense" },
  vasco:      { espnId: "3454", name: "Vasco da Gama" },
  botafogo:   { espnId: "6086", name: "Botafogo" },
};

const RIO_NAMES = ["Flamengo", "Fluminense", "Vasco", "Botafogo"];

// 30-min server-side cache
interface Cache<T> { data: T; ts: number }
const CACHE_TTL = 30 * 60 * 1000;
let recentCache: Cache<SportMatch[]> | null = null;
let nextCache: Cache<SportMatch[]> | null = null;

function isRioTeam(name: string) {
  return RIO_NAMES.some(r => name.includes(r));
}

function parseMatch(e: any, status: string): SportMatch | null {
  const comp = e.competitions?.[0];
  if (!comp) return null;
  const c0 = comp.competitors[0];
  const c1 = comp.competitors[1];
  if (!c0 || !c1) return null;

  return {
    id: e.id,
    homeTeam: c0.team.displayName,
    awayTeam: c1.team.displayName,
    homeScore: c0.score?.value ?? (c0.score != null ? Number(c0.score) : undefined),
    awayScore: c1.score?.value ?? (c1.score != null ? Number(c1.score) : undefined),
    date: e.date?.slice(0, 10) ?? "",
    status,
    league: comp.tournament?.displayName ?? "Série A",
  };
}

function getBrazilDateStr(isoDateStr: string) {
  try {
    return new Date(isoDateStr).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return isoDateStr?.slice(0, 10) ?? "";
  }
}

export class SportsService {
  async getTeamInfo(teamName: keyof typeof RIO_TEAMS): Promise<SportTeam | null> {
    try {
      const { espnId } = RIO_TEAMS[teamName];
      const res = await axios.get(`${ESPN_BASE}/teams/${espnId}`, { timeout: 8000 });
      const t = res.data?.team;
      if (!t) return null;
      return {
        id: espnId,
        name: t.displayName,
        badge: t.logos?.[0]?.href,
        stadium: t.venue?.fullName,
        description: t.description,
      };
    } catch {
      return null;
    }
  }

  async getRecentMatches(): Promise<SportMatch[]> {
    if (recentCache && Date.now() - recentCache.ts < CACHE_TTL) {
      return recentCache.data;
    }

    try {
      const matches: SportMatch[] = [];
      const seen = new Set<string>();
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

      for (const { espnId } of Object.values(RIO_TEAMS)) {
        try {
          const res = await axios.get(`${ESPN_BASE}/teams/${espnId}/schedule`, { timeout: 8000 });
          const events: any[] = res.data?.events ?? [];

          const finished = events
            .filter(e => {
              const matchDate = getBrazilDateStr(e.date);
              const isCompleted = e.competitions?.[0]?.status?.type?.completed;
              return isCompleted && matchDate <= today;
            })
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 1);

          for (const e of finished) {
            if (!seen.has(e.id)) {
              seen.add(e.id);
              const m = parseMatch(e, "Finalizado");
              if (m) matches.push(m);
            }
          }
        } catch { /* skip this team */ }
      }

      const result = matches
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4);

      recentCache = { data: result, ts: Date.now() };
      return result;
    } catch (error) {
      console.error("Error fetching recent matches:", error);
      return recentCache?.data ?? [];
    }
  }

  async getNextMatches(): Promise<SportMatch[]> {
    if (nextCache && Date.now() - nextCache.ts < CACHE_TTL) {
      return nextCache.data;
    }

    try {
      const matches: SportMatch[] = [];
      const seen = new Set<string>();
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

      for (const { espnId } of Object.values(RIO_TEAMS)) {
        try {
          const res = await axios.get(`${ESPN_BASE}/teams/${espnId}/schedule`, { timeout: 8000 });
          const events: any[] = res.data?.events ?? [];

          const upcoming = events
            .filter(e => {
              const matchDate = getBrazilDateStr(e.date);
              const isCompleted = e.competitions?.[0]?.status?.type?.completed;
              return matchDate >= today && !isCompleted;
            })
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 2);

          for (const e of upcoming) {
            if (!seen.has(e.id)) {
              seen.add(e.id);
              const m = parseMatch(e, "Próximo");
              if (m && (isRioTeam(m.homeTeam) || isRioTeam(m.awayTeam))) {
                matches.push(m);
              }
            }
          }
        } catch { /* skip this team */ }
      }

      const result = matches
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4);

      nextCache = { data: result, ts: Date.now() };
      return result;
    } catch (error) {
      console.error("Error fetching next matches:", error);
      return nextCache?.data ?? [];
    }
  }
}
