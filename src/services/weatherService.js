import axios from "axios";

// You'll need to get a free API key from OpenWeatherMap
const WEATHER_API_KEY =
  process.env.REACT_APP_OPENWEATHER_API_KEY || "YOUR_OPENWEATHER_API_KEY";
const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

// Enhanced error logging utility
const logWeatherError = (operation, error, context = {}) => {
  const errorDetails = {
    operation,
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorCode: error?.code,
    httpStatus: error?.response?.status,
    httpStatusText: error?.response?.statusText,
    responseData: error?.response?.data,
    requestConfig: {
      url: error?.config?.url,
      method: error?.config?.method,
      params: error?.config?.params
    },
    context,
    apiKeyValid: WEATHER_API_KEY && WEATHER_API_KEY !== "YOUR_OPENWEATHER_API_KEY",
    apiKeyLength: WEATHER_API_KEY?.length || 0
  };

  console.error(`❌ Weather service error in ${operation}:`, errorDetails);
  return errorDetails;
};

// Enhanced API validation
const validateApiKey = () => {
  if (!WEATHER_API_KEY || WEATHER_API_KEY === "YOUR_OPENWEATHER_API_KEY") {
    const error = new Error("OpenWeatherMap API key is not configured. Please set REACT_APP_OPENWEATHER_API_KEY in your .env file.");
    console.error('🔑 API Key validation failed:', {
      hasKey: !!WEATHER_API_KEY,
      keyValue: WEATHER_API_KEY,
      isDefault: WEATHER_API_KEY === "YOUR_OPENWEATHER_API_KEY"
    });
    throw error;
  }
  
  console.log('✅ Weather API key validation passed:', {
    keyLength: WEATHER_API_KEY.length,
    keyPrefix: WEATHER_API_KEY.substring(0, 8) + '...'
  });
};

// Enhanced coordinate validation
const validateCoordinates = (lat, lon, operation) => {
  const errors = [];
  
  if (lat === null || lat === undefined) errors.push('Latitude is null or undefined');
  if (lon === null || lon === undefined) errors.push('Longitude is null or undefined');
  if (typeof lat !== 'number') errors.push(`Latitude must be a number, got ${typeof lat}`);
  if (typeof lon !== 'number') errors.push(`Longitude must be a number, got ${typeof lon}`);
  if (isNaN(lat)) errors.push('Latitude is NaN');
  if (isNaN(lon)) errors.push('Longitude is NaN');
  if (lat < -90 || lat > 90) errors.push(`Latitude ${lat} is out of range [-90, 90]`);
  if (lon < -180 || lon > 180) errors.push(`Longitude ${lon} is out of range [-180, 180]`);
  
  if (errors.length > 0) {
    const error = new Error(`Invalid coordinates for ${operation}: ${errors.join(', ')}`);
    console.error('📍 Coordinate validation failed:', {
      operation,
      lat,
      lon,
      latType: typeof lat,
      lonType: typeof lon,
      errors
    });
    throw error;
  }
  
  console.log(`✅ Coordinates validated for ${operation}:`, { lat, lon });
};

