import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudRain, Sun, CloudLightning, Snowflake, Wind } from "lucide-react";

interface WeatherData {
  current: {
    temperature_2m: number;
    weathercode: number;
  };
}

function getWeatherIcon(code: number) {
  // WMO Weather interpretation codes
  if (code === 0) return <Sun className="h-4 w-4 text-yellow-400" />;
  if (code <= 3) return <Cloud className="h-4 w-4 text-gray-400" />;
  if (code <= 67) return <CloudRain className="h-4 w-4 text-blue-400" />;
  if (code <= 77) return <Snowflake className="h-4 w-4 text-blue-200" />;
  if (code <= 82) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (code <= 99) return <CloudLightning className="h-4 w-4 text-yellow-500" />;
  return <Wind className="h-4 w-4 text-gray-400" />;
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Ensolarado";
  if (code <= 2) return "Poucas nuvens";
  if (code <= 3) return "Nublado";
  if (code <= 49) return "Neblina";
  if (code <= 67) return "Chuva";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Pancadas";
  if (code <= 99) return "Trovoada";
  return "Variável";
}

export function WeatherWidget() {
  const { data } = useQuery<WeatherData>({
    queryKey: ["weather-rio"],
    queryFn: () =>
      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,weathercode&timezone=America%2FSao_Paulo"
      ).then((r) => r.json()),
    staleTime: 10 * 60 * 1000, // 10 min
    refetchInterval: 10 * 60 * 1000,
  });

  if (!data?.current) return null;

  const { temperature_2m, weathercode } = data.current;
  const temp = Math.round(temperature_2m);

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground px-2"
      title={`Rio de Janeiro — ${getWeatherLabel(weathercode)}`}
    >
      {getWeatherIcon(weathercode)}
      <span className="font-medium tabular-nums">{temp}°C</span>
      <span className="hidden lg:inline text-xs">Rio</span>
    </div>
  );
}
