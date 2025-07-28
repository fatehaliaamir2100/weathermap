import { useQuery } from "react-query";
import { weatherService } from "../services/weatherService";

export function useWeather(lat, lon, enabled = true, minutesFromNow = 0) {
  return useQuery(
    ["weather", lat, lon, minutesFromNow],
    async () => {
      console.log(
        `🔄 useWeather called with lat: ${lat}, lon: ${lon}, minutes: ${minutesFromNow}`
      );

      if (minutesFromNow > 0) {
        const result = await weatherService.getWeatherAtTime(
          lat,
          lon,
          minutesFromNow
        );
        console.log("🎯 Weather result:", result);
        return result;
      } else {
        const result = await weatherService.getOneCallWeather(lat, lon);
        console.log("📍 Current weather result:", result);
        return result;
      }
    },
    {
      enabled: Boolean(
        enabled && lat != null && lon != null && !isNaN(lat) && !isNaN(lon)
      ),
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: 30 * 60 * 1000, // 30 minutes
      retry: 2,
    }
  );
}

export function useWeatherForecast(lat, lon, enabled = true) {
  return useQuery(
    ["forecast", lat, lon],
    () => weatherService.getForecast(lat, lon),
    {
      enabled: Boolean(
        enabled && lat != null && lon != null && !isNaN(lat) && !isNaN(lon)
      ),
      staleTime: 30 * 60 * 1000, // 30 minutes
      refetchInterval: 60 * 60 * 1000, // 1 hour
      retry: 2,
    }
  );
}
