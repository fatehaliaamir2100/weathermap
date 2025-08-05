import React, { useState, useEffect } from 'react';
import { useRouteHistory } from '../hooks/useFavorites';
import { useTravel } from '../context/TravelContext';
import { calculateRouteSegments, getAverageSpeed, formatDistance, formatTime } from '../utils/routeUtils';

function RouteHistory() {
  const [error, setError] = useState(null);
  const [loadingRouteId, setLoadingRouteId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { data: routeHistory, isLoading: historyLoading, error: queryError, refetch } = useRouteHistory();
  
  const {
    updateInterval,
    departureTime,
    setOrigin,
    setDestination,
    setRoute,
    setWeatherPoints,
    setTravelMode
  } = useTravel();

  // Enhanced error logging and monitoring
  useEffect(() => {
    console.log('🏠 RouteHistory component mounted/updated:', {
      timestamp: new Date().toISOString(),
      historyLoading,
      queryError: queryError?.message,
      routeHistoryLength: routeHistory?.length,
      error: error,
      retryCount
    });

    // Log detailed error information if query error exists
    if (queryError) {
      console.error('❌ RouteHistory query error details:', {
        name: queryError.name,
        message: queryError.message,
        stack: queryError.stack,
        cause: queryError.cause,
        timestamp: new Date().toISOString()
      });
    }
  }, [historyLoading, queryError, routeHistory, error, retryCount]);

  const handleLoadHistoryRoute = async (historyRoute) => {
    const operationId = `load-route-${Date.now()}`;
    console.log(`🔄 Starting route load operation ${operationId}:`, {
      routeId: historyRoute.id,
      origin: historyRoute.origin,
      destination: historyRoute.destination,
      travelMode: historyRoute.travelMode
    });

    setLoadingRouteId(historyRoute.id);
    setError(null);

    try {
      // Validate route data before processing
      if (!historyRoute.id) {
        throw new Error('Invalid route: Missing route ID');
      }
      if (!historyRoute.origin || !historyRoute.destination) {
        throw new Error('Invalid route: Missing origin or destination');
      }

      console.log(`📍 Setting route details for ${operationId}:`, {
        origin: historyRoute.origin,
        destination: historyRoute.destination,
        travelMode: historyRoute.travelMode
      });

      // Set the route details
      setOrigin(historyRoute.origin);
      setDestination(historyRoute.destination);
      setTravelMode(historyRoute.travelMode);

      // Reconstruct coordinates from flattened array with enhanced validation
      const reconstructedCoordinates = [];
      if (historyRoute.coordinates && Array.isArray(historyRoute.coordinates) && historyRoute.coordinates.length > 0) {
        console.log(`🗺️ Reconstructing coordinates for ${operationId}:`, {
          flattenedLength: historyRoute.coordinates.length,
          expectedPairs: Math.floor(historyRoute.coordinates.length / 2)
        });

        for (let i = 0; i < historyRoute.coordinates.length; i += 2) {
          if (i + 1 < historyRoute.coordinates.length) {
            const lat = historyRoute.coordinates[i];
            const lng = historyRoute.coordinates[i + 1];
            
            // Validate coordinate values
            if (typeof lat === 'number' && typeof lng === 'number' && 
                !isNaN(lat) && !isNaN(lng) &&
                lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              reconstructedCoordinates.push([lat, lng]);
            } else {
              console.warn(`⚠️ Invalid coordinate pair at index ${i}:`, { lat, lng });
            }
          }
        }

        console.log(`✅ Coordinates reconstructed for ${operationId}:`, {
          originalLength: historyRoute.coordinates.length,
          reconstructedPairs: reconstructedCoordinates.length,
          firstFew: reconstructedCoordinates.slice(0, 3),
          lastFew: reconstructedCoordinates.slice(-3)
        });
      } else {
        console.warn(`⚠️ No valid coordinates found for ${operationId}:`, {
          coordinates: historyRoute.coordinates,
          type: typeof historyRoute.coordinates,
          isArray: Array.isArray(historyRoute.coordinates)
        });
      }

      // Use the saved route data with reconstructed coordinates
      const routeData = {
        coordinates: reconstructedCoordinates,
        distance: historyRoute.distance || 0,
        duration: historyRoute.duration || 0
      };
      
      console.log(`🛣️ Setting route data for ${operationId}:`, {
        coordinatesCount: routeData.coordinates.length,
        distance: routeData.distance,
        duration: routeData.duration
      });

      setRoute(routeData);

      // Reconstruct weather points coordinates with enhanced validation
      let reconstructedWeatherPoints = [];
      if (historyRoute.weatherPoints && Array.isArray(historyRoute.weatherPoints)) {
        console.log(`🌤️ Reconstructing weather points for ${operationId}:`, {
          originalCount: historyRoute.weatherPoints.length
        });

        reconstructedWeatherPoints = historyRoute.weatherPoints.map((point, index) => {
          try {
            const reconstructedPoint = {
              ...point,
              coordinates: point.coordinates && Array.isArray(point.coordinates) && point.coordinates.length >= 2 ? 
                [point.coordinates[0], point.coordinates[1]] : point.coordinates
            };

            // Validate weather point coordinates
            if (reconstructedPoint.coordinates && Array.isArray(reconstructedPoint.coordinates)) {
              const [lat, lng] = reconstructedPoint.coordinates;
              if (typeof lat !== 'number' || typeof lng !== 'number' || 
                  isNaN(lat) || isNaN(lng) ||
                  lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn(`⚠️ Invalid weather point coordinates at index ${index}:`, { lat, lng });
                return null;
              }
            }

            return reconstructedPoint;
          } catch (pointError) {
            console.error(`❌ Error reconstructing weather point ${index}:`, pointError);
            return null;
          }
        }).filter(point => point !== null);

        console.log(`✅ Weather points reconstructed for ${operationId}:`, {
          originalCount: historyRoute.weatherPoints.length,
          reconstructedCount: reconstructedWeatherPoints.length
        });
      }

      // Calculate weather points along the route if we don't have saved weather points or if reconstruction failed
      if (reconstructedWeatherPoints.length > 0) {
        console.log(`📊 Using reconstructed weather points for ${operationId}`);
        setWeatherPoints(reconstructedWeatherPoints);
      } else if (reconstructedCoordinates.length > 0) {
        console.log(`🔄 Calculating new weather points for ${operationId}`);
        try {
          const averageSpeed = getAverageSpeed(historyRoute.travelMode);
          const segments = calculateRouteSegments(
            reconstructedCoordinates,
            updateInterval,
            averageSpeed,
            departureTime
          );
          
          console.log(`✅ New weather points calculated for ${operationId}:`, {
            segmentsCount: segments.length,
            averageSpeed,
            updateInterval
          });
          
          setWeatherPoints(segments);
        } catch (segmentError) {
          console.error(`❌ Error calculating weather segments for ${operationId}:`, segmentError);
          setWeatherPoints([]);
        }
      } else {
        console.warn(`⚠️ No coordinates available for weather calculation in ${operationId}`);
        setWeatherPoints([]);
      }

      console.log(`✅ Route load operation ${operationId} completed successfully`);
      
    } catch (error) {
      const errorDetails = {
        operationId,
        routeId: historyRoute.id,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
        routeData: {
          hasOrigin: !!historyRoute.origin,
          hasDestination: !!historyRoute.destination,
          hasTravelMode: !!historyRoute.travelMode,
          coordinatesLength: historyRoute.coordinates?.length,
          weatherPointsLength: historyRoute.weatherPoints?.length
        }
      };

      console.error(`❌ Error in route load operation ${operationId}:`, errorDetails);
      setError(`Failed to load route from history: ${error.message}`);
      
      // Additional error reporting could be added here (e.g., analytics, monitoring service)
      
    } finally {
      setLoadingRouteId(null);
      console.log(`🏁 Route load operation ${operationId} finished`);
    }
  };

  const handleRetry = async () => {
    console.log('🔄 Retrying route history fetch:', { 
      retryCount: retryCount + 1,
      timestamp: new Date().toISOString()
    });
    
    setRetryCount(prev => prev + 1);
    setError(null);
    
    try {
      await refetch();
      console.log('✅ Route history retry successful');
    } catch (retryError) {
      console.error('❌ Route history retry failed:', retryError);
      setError(`Retry failed: ${retryError.message}`);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) {
        console.warn('⚠️ formatTimestamp called with invalid timestamp:', timestamp);
        return 'Unknown time';
      }

      const date = new Date(timestamp);
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('⚠️ formatTimestamp: Invalid date created from:', timestamp);
        return 'Invalid date';
      }

      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 0) {
        console.warn('⚠️ formatTimestamp: Future timestamp detected:', { timestamp, diffInMinutes });
        return 'Future time';
      }
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      console.error('❌ Error in formatTimestamp:', error, { timestamp });
      return 'Time unavailable';
    }
  };

  // Enhanced error state with retry functionality
  if (queryError && !routeHistory) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Routes</h3>
          <span className="text-xs text-red-500 dark:text-red-400">Error loading</span>
        </div>

        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Unable to load route history
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{queryError.message || 'Unknown error occurred'}</p>
                <p className="text-xs mt-1">Retry count: {retryCount}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  className="bg-red-100 dark:bg-red-800/30 px-3 py-1 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-600">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Routes</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Last 10 searches</span>
          {retryCount > 0 && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
              Retried {retryCount}x
            </span>
          )}
        </div>
      </div>

      {(error || queryError) && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
          <div className="flex items-start">
            <svg className="h-4 w-4 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">{error || queryError?.message || 'Unknown error occurred'}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                Check browser console for detailed error information
              </p>
              {queryError && (
                <button
                  onClick={handleRetry}
                  className="mt-2 text-xs bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800/50"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route History List */}
      {historyLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading route history...</span>
        </div>
      ) : routeHistory && routeHistory.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Found {routeHistory.length} route(s) in history
          </div>
          {routeHistory.map((historyRoute) => {
            const isLoading = loadingRouteId === historyRoute.id;
            return (
              <div
                key={historyRoute.id}
                onClick={() => !isLoading && handleLoadHistoryRoute(historyRoute)}
                className={`p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200 ${
                  isLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-white font-medium break-words">
                      {historyRoute.origin} → {historyRoute.destination}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        🚗 {historyRoute.travelMode === 'driving-car' ? 'Driving' : 
                             historyRoute.travelMode === 'cycling-regular' ? 'Cycling' : 
                             historyRoute.travelMode === 'foot-walking' ? 'Walking' : 
                             historyRoute.travelMode || 'Unknown'}
                      </span>
                      {historyRoute.distance && (
                        <span className="flex items-center">
                          📏 {formatDistance(historyRoute.distance)}
                        </span>
                      )}
                      {historyRoute.duration && (
                        <span className="flex items-center">
                          ⏱️ {formatTime(historyRoute.duration / 60)}
                        </span>
                      )}
                    </div>
                    
                    {isLoading && (
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 dark:border-blue-400 border-t-transparent"></div>
                        Loading route...
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 ml-2 text-right">
                    <div>{formatTimestamp(historyRoute.timestamp)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {historyLoading ? 'Loading...' : 'No route history yet.'}
          </div>
          {!historyLoading && (
            <div className="text-sm text-gray-400 dark:text-gray-500">
              Plan your first route to see it here!
            </div>
          )}
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded">
            Debug info: Loading={historyLoading.toString()}, Error={queryError?.message || 'none'}, Retry={retryCount}
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteHistory;