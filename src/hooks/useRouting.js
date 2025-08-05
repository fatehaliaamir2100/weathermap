import { useMutation } from "react-query";
import { routingService, geocodingService } from "../services/routingService";

// Enhanced error logging for routing hooks
const logRoutingHookError = (hookName, error, context = {}) => {
  const errorDetails = {
    hook: hookName,
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorStack: error?.stack,
    context,
    userAgent: navigator.userAgent,
    connectionType: navigator.connection?.effectiveType || 'unknown',
    onlineStatus: navigator.onLine
  };

  console.error(`❌ Routing hook error in ${hookName}:`, errorDetails);
  return errorDetails;
};

export function useGeocode() {
  const hookName = 'useGeocode';
  
  return useMutation(
    async (address) => {
      const operationId = `${hookName}-${Date.now()}`;
      console.log(`🗺️ Starting geocoding operation ${operationId}:`, {
        address: typeof address === 'string' ? address.substring(0, 50) + '...' : address,
        addressType: typeof address,
        addressLength: address?.length || 0
      });

      try {
        // Input validation
        if (!address) {
          throw new Error('Address is required for geocoding');
        }

        if (typeof address !== 'string') {
          throw new Error(`Address must be a string, got ${typeof address}`);
        }

        if (address.trim().length === 0) {
          throw new Error('Address cannot be empty or only whitespace');
        }

        if (address.length > 500) {
          throw new Error(`Address too long: ${address.length} characters. Maximum 500 characters allowed.`);
        }

        // Sanitize address
        const sanitizedAddress = address.trim();
        
        console.log(`🔍 Geocoding sanitized address for ${operationId}:`, {
          originalLength: address.length,
          sanitizedLength: sanitizedAddress.length,
          preview: sanitizedAddress.substring(0, 100)
        });

        const result = await geocodingService.geocode(sanitizedAddress);

        // Validate result
        if (!result) {
          throw new Error('Geocoding service returned null or undefined result');
        }

        if (!Array.isArray(result)) {
          throw new Error(`Geocoding service returned invalid result type: ${typeof result}`);
        }

        // Validate individual results
        const validResults = result.filter((item, index) => {
          try {
            if (!item || typeof item !== 'object') {
              console.warn(`⚠️ Invalid geocoding result at index ${index}: not an object`);
              return false;
            }

            if (typeof item.lat !== 'number' || isNaN(item.lat)) {
              console.warn(`⚠️ Invalid geocoding result at index ${index}: invalid latitude`);
              return false;
            }

            if (typeof item.lng !== 'number' && typeof item.lon !== 'number') {
              console.warn(`⚠️ Invalid geocoding result at index ${index}: missing longitude`);
              return false;
            }

            const lng = item.lng || item.lon;
            if (typeof lng !== 'number' || isNaN(lng)) {
              console.warn(`⚠️ Invalid geocoding result at index ${index}: invalid longitude`);
              return false;
            }

            if (item.lat < -90 || item.lat > 90) {
              console.warn(`⚠️ Invalid geocoding result at index ${index}: latitude out of range`);
              return false;
            }

            if (lng < -180 || lng > 180) {
              console.warn(`⚠️ Invalid geocoding result at index ${index}: longitude out of range`);
              return false;
            }

            return true;
          } catch (validationError) {
            console.warn(`⚠️ Error validating geocoding result at index ${index}:`, validationError);
            return false;
          }
        });

        console.log(`✅ Geocoding operation ${operationId} completed:`, {
          totalResults: result.length,
          validResults: validResults.length,
          hasResults: validResults.length > 0,
          firstResult: validResults[0] ? {
            lat: validResults[0].lat,
            lng: validResults[0].lng || validResults[0].lon,
            preview: validResults[0].display_name?.substring(0, 50) + '...'
          } : null
        });

        return validResults;

      } catch (error) {
        const errorContext = {
          operationId,
          address: typeof address === 'string' ? address.substring(0, 100) : address,
          addressType: typeof address,
          addressLength: address?.length
        };
        
        logRoutingHookError(hookName, error, errorContext);
        throw error;
      }
    },
    {
      retry: (failureCount, error) => {
        // Enhanced retry logic for geocoding
        const shouldRetry = failureCount < 2 && (
          error?.code === 'ECONNABORTED' || // Timeout
          error?.code === 'ENOTFOUND' || // DNS issues
          error?.code === 'ECONNRESET' || // Connection reset
          error?.response?.status >= 500 || // Server errors
          error?.response?.status === 429 // Rate limit
        );

        console.log(`🔄 Geocoding retry decision:`, {
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
        const delay = Math.min(2000 * Math.pow(2, attemptIndex), 10000); // Exponential backoff, max 10s
        console.log(`⏳ Geocoding retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
        return delay;
      },
      onError: (error, variables) => {
        logRoutingHookError(`${hookName}-mutation`, error, {
          address: typeof variables === 'string' ? variables.substring(0, 100) : variables
        });
      },
      onSuccess: (data, variables) => {
        console.log(`🎉 Geocoding successful for ${hookName}:`, {
          address: typeof variables === 'string' ? variables.substring(0, 50) + '...' : variables,
          resultCount: data?.length || 0,
          hasValidResults: Array.isArray(data) && data.length > 0
        });
      }
    }
  );
}

export function useRoute() {
  const hookName = 'useRoute';
  
  return useMutation(
    async ({ start, end, profile }) => {
      const operationId = `${hookName}-${Date.now()}`;
      console.log(`🛣️ Starting route operation ${operationId}:`, {
        start,
        end,
        profile,
        hasStart: !!start,
        hasEnd: !!end
      });

      try {
        // Input validation
        if (!start || typeof start !== 'object') {
          throw new Error('Start coordinates are required and must be an object');
        }

        if (!end || typeof end !== 'object') {
          throw new Error('End coordinates are required and must be an object');
        }

        // Validate start coordinates
        if (typeof start.lat !== 'number' || isNaN(start.lat)) {
          throw new Error(`Invalid start latitude: ${start.lat}`);
        }
        if ((typeof start.lng !== 'number' && typeof start.lon !== 'number') || 
            isNaN(start.lng || start.lon)) {
          throw new Error(`Invalid start longitude: ${start.lng || start.lon}`);
        }

        // Validate end coordinates
        if (typeof end.lat !== 'number' || isNaN(end.lat)) {
          throw new Error(`Invalid end latitude: ${end.lat}`);
        }
        if ((typeof end.lng !== 'number' && typeof end.lon !== 'number') || 
            isNaN(end.lng || end.lon)) {
          throw new Error(`Invalid end longitude: ${end.lng || end.lon}`);
        }

        // Check coordinate ranges
        if (start.lat < -90 || start.lat > 90) {
          throw new Error(`Start latitude out of range: ${start.lat}`);
        }
        if (end.lat < -90 || end.lat > 90) {
          throw new Error(`End latitude out of range: ${end.lat}`);
        }

        const startLng = start.lng || start.lon;
        const endLng = end.lng || end.lon;
        
        if (startLng < -180 || startLng > 180) {
          throw new Error(`Start longitude out of range: ${startLng}`);
        }
        if (endLng < -180 || endLng > 180) {
          throw new Error(`End longitude out of range: ${endLng}`);
        }

        // Validate profile
        const validProfiles = ['driving-car', 'cycling-regular', 'foot-walking', 'driving', 'cycling', 'walking', 'foot'];
        if (profile && !validProfiles.includes(profile)) {
          console.warn(`⚠️ Invalid profile "${profile}", will be normalized. Valid profiles:`, validProfiles);
        }

        // Check if start and end are too close (might cause routing issues)
        const distance = Math.sqrt(
          Math.pow(end.lat - start.lat, 2) + Math.pow(endLng - startLng, 2)
        );
        
        if (distance < 0.0001) { // Very close coordinates
          console.warn(`⚠️ Start and end coordinates are very close (distance: ${distance})`);
        }

        console.log(`🗺️ Route request validated for ${operationId}:`, {
          startLat: start.lat,
          startLng: startLng,
          endLat: end.lat,
          endLng: endLng,
          profile: profile || 'default',
          coordinateDistance: distance
        });

        const result = await routingService.getRoute(start, end, profile);

        // Validate result structure
        if (!result) {
          throw new Error('Routing service returned null or undefined result');
        }

        if (typeof result !== 'object') {
          throw new Error(`Routing service returned invalid result type: ${typeof result}`);
        }

        // Validate required result fields
        const requiredFields = ['coordinates', 'distance', 'duration'];
        const missingFields = requiredFields.filter(field => 
          result[field] === undefined || result[field] === null
        );
        
        if (missingFields.length > 0) {
          console.warn(`⚠️ Missing fields in route result: ${missingFields.join(', ')}`);
        }

        // Validate coordinates array
        if (!Array.isArray(result.coordinates)) {
          throw new Error('Route result must contain a coordinates array');
        }

        if (result.coordinates.length === 0) {
          throw new Error('Route coordinates array is empty');
        }

        // Validate coordinate structure
        const invalidCoords = result.coordinates.filter((coord, index) => {
          if (!Array.isArray(coord) || coord.length < 2) {
            console.warn(`⚠️ Invalid coordinate at index ${index}:`, coord);
            return true;
          }
          if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
            console.warn(`⚠️ Non-numeric coordinate at index ${index}:`, coord);
            return true;
          }
          if (isNaN(coord[0]) || isNaN(coord[1])) {
            console.warn(`⚠️ NaN coordinate at index ${index}:`, coord);
            return true;
          }
          return false;
        });

        if (invalidCoords.length > 0) {
          console.warn(`⚠️ Found ${invalidCoords.length} invalid coordinates in route result`);
        }

        console.log(`✅ Route operation ${operationId} completed successfully:`, {
          coordinateCount: result.coordinates.length,
          distance: result.distance,
          duration: result.duration,
          hasGeometry: !!result.geometry,
          validCoordinates: result.coordinates.length - invalidCoords.length,
          estimatedTravelTime: result.duration ? `${Math.round(result.duration / 60)} minutes` : 'unknown'
        });

        return result;

      } catch (error) {
        const errorContext = {
          operationId,
          start,
          end,
          profile,
          hasValidStart: !!(start && typeof start === 'object' && typeof start.lat === 'number'),
          hasValidEnd: !!(end && typeof end === 'object' && typeof end.lat === 'number')
        };
        
        logRoutingHookError(hookName, error, errorContext);
        throw error;
      }
    },
    {
      retry: (failureCount, error) => {
        // Enhanced retry logic for routing
        const shouldRetry = failureCount < 1 && ( // Only retry once for routing
          error?.code === 'ECONNABORTED' || // Timeout
          error?.code === 'ENOTFOUND' || // DNS issues
          error?.response?.status >= 500 || // Server errors
          error?.response?.status === 429 // Rate limit
        );

        console.log(`🔄 Route retry decision:`, {
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
        const delay = Math.min(3000 * Math.pow(2, attemptIndex), 15000); // Exponential backoff, max 15s
        console.log(`⏳ Route retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
        return delay;
      },
      onError: (error, variables) => {
        logRoutingHookError(`${hookName}-mutation`, error, {
          start: variables?.start,
          end: variables?.end,
          profile: variables?.profile
        });
      },
      onSuccess: (data, variables) => {
        console.log(`🎉 Route calculation successful for ${hookName}:`, {
          profile: variables?.profile || 'default',
          coordinateCount: data?.coordinates?.length || 0,
          distance: data?.distance,
          duration: data?.duration,
          hasValidResult: !!(data && data.coordinates && Array.isArray(data.coordinates))
        });
      }
    }
  );
}