// Enhanced axios request wrapper with retry logic
const makeWeatherRequest = async (endpoint, params, operation, maxRetries = 2) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🌐 Weather API request attempt ${attempt}/${maxRetries + 1} for ${operation}:`, {
        endpoint,
        params: { ...params, appid: '***hidden***' },
        timestamp: new Date().toISOString()
      });

      const response = await axios.get(`${WEATHER_BASE_URL}/${endpoint}`, {
        params: {
          ...params,
          appid: WEATHER_API_KEY
        },
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'WeatherYourRoute/1.0'
        }
      });

      console.log(`✅ Weather API request successful for ${operation}:`, {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        responseSize: JSON.stringify(response.data || {}).length,
        attempt
      });

      return response;

    } catch (error) {
      lastError = error;
      
      const shouldRetry = attempt <= maxRetries && (
        error.code === 'ECONNABORTED' || // Timeout
        error.code === 'ENOTFOUND' || // DNS issues
        error.code === 'ECONNRESET' || // Connection reset
        (error.response?.status >= 500 && error.response?.status < 600) || // Server errors
        error.response?.status === 429 // Rate limit (though we should respect it)
      );

      logWeatherError(operation, error, { 
        attempt, 
        maxRetries, 
        shouldRetry,
        endpoint,
        params: { ...params, appid: '***hidden***' }
      });

      if (shouldRetry) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⏳ Retrying ${operation} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      break;
    }
  }

  throw lastError;
};

export const weatherService = {
  async getCurrentWeather(lat, lon) {
    const operation = 'getCurrentWeather';
    console.log(`🌤️ Starting ${operation}:`, { lat, lon });

    try {
      validateApiKey();
      validateCoordinates(lat, lon, operation);

      const response = await makeWeatherRequest('weather', {
        lat,
        lon,
        units: "metric",
      }, operation);

      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response data from weather API');
      }

      const requiredFields = ['main', 'weather'];
      const missingFields = requiredFields.filter(field => !response.data[field]);
      if (missingFields.length > 0) {
        console.warn(`⚠️ Missing fields in weather response: ${missingFields.join(', ')}`, response.data);
      }

      console.log(`✅ ${operation} completed successfully:`, {
        temp: response.data.main?.temp,
        weather: response.data.weather?.[0]?.main,
        description: response.data.weather?.[0]?.description
      });

      return response.data;

    } catch (error) {
      logWeatherError(operation, error, { lat, lon });
      throw error;
    }
  },

  async getForecast(lat, lon) {
    const operation = 'getForecast';
    console.log(`🔮 Starting ${operation}:`, { lat, lon });

    try {
      validateApiKey();
      validateCoordinates(lat, lon, operation);

      const response = await makeWeatherRequest('forecast', {
        lat,
        lon,
        units: "metric",
      }, operation);

      // Validate response structure
      if (!response.data || !response.data.list) {
        throw new Error('Invalid forecast response structure');
      }

      if (!Array.isArray(response.data.list)) {
        throw new Error('Forecast list is not an array');
      }

      if (response.data.list.length === 0) {
        console.warn(`⚠️ Empty forecast list received for ${operation}`);
      }

      console.log(`✅ ${operation} completed successfully:`, {
        forecastCount: response.data.list?.length,
        firstForecast: response.data.list?.[0]?.dt_txt,
        lastForecast: response.data.list?.[response.data.list?.length - 1]?.dt_txt
      });

      return response.data;

    } catch (error) {
      logWeatherError(operation, error, { lat, lon });
      throw error;
    }
  },

  async getOneCallWeather(lat, lon) {
    const operation = 'getOneCallWeather';
    console.log(`🌍 Starting ${operation}:`, { lat, lon });

    try {
      validateApiKey();
      validateCoordinates(lat, lon, operation);

      const response = await makeWeatherRequest('onecall', {
        lat,
        lon,
        units: "metric",
        exclude: "minutely,alerts",
      }, operation);

      console.log(`✅ ${operation} completed successfully:`, {
        hasCurrent: !!response.data.current,
        hasHourly: !!response.data.hourly,
        hasDaily: !!response.data.daily,
        hourlyCount: response.data.hourly?.length,
        dailyCount: response.data.daily?.length
      });

      return response.data;

    } catch (error) {
      logWeatherError(operation, error, { lat, lon });
      
      // Enhanced fallback with detailed logging
      console.log(`🔄 OneCall failed, attempting fallback to basic weather for ${operation}`);
      try {
        const fallbackData = await this.getCurrentWeather(lat, lon);
        console.log(`✅ Fallback successful for ${operation}`);
        return fallbackData;
      } catch (fallbackError) {
        logWeatherError(`${operation}-fallback`, fallbackError, { 
          originalError: error.message,
          lat, 
          lon 
        });
        throw fallbackError;
      }
    }
  },

  async getWeatherAtTime(lat, lon, minutesFromNow) {
    const operation = 'getWeatherAtTime';
    console.log(`⏰ Starting ${operation}:`, { lat, lon, minutesFromNow });

    try {
      validateApiKey();
      validateCoordinates(lat, lon, operation);

      // Input validation
      if (typeof minutesFromNow !== 'number' || isNaN(minutesFromNow) || minutesFromNow < 0) {
        throw new Error(`Invalid minutesFromNow value: ${minutesFromNow}. Must be a non-negative number.`);
      }

      // For immediate weather (0-15 minutes), use current weather
      if (minutesFromNow <= 15) {
        console.log(`📍 Using current weather for immediate time (${minutesFromNow} minutes)`);
        try {
          const currentWeather = await this.getCurrentWeather(lat, lon);
          const result = {
            ...currentWeather,
            isForecasted: false,
            minutesFromNow,
          };
          console.log(`✅ Current weather retrieved for ${operation}`);
          return result;
        } catch (currentError) {
          logWeatherError(`${operation}-current`, currentError, { lat, lon, minutesFromNow });
          throw currentError;
        }
      }

      // For forecast times, use the 5-day forecast API (most reliable)
      console.log(`🔮 Fetching forecast data for ${minutesFromNow} minutes from now`);
      const targetTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
      console.log(`🎯 Target forecast time: ${targetTime.toISOString()}`);

      const response = await makeWeatherRequest('forecast', {
        lat,
        lon,
        units: "metric",
      }, operation);

      // Validate and process forecast data
      if (!response.data.list || !Array.isArray(response.data.list) || response.data.list.length === 0) {
        throw new Error('Invalid or empty forecast data received');
      }

      console.log(`📊 Forecast API response for ${operation}:`, {
        listLength: response.data.list.length,
        firstForecast: response.data.list[0]?.dt_txt,
        lastForecast: response.data.list[response.data.list.length - 1]?.dt_txt,
        targetTime: targetTime.toISOString()
      });

      // Find the closest forecast to our target time
      let closestForecast = null;
      let smallestDiff = Infinity;

      for (const forecast of response.data.list) {
        try {
          if (!forecast.dt) {
            console.warn('⚠️ Forecast item missing dt (timestamp):', forecast);
            continue;
          }

          const forecastTime = new Date(forecast.dt * 1000);
          const timeDiff = Math.abs(targetTime - forecastTime);

          if (timeDiff < smallestDiff) {
            smallestDiff = timeDiff;
            closestForecast = forecast;
          }
        } catch (forecastError) {
          console.warn('⚠️ Error processing forecast item:', forecastError, forecast);
        }
      }

      if (!closestForecast) {
        throw new Error('No valid forecast data found for the requested time');
      }

      console.log(`✅ Selected forecast for ${operation}:`, {
        forecastTime: new Date(closestForecast.dt * 1000).toISOString(),
        temp: closestForecast.main?.temp,
        weather: closestForecast.weather?.[0]?.description,
        timeDiff: `${Math.round(smallestDiff / 3600000)} hours`,
        exactDiffMinutes: Math.round(smallestDiff / 60000)
      });

      // Validate forecast structure
      if (!closestForecast.main || !closestForecast.weather?.[0]) {
        console.warn('⚠️ Incomplete forecast data structure:', closestForecast);
      }

      const result = {
        ...closestForecast,
        // Normalize the structure to match what our components expect
        temp: closestForecast.main?.temp || 0,
        feels_like: closestForecast.main?.feels_like || closestForecast.main?.temp || 0,
        humidity: closestForecast.main?.humidity || 0,
        pressure: closestForecast.main?.pressure || 0,
        wind_speed: closestForecast.wind?.speed || 0,
        wind_deg: closestForecast.wind?.deg || 0,
        visibility: closestForecast.visibility || 10000,
        isForecasted: true,
        forecastTime: new Date(closestForecast.dt * 1000).toISOString(),
        minutesFromNow,
        timeDifferenceMinutes: Math.round(smallestDiff / 60000)
      };

      console.log(`✅ ${operation} completed successfully`);
      return result;

    } catch (error) {
      const errorContext = { lat, lon, minutesFromNow, targetTime: new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString() };
      logWeatherError(operation, error, errorContext);

      console.log(`🔄 ${operation} failed, attempting fallback to current weather`);

      // Enhanced fallback to current weather
      try {
        const currentWeather = await this.getCurrentWeather(lat, lon);
        const fallbackResult = {
          ...currentWeather,
          isForecasted: false,
          minutesFromNow,
          fallbackUsed: true,
          originalError: error.message
        };
        
        console.log(`✅ Fallback successful for ${operation}:`, {
          temp: fallbackResult.main?.temp,
          fallbackUsed: true
        });
        
        return fallbackResult;
      } catch (fallbackError) {
        logWeatherError(`${operation}-fallback`, fallbackError, { 
          ...errorContext,
          originalError: error.message 
        });
        console.error(`❌ Even fallback failed for ${operation}:`, fallbackError);
        throw fallbackError;
      }
    }
  },
};

export const getWeatherIcon = (iconCode) => {
  try {
    if (!iconCode || typeof iconCode !== 'string') {
      console.warn('⚠️ Invalid icon code provided to getWeatherIcon:', iconCode);
      return `https://openweathermap.org/img/wn/01d@2x.png`; // Default sunny icon
    }
    
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    console.log('🎨 Generated weather icon URL:', { iconCode, iconUrl });
    return iconUrl;
  } catch (error) {
    console.error('❌ Error generating weather icon URL:', error, { iconCode });
    return `https://openweathermap.org/img/wn/01d@2x.png`;
  }
};

export const getWeatherDescription = (weather) => {
  try {
    if (!weather) {
      console.warn('⚠️ No weather data provided to getWeatherDescription');
      return "No data";
    }

    console.log('📝 Processing weather description for:', {
      hasMain: !!weather.main,
      hasWeatherArray: !!weather.weather,
      hasDescription: !!weather.description,
      weatherType: typeof weather
    });

    const main = weather.main || weather.weather?.[0]?.main || "Unknown";
    const description = weather.weather?.[0]?.description || weather.description || "";

    const result = description
      ? description.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : main;

    console.log('✅ Weather description processed:', { 
      input: { main, description }, 
      output: result 
    });

    return result;
  } catch (error) {
    console.error('❌ Error processing weather description:', error, { weather });
    return "Description unavailable";
  }
};
