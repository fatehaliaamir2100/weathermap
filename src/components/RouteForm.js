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
    setOrigin,
    setDestination,
    setRoute,
    setWeatherPoints,
    setLoading,
    setError,
    setTravelMode,
    setUpdateInterval,
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

  const geocodeMutation = useGeocode();
  const routeMutation = useRoute();
  const saveRouteHistory = useSaveRouteHistory();

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
        averageSpeed
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
    <div className="p-4 border-b border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Origin Input */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => handleOriginChange(e.target.value)}
            placeholder="Enter origin city or address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {originSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectOrigin(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="text-sm">{suggestion.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => handleDestinationChange(e.target.value)}
            placeholder="Enter destination city or address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {destinationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectDestination(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="text-sm">{suggestion.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Travel Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Travel Mode
          </label>
          <select
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="driving-car">Driving</option>
            <option value="cycling-regular">Cycling</option>
            <option value="foot-walking">Walking</option>
          </select>
        </div>

        {/* Update Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weather Update Interval
          </label>
          <select
            value={updateInterval}
            onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every hour</option>
            <option value={120}>Every 2 hours</option>
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !origin || !destination}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Planning Route..." : "Plan Route"}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

export default RouteForm;
