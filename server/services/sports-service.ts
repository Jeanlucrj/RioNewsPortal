import axios from "axios";
import type { SportTeam, SportMatch } from "@shared/schema";

const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || "3";
const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json";

const RIO_TEAMS = {
  flamengo: "133604",
  fluminense: "133612",
  vasco: "133613",
  botafogo: "133602",
};

export class SportsService {
  async getTeamInfo(teamName: keyof typeof RIO_TEAMS): Promise<SportTeam | null> {
    try {
      const teamId = RIO_TEAMS[teamName];
      const response = await axios.get(
        `${THESPORTSDB_BASE_URL}/${THESPORTSDB_API_KEY}/lookupteam.php?id=${teamId}`
      );

      if (response.data && response.data.teams && response.data.teams[0]) {
        const team = response.data.teams[0];
        return {
          id: team.idTeam,
          name: team.strTeam,
          badge: team.strTeamBadge,
          stadium: team.strStadium,
          description: team.strDescriptionEN || team.strDescriptionPT,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching team info for ${teamName}:`, error);
      return null;
    }
  }

  async getRecentMatches(): Promise<SportMatch[]> {
    try {
      const matches: SportMatch[] = [];

      for (const [teamName, teamId] of Object.entries(RIO_TEAMS)) {
        const response = await axios.get(
          `${THESPORTSDB_BASE_URL}/${THESPORTSDB_API_KEY}/eventslast.php?id=${teamId}`
        );

        if (response.data && response.data.results) {
          const teamMatches = response.data.results.slice(0, 5).map((match: any) => ({
            id: match.idEvent,
            homeTeam: match.strHomeTeam,
            awayTeam: match.strAwayTeam,
            homeScore: match.intHomeScore ? parseInt(match.intHomeScore) : undefined,
            awayScore: match.intAwayScore ? parseInt(match.intAwayScore) : undefined,
            date: match.dateEvent,
            status: match.strStatus || "Finalizado",
            league: match.strLeague,
          }));

          matches.push(...teamMatches);
        }
      }

      return matches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 10);
    } catch (error) {
      console.error("Error fetching recent matches:", error);
      return this.getMockMatches();
    }
  }

  private getMockMatches(): SportMatch[] {
    return [
      {
        id: "1",
        homeTeam: "Flamengo",
        awayTeam: "Fluminense",
        homeScore: 2,
        awayScore: 1,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Finalizado",
        league: "Campeonato Carioca",
      },
      {
        id: "2",
        homeTeam: "Vasco",
        awayTeam: "Botafogo",
        homeScore: 1,
        awayScore: 1,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Finalizado",
        league: "Campeonato Carioca",
      },
    ];
  }
}
