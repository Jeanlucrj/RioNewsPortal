import soccerImage from "@assets/generated_images/Soccer_football_default_image_8ae654c4.png";
import basketballImage from "@assets/generated_images/Basketball_default_image_909f7ab5.png";
import volleyballImage from "@assets/generated_images/Volleyball_default_image_f432008c.png";
import f1Image from "@assets/generated_images/Formula_1_racing_image_bfa48f3c.png";
import defaultRioImage from "@assets/generated_images/Rio_de_Janeiro_default_news_image_46fc0fc7.png";

interface SportsKeywords {
  [key: string]: string[];
}

const sportsKeywords: SportsKeywords = {
  soccer: [
    "futebol", "gol", "campeonato", "brasileirão", "libertadores",
    "flamengo", "fluminense", "vasco", "botafogo", "football",
    "premier league", "la liga", "champions", "copa", "fifa",
    "atacante", "zagueiro", "goleiro", "técnico", "estádio",
    "arsenal", "fulham", "manchester", "barcelona", "real madrid"
  ],
  basketball: [
    "basquete", "nba", "basketball", "cesta", "quadra",
    "armador", "pivô", "ala", "lebron", "curry"
  ],
  volleyball: [
    "vôlei", "volei", "volleyball", "saque", "levantador",
    "ponteiro", "líbero", "superliga", "rede"
  ],
  f1: [
    "fórmula 1", "formula 1", "f1", "corrida", "piloto",
    "verstappen", "hamilton", "ferrari", "mercedes", "red bull",
    "gp", "grande prêmio", "pole position", "box", "pit stop"
  ],
};

const sportsImages: { [key: string]: string } = {
  soccer: soccerImage,
  basketball: basketballImage,
  volleyball: volleyballImage,
  f1: f1Image,
};

export function getSportsImage(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();

  for (const [sport, keywords] of Object.entries(sportsKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return sportsImages[sport];
      }
    }
  }

  return null;
}

export function getDefaultImage(category: string, title: string, description: string): string {
  // For sports category, try to detect specific sport
  if (category === "esportes") {
    const sportsImg = getSportsImage(title, description);
    if (sportsImg) return sportsImg;
  }

  // Default Rio image for all other cases
  return defaultRioImage;
}
