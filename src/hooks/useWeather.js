import { useQuery } from "react-query";
import { weatherService } from "../services/weatherService";

// Enhanced error logging for weather hooks
const logWeatherHookError = (hookName, error, context = {}) => {
  const errorDetails = {
    hook: hookName,
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorStack: error?.stack,
    context,
    userAgent: navigator.userAgent,
    connectionType: navigator.connection?.effectiveType || 'unknown'
  };

  console.error(`❌ Weather hook error in ${hookName}:`, errorDetails);
  return errorDetails;
};

// Enhanced coordinate validation for hooks
const validateWeatherCoordinates = (lat, lon, hookName) => {
  const errors = [];
  
  if (lat === null || lat === undefined) errors.push('Latitude is null or undefined');
  if (lon === null || lon === undefined) errors.push('Longitude is null or undefined');
  if (typeof lat !== 'number') errors.push(`Latitude must be a number, got ${typeof lat}`);
  if (typeof lon !== 'number') errors.push(`Longitude must be a number, got ${typeof lon}`);
  if (isNaN(lat)) errors.push('Latitude is NaN');
  if (isNaN(lon)) errors.push('Longitude is NaN');
  if (lat < -90 || lat > 90) errors.push(`Latitude ${lat} is out of range [-90, 90]`);
  if (lon < -180 || lon > 180) errors.push(`Longitude ${lon} is out of range [-180, 180]`);
  
  return errors;
};

