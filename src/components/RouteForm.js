import React, { useState, useEffect, useCallback } from "react";
import { useTravel } from "../context/TravelContext";
import { useGeocode, useRoute } from "../hooks/useRouting";
import { useSaveRouteHistory } from "../hooks/useFavorites";
import { calculateRouteSegments, getAverageSpeed } from "../utils/routeUtils";

function RouteForm() {
  const {
    origin,
    destination,
    travelMode,
    updateInterval,
    departureTime,
    setOrigin,
    setDestination,
    setRoute,
    setWeatherPoints,
    setLoading,
    setError,
    setTravelMode,
    setUpdateInterval,
    setDepartureTime,
    clearRoute,
    isLoading,
    error,
  } = useTravel();

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] =
    useState(false);

  // Debounce timers
  const [originSearchTimer, setOriginSearchTimer] = useState(null);
  const [destinationSearchTimer, setDestinationSearchTimer] = useState(null);

  // Current location state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const geocodeMutation = useGeocode();
  const routeMutation = useRoute();
  const saveRouteHistory = useSaveRouteHistory();

  // Function to get current location
  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setIsGettingLocation(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds timeout
      maximumAge: 300000, // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log('📍 Current location obtained:', { latitude, longitude });

          // Reverse geocode to get a readable address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          
          if (!response.ok) {
            throw new Error('Failed to get address for current location');
          }

          const data = await response.json();
          const displayName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setOrigin(displayName);
          setShowOriginSuggestions(false);
          
          console.log('✅ Current location set as origin:', displayName);
        } catch (error) {
          console.error('❌ Error reverse geocoding current location:', error);
          // Fallback to coordinates if reverse geocoding fails
          const coordString = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          setOrigin(coordString);
          setLocationError('Used coordinates as address lookup failed');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        let errorMessage = "Unable to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = "An error occurred while getting your location.";
            break;
        }
        
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      options
    );
  }, [setOrigin]);

  // Debounced search function for origin
  const debouncedOriginSearch = useCallback(
    async (value) => {
      if (value.length > 2) {
        try {
          const suggestions = await geocodeMutation.mutateAsync(value);
          setOriginSuggestions(suggestions.slice(0, 5));
          setShowOriginSuggestions(true);
        } catch (error) {
          console.error("Error geocoding origin:", error);
          setShowOriginSuggestions(false);
        }
      } else {
        setShowOriginSuggestions(false);
      }
    },
    [geocodeMutation]
  );

  // Debounced search function for destination
  const debouncedDestinationSearch = useCallback(
    async (value) => {
      if (value.length > 2) {
        try {
          const suggestions = await geocodeMutation.mutateAsync(value);
          setDestinationSuggestions(suggestions.slice(0, 5));
          setShowDestinationSuggestions(true);
        } catch (error) {
          console.error("Error geocoding destination:", error);
          setShowDestinationSuggestions(false);
        }
      } else {
        setShowDestinationSuggestions(false);
      }
    },
    [geocodeMutation]
  );

  const handleOriginChange = (value) => {
    setOrigin(value);

    // Clear existing timer
    if (originSearchTimer) {
      clearTimeout(originSearchTimer);
    }

    // Set new timer for 2 seconds
    const timer = setTimeout(() => {
      debouncedOriginSearch(value);
    }, 2000);

    setOriginSearchTimer(timer);

    // Hide suggestions immediately if input is too short
    if (value.length <= 2) {
      setShowOriginSuggestions(false);
    }
  };

  const handleDestinationChange = (value) => {
    setDestination(value);

    // Clear existing timer
    if (destinationSearchTimer) {
      clearTimeout(destinationSearchTimer);
    }

    // Set new timer for 2 seconds
    const timer = setTimeout(() => {
      debouncedDestinationSearch(value);
    }, 2000);

    setDestinationSearchTimer(timer);

    // Hide suggestions immediately if input is too short
    if (value.length <= 2) {
      setShowDestinationSuggestions(false);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (originSearchTimer) clearTimeout(originSearchTimer);
      if (destinationSearchTimer) clearTimeout(destinationSearchTimer);
    };
  }, [originSearchTimer, destinationSearchTimer]);

  const selectOrigin = (suggestion) => {
    // Clear any pending search
    if (originSearchTimer) {
      clearTimeout(originSearchTimer);
      setOriginSearchTimer(null);
    }

    setOrigin(suggestion.display_name);
    setShowOriginSuggestions(false);
  };

  const selectDestination = (suggestion) => {
    // Clear any pending search
    if (destinationSearchTimer) {
      clearTimeout(destinationSearchTimer);
      setDestinationSearchTimer(null);
    }

    setDestination(suggestion.display_name);
    setShowDestinationSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!origin || !destination) {
      setError("Please enter both origin and destination");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Geocode both addresses
      const [originResults, destResults] = await Promise.all([
        geocodeMutation.mutateAsync(origin),
        geocodeMutation.mutateAsync(destination),
      ]);

      if (!originResults.length || !destResults.length) {
        throw new Error("Could not find one or both locations");
      }

      const originCoords = {
        lat: originResults[0].lat,
        lng: originResults[0].lng,
      };
      const destCoords = { lat: destResults[0].lat, lng: destResults[0].lng };

      // Get route
      console.log("Getting route with profile:", travelMode);
      const route = await routeMutation.mutateAsync({
        start: originCoords,
        end: destCoords,
        profile: travelMode,
      });

      setRoute(route);

      // Calculate weather points along the route
      const averageSpeed = getAverageSpeed(travelMode);
      const segments = calculateRouteSegments(
        route.coordinates,
        updateInterval,
        averageSpeed,
        departureTime
      );

      setWeatherPoints(segments);

      // Save to route history
      try {
        console.log('💾 Saving route to history:', {
          origin: origin,
          destination: destination,
          distance: route.distance,
          duration: route.duration,
          travelMode,
          coordinatesLength: route.coordinates?.length,
          weatherPointsLength: segments?.length
        });
        
        await saveRouteHistory.mutateAsync({
          origin: origin,
          destination: destination,
          distance: route.distance,
          duration: route.duration,
          travelMode,
          coordinates: route.coordinates,
          weatherPoints: segments,
        });
        
        console.log('✅ Route saved to history successfully');
      } catch (saveError) {
        console.error('❌ Failed to save route to history:', saveError);
        // Don't fail the entire operation if history save fails
      }
    } catch (error) {
      console.error("Error planning route:", error);
      setError(error.message || "Failed to plan route. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearRoute();
    setOrigin("");
    setDestination("");
    setShowOriginSuggestions(false);
    setShowDestinationSuggestions(false);
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Origin Input */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            From
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => handleOriginChange(e.target.value)}
            placeholder="Enter origin city or address"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {originSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectOrigin(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none text-gray-900 dark:text-white"
                >
                  <div className="text-sm">{suggestion.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => handleDestinationChange(e.target.value)}
            placeholder="Enter destination city or address"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {destinationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectDestination(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none text-gray-900 dark:text-white"
                >
                  <div className="text-sm">{suggestion.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Travel Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Travel Mode
          </label>
          <select
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="driving-car">Driving</option>
            <option value="cycling-regular">Cycling</option>
            <option value="foot-walking">Walking</option>
          </select>
        </div>

        {/* Update Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weather Update Interval
          </label>
          <select
            value={updateInterval}
            onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every hour</option>
            <option value={120}>Every 2 hours</option>
          </select>
        </div>

        {/* Departure Time Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Departure Time
          </label>
          <select
            value={departureTime}
            onChange={(e) => setDepartureTime(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value={0}>🚀 Leave now</option>
            <option value={30}>In 30 minutes</option>
            <option value={60}>In 1 hour</option>
            <option value={90}>In 1.5 hours</option>
            <option value={120}>In 2 hours</option>
            <option value={180}>In 3 hours</option>
            <option value={240}>In 4 hours</option>
            <option value={300}>In 5 hours</option>
            <option value={360}>In 6 hours</option>
            <option value={480}>In 8 hours</option>
            <option value={600}>In 10 hours</option>
            <option value={720}>In 12 hours</option>
            <option value={900}>In 15 hours</option>
            <option value={1080}>In 18 hours</option>
            <option value={1200}>In 20 hours</option>
            <option value={1440}>Tomorrow (24 hours)</option>
            <option value={1800}>In 1.5 days (30 hours)</option>
            <option value={2160}>In 1.5 days (36 hours)</option>
            <option value={2880}>In 2 days (48 hours)</option>
            <option value={3600}>In 2.5 days (60 hours)</option>
            <option value={4320}>In 3 days (72 hours)</option>
          </select>
          {departureTime > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md mt-2">
              <span className="text-gray-500 dark:text-gray-400">
                📅 {new Date(Date.now() + departureTime * 60 * 1000).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Location Button */}
        <div>
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isLoading || isGettingLocation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGettingLocation ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4zm16 0a8 8 0 01-8 8v-8h8z"
                  />
                </svg>
                Getting location...
              </>
            ) : (
              <>
                📍 Use Current Location
              </>
            )}
          </button>
          {locationError && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {locationError}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !origin || !destination}
            className="flex-1 bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Planning Route..." : "Plan Route"}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

export default RouteForm;
