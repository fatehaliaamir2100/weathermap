import React, { useState } from 'react';
import { useFavoriteRoutes, useSaveAsFavorite } from '../hooks/useFavorites';
import { useTravel } from '../context/TravelContext';
// import { useRoute } from '../hooks/useRouting';
import { calculateRouteSegments, getAverageSpeed, formatDistance, formatTime } from '../utils/routeUtils';

function FavoriteRoutes() {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState('');
  
  const { data: favorites, isLoading: favoritesLoading } = useFavoriteRoutes();
  const saveAsFavoriteMutation = useSaveAsFavorite();
//   const routeMutation = useRoute();
  
  const {
    route,
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
    setTravelMode
  } = useTravel();

  const handleSaveAsFavorite = async () => {
    if (!route || !origin || !destination) {
      setError('No route to save as favorite');
      return;
    }

    try {
      await saveAsFavoriteMutation.mutateAsync({
        origin,
        destination,
        travelMode,
        name: routeName || `${origin} to ${destination}`,
        distance: route.distance,
        duration: route.duration,
        coordinates: route.coordinates
      });
      
      setShowSaveDialog(false);
      setRouteName('');
    } catch (error) {
      setError('Failed to save favorite route');
    }
  };

  const handleLoadFavorite = async (favorite) => {
    setLoading(true);
    setError(null);

    try {
      // Set the route details
      setOrigin(favorite.origin);
      setDestination(favorite.destination);
      setTravelMode(favorite.travelMode);

      // If we have saved coordinates, use them directly
      if (favorite.coordinates) {
        const routeData = {
          coordinates: favorite.coordinates,
          distance: favorite.distance,
          duration: favorite.duration
        };
        
        setRoute(routeData);

        // Calculate weather points along the route
        const averageSpeed = getAverageSpeed(favorite.travelMode);
        const segments = calculateRouteSegments(
          favorite.coordinates,
          updateInterval,
          averageSpeed
        );

        setWeatherPoints(segments);
      }
    } catch (error) {
      console.error('Error loading favorite route:', error);
      setError('Failed to load favorite route');
    } finally {
      setLoading(false);
    }
  };

  const canSaveRoute = route && origin && destination;

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Favorite Routes</h3>
        {canSaveRoute && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            ⭐ Save Route
          </button>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Save as Favorite</h4>
          <input
            type="text"
            placeholder={`${origin} to ${destination}`}
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveAsFavorite}
              disabled={saveAsFavoriteMutation.isLoading}
              className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            >
              {saveAsFavoriteMutation.isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setRouteName('');
              }}
              className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Favorites List */}
      {favoritesLoading ? (
        <div className="text-sm text-gray-500">Loading favorites...</div>
      ) : favorites && favorites.length > 0 ? (
        <div className="space-y-2">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer border border-gray-200"
              onClick={() => handleLoadFavorite(favorite)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {favorite.name}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {favorite.origin} → {favorite.destination}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>🚗 {favorite.travelMode === 'driving-car' ? 'Driving' : 
                                favorite.travelMode === 'cycling-regular' ? 'Cycling' : 'Walking'}</span>
                    {favorite.distance && (
                      <span>📏 {formatDistance(favorite.distance)}</span>
                    )}
                    {favorite.duration && (
                      <span>⏱️ {formatTime(favorite.duration / 60)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(favorite.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4">
          No favorite routes yet. Plan a route and save it as a favorite!
        </div>
      )}
    </div>
  );
}

export default FavoriteRoutes;