export function useWeather(lat, lon, enabled = true, minutesFromNow = 0) {
  const hookName = 'useWeather';
  
  // Enhanced input validation and logging
  const coordinateErrors = validateWeatherCoordinates(lat, lon, hookName);
  const isValidInput = coordinateErrors.length === 0 && typeof minutesFromNow === 'number' && !isNaN(minutesFromNow) && minutesFromNow >= 0;
  
  // Log hook invocation with detailed context
  const queryKey = ["weather", lat, lon, minutesFromNow];
  
  return useQuery(
    queryKey,
    async () => {
      const operationId = `${hookName}-${Date.now()}`;
      console.log(`🌤️ Starting weather query ${operationId}:`, {
        lat,
        lon,
        minutesFromNow,
        enabled,
        isValidInput,
        coordinateErrors: coordinateErrors.length > 0 ? coordinateErrors : 'none'
      });

      try {
        // Additional validation before making the request
        if (coordinateErrors.length > 0) {
          throw new Error(`Invalid coordinates: ${coordinateErrors.join(', ')}`);
        }

        if (typeof minutesFromNow !== 'number' || isNaN(minutesFromNow) || minutesFromNow < 0) {
          throw new Error(`Invalid minutesFromNow: ${minutesFromNow}. Must be a non-negative number.`);
        }

        let result;
        if (minutesFromNow > 0) {
          console.log(`🔮 Fetching forecast weather for ${operationId}`);
          result = await weatherService.getWeatherAtTime(lat, lon, minutesFromNow);
        } else {
          console.log(`📍 Fetching current weather for ${operationId}`);
          result = await weatherService.getOneCallWeather(lat, lon);
        }

        // Validate result structure
        if (!result) {
          throw new Error('Weather service returned null or undefined result');
        }

        // Log successful result with summary
        console.log(`✅ Weather query ${operationId} completed successfully:`, {
          hasTemp: !!(result.temp || result.main?.temp || result.current?.temp),
          hasWeather: !!(result.weather || result.current?.weather),
          isForecasted: !!result.isForecasted,
          fallbackUsed: !!result.fallbackUsed,
          resultKeys: Object.keys(result).slice(0, 10) // Limit keys for readability
        });

        return result;

      } catch (error) {
        const errorContext = {
          operationId,
          lat,
          lon,
          minutesFromNow,
          enabled,
          coordinateErrors,
          queryKey
        };
        
        logWeatherHookError(hookName, error, errorContext);
        throw error;
      }
    },
    {
      enabled: Boolean(enabled && isValidInput),
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: 30 * 60 * 1000, // 30 minutes
      retry: (failureCount, error) => {
        // Enhanced retry logic with detailed logging
        const shouldRetry = failureCount < 2 && (
          error?.code === 'ECONNABORTED' || // Timeout
          error?.code === 'ENOTFOUND' || // DNS issues
          error?.response?.status >= 500 || // Server errors
          error?.response?.status === 429 // Rate limit
        );

        console.log(`🔄 Weather query retry decision:`, {
          hookName,
          failureCount,
          shouldRetry,
          errorCode: error?.code,
          httpStatus: error?.response?.status,
          errorMessage: error?.message
        });

        return shouldRetry;
      },
      retryDelay: (attemptIndex) => {
        const delay = Math.min(1000 * Math.pow(2, attemptIndex), 10000); // Exponential backoff, max 10s
        console.log(`⏳ Weather query retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
        return delay;
      },
      onError: (error) => {
        logWeatherHookError(`${hookName}-query`, error, {
          lat,
          lon,
          minutesFromNow,
          enabled,
          isValidInput,
          coordinateErrors
        });
      },
      onSuccess: (data) => {
        console.log(`🎉 Weather query successful for ${hookName}:`, {
          lat,
          lon,
          minutesFromNow,
          hasData: !!data,
          dataType: typeof data,
          isForecasted: !!data?.isForecasted
        });
      }
    }
  );
}

export function useWeatherForecast(lat, lon, enabled = true) {
  const hookName = 'useWeatherForecast';
  
  // Enhanced input validation
  const coordinateErrors = validateWeatherCoordinates(lat, lon, hookName);
  const isValidInput = coordinateErrors.length === 0;
  
  return useQuery(
    ["forecast", lat, lon],
    async () => {
      const operationId = `${hookName}-${Date.now()}`;
      console.log(`🔮 Starting forecast query ${operationId}:`, {
        lat,
        lon,
        enabled,
        isValidInput,
        coordinateErrors: coordinateErrors.length > 0 ? coordinateErrors : 'none'
      });

      try {
        // Validation before making the request
        if (coordinateErrors.length > 0) {
          throw new Error(`Invalid coordinates: ${coordinateErrors.join(', ')}`);
        }

        const result = await weatherService.getForecast(lat, lon);

        // Validate result structure
        if (!result) {
          throw new Error('Forecast service returned null or undefined result');
        }

        if (!result.list || !Array.isArray(result.list)) {
          throw new Error('Invalid forecast result: missing or invalid list property');
        }

        console.log(`✅ Forecast query ${operationId} completed successfully:`, {
          forecastCount: result.list.length,
          hasCity: !!result.city,
          firstForecast: result.list[0]?.dt_txt,
          lastForecast: result.list[result.list.length - 1]?.dt_txt
        });

        return result;

      } catch (error) {
        const errorContext = {
          operationId,
          lat,
          lon,
          enabled,
          coordinateErrors
        };
        
        logWeatherHookError(hookName, error, errorContext);
        throw error;
      }
    },
    {
      enabled: Boolean(enabled && isValidInput),
      staleTime: 30 * 60 * 1000, // 30 minutes
      refetchInterval: 60 * 60 * 1000, // 1 hour
      retry: (failureCount, error) => {
        // Enhanced retry logic for forecast
        const shouldRetry = failureCount < 2 && (
          error?.code === 'ECONNABORTED' ||
          error?.code === 'ENOTFOUND' ||
          error?.response?.status >= 500 ||
          error?.response?.status === 429
        );

        console.log(`🔄 Forecast query retry decision:`, {
          hookName,
          failureCount,
          shouldRetry,
          errorCode: error?.code,
          httpStatus: error?.response?.status
        });

        return shouldRetry;
      },
      retryDelay: (attemptIndex) => {
        const delay = Math.min(1000 * Math.pow(2, attemptIndex), 15000); // Exponential backoff, max 15s
        console.log(`⏳ Forecast query retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
        return delay;
      },
      onError: (error) => {
        logWeatherHookError(`${hookName}-query`, error, {
          lat,
          lon,
          enabled,
          isValidInput,
          coordinateErrors
        });
      },
      onSuccess: (data) => {
        console.log(`🎉 Forecast query successful for ${hookName}:`, {
          lat,
          lon,
          forecastCount: data?.list?.length || 0,
          hasValidData: !!(data?.list && Array.isArray(data.list) && data.list.length > 0)
        });
      }
    }
  );
}
