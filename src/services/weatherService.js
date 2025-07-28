import axios from "axios";

// You'll need to get a free API key from OpenWeatherMap
const WEATHER_API_KEY =
  process.env.REACT_APP_OPENWEATHER_API_KEY || "YOUR_OPENWEATHER_API_KEY";
const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

export const weatherService = {
  async getCurrentWeather(lat, lon) {
    try {
      const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
        params: {
          lat,
          lon,
          appid: WEATHER_API_KEY,
          units: "metric",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching current weather:", error);
      throw error;
    }
  },

  async getForecast(lat, lon) {
    try {
      const response = await axios.get(`${WEATHER_BASE_URL}/forecast`, {
        params: {
          lat,
          lon,
          appid: WEATHER_API_KEY,
          units: "metric",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching forecast:", error);
      throw error;
    }
  },

  async getOneCallWeather(lat, lon) {
    try {
      const response = await axios.get(`${WEATHER_BASE_URL}/onecall`, {
        params: {
          lat,
          lon,
          appid: WEATHER_API_KEY,
          units: "metric",
          exclude: "minutely,alerts",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching one call weather:", error);
      // Fallback to basic weather if one call fails
      return await this.getCurrentWeather(lat, lon);
    }
  },

  async getWeatherAtTime(lat, lon, minutesFromNow) {
    console.log(
      `🔍 Getting weather for lat: ${lat}, lon: ${lon}, minutes from now: ${minutesFromNow}`
    );

    try {
      // For immediate weather (0-15 minutes), use current weather
      if (minutesFromNow <= 15) {
        console.log("📍 Using current weather for immediate time");
        const currentWeather = await this.getCurrentWeather(lat, lon);
        return {
          ...currentWeather,
          isForecasted: false,
          minutesFromNow,
        };
      }

      // For forecast times, use the 5-day forecast API (most reliable)
      console.log("🔮 Fetching forecast data...");
      const response = await axios.get(`${WEATHER_BASE_URL}/forecast`, {
        params: {
          lat,
          lon,
          appid: WEATHER_API_KEY,
          units: "metric",
        },
      });

      console.log("📊 Forecast API response:", {
        listLength: response.data.list?.length,
        firstItem: response.data.list?.[0],
      });

      if (!response.data.list || response.data.list.length === 0) {
        throw new Error("No forecast data available");
      }

      const targetTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
      const targetTimestamp = Math.floor(targetTime.getTime() / 1000);

      console.log("🎯 Target time:", {
        targetTime: targetTime.toISOString(),
        targetTimestamp,
        minutesFromNow,
      });

      // Find the closest forecast entry (3-hour intervals)
      let closestForecast = response.data.list[0];
      let smallestDiff = Math.abs(response.data.list[0].dt - targetTimestamp);

      for (const forecast of response.data.list) {
        const diff = Math.abs(forecast.dt - targetTimestamp);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestForecast = forecast;
        }
      }

      console.log("✅ Selected forecast:", {
        forecastTime: new Date(closestForecast.dt * 1000).toISOString(),
        temp: closestForecast.main.temp,
        weather: closestForecast.weather[0].description,
        timeDiff: `${smallestDiff / 3600} hours`,
      });

      return {
        ...closestForecast,
        // Normalize the structure to match what our components expect
        temp: closestForecast.main.temp,
        feels_like: closestForecast.main.feels_like,
        humidity: closestForecast.main.humidity,
        pressure: closestForecast.main.pressure,
        wind_speed: closestForecast.wind?.speed || 0,
        wind_deg: closestForecast.wind?.deg || 0,
        visibility: closestForecast.visibility,
        isForecasted: true,
        forecastTime: new Date(closestForecast.dt * 1000).toISOString(),
        minutesFromNow,
      };
    } catch (error) {
      console.error("❌ Error fetching weather at time:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Fallback to current weather
      try {
        const currentWeather = await this.getCurrentWeather(lat, lon);
        return {
          ...currentWeather,
          isForecasted: false,
          minutesFromNow,
        };
      } catch (fallbackError) {
        console.error("❌ Even fallback failed:", fallbackError);
        throw fallbackError;
      }
    }
  },
};

export const getWeatherIcon = (iconCode) => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

export const getWeatherDescription = (weather) => {
  if (!weather) return "No data";

  const main = weather.main || weather.weather?.[0]?.main || "Unknown";
  const description =
    weather.weather?.[0]?.description || weather.description || "";

  return description
    ? description.charAt(0).toUpperCase() + description.slice(1)
    : main;
};
