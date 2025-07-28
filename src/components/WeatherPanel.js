import React from 'react';
import { useTravel } from '../context/TravelContext';
import { useWeather } from '../hooks/useWeather';
import { getWeatherIcon, getWeatherDescription } from '../services/weatherService';
import { formatDistance, formatTime } from '../utils/routeUtils';

function WeatherPointCard({ point, index }) {
 const lat = point?.coordinates?.[0];
 const lon = point?.coordinates?.[1];
 const estimatedMinutes = Math.round(point?.estimatedTime || 0);
 
 // Always call the hook, but pass false for enabled if coordinates are invalid
 const coordinatesValid = lat != null && lon != null && !isNaN(lat) && !isNaN(lon);
 const { data: weather, isLoading, error } = useWeather(lat, lon, coordinatesValid, estimatedMinutes);
 
 // Skip rendering if coordinates are invalid
 if (!coordinatesValid) {
 return (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-gray-700">
 Segment {index + 1}
 </span>
 </div>
 <div className="text-sm text-red-600">
 Invalid coordinates
 </div>
 </div>
 );
 }

 if (isLoading) {
 return (
 <div className="bg-gray-50 rounded-lg p-3 animate-pulse">
 <div className="flex items-center justify-between mb-2">
 <div className="h-4 bg-gray-300 rounded w-24"></div>
 <div className="h-4 bg-gray-300 rounded w-16"></div>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-gray-300 rounded"></div>
 <div className="flex-1">
 <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
 <div className="h-3 bg-gray-300 rounded w-32"></div>
 </div>
 </div>
 </div>
 );
 }

 if (error || !weather) {
 return (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-gray-700">
 Segment {index + 1}
 </span>
 <span className="text-xs text-gray-500">
 {formatTime(point.estimatedTime || 0)}
 </span>
 </div>
 <div className="text-sm text-red-600">
 Weather data unavailable
 </div>
 <div className="text-xs text-gray-500 mt-1">
 {point.distanceFromStart?.toFixed(1)}km from start
 </div>
 </div>
 );
 }

 const temp = weather.temp || weather.current?.temp || weather.main?.temp || 0;
 const iconCode = weather.weather?.[0]?.icon || weather.current?.weather?.[0]?.icon || '01d';
 const description = getWeatherDescription(weather);
 const feelsLike = weather.feels_like || weather.current?.feels_like || weather.main?.feels_like;
 const humidity = weather.humidity || weather.current?.humidity || weather.main?.humidity;
 const windSpeed = weather.wind_speed || weather.current?.wind_speed || weather.wind?.speed || 0;

 return (
 <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-gray-700">
 Segment {index + 1}
 </span>
 <span className="text-xs text-gray-500">
 {formatTime(point.estimatedTime || 0)}
 </span>
 </div>
 
 <div className="flex items-center gap-3 mb-2">
 <img 
 src={getWeatherIcon(iconCode)} 
 alt="weather" 
 className="w-12 h-12"
 />
 <div className="flex-1">
 <div className="font-semibold text-lg">
 {Math.round(temp)}°C
 </div>
 <div className="text-sm text-gray-600 capitalize">
 {description}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
 <div>Feels like: {Math.round(feelsLike || temp)}°C</div>
 <div>Humidity: {humidity}%</div>
 <div>Wind: {Math.round(windSpeed * 3.6)} km/h</div>
 <div>Distance: {point.distanceFromStart?.toFixed(1)}km</div>
 </div>

 {(weather.visibility || weather.current?.visibility) && (
 <div className="text-xs text-gray-500 mb-2">
 Visibility: {((weather.visibility || weather.current?.visibility) / 1000).toFixed(1)}km
 </div>
 )}

 {/* Forecast time indicator */}
 <div className="text-xs border-t pt-2">
 {weather.isForecasted ? (
 <div className="text-blue-600 font-medium">
 📅 Forecast for {new Date(Date.now() + estimatedMinutes * 60 * 1000).toLocaleString([], {
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 })}
 </div>
 ) : estimatedMinutes > 0 ? (
 <div className="text-orange-600">
 ⚠️ Current weather (forecast unavailable)
 </div>
 ) : (
 <div className="text-green-600">
 🔄 Current weather
 </div>
 )}
 </div>
 </div>
 );
}

function RouteSummary() {
 const { route } = useTravel();

 if (!route) return null;

 return (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
 <h3 className="font-semibold text-blue-900 mb-2">Route Summary</h3>
 <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
 <div>
 <span className="font-medium">Distance:</span> {formatDistance(route.distance)}
 </div>
 <div>
 <span className="font-medium">Duration:</span> {formatTime(route.duration / 60)}
 </div>
 </div>
 </div>
 );
}

function WeatherPanel() {
 const { weatherPoints, route, isLoading } = useTravel();

 if (isLoading) {
 return (
 <div className="p-4">
 <div className="flex items-center justify-center py-8">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Planning your route...</span>
 </div>
 </div>
 );
 }

 if (!route) {
 return (
 <div className="p-4">
 <div className="text-center py-8">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">No route planned</h3>
 <p className="mt-1 text-sm text-gray-500">
 Enter your origin and destination to see weather forecasts along your route.
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="p-4">
 <div className="mb-4">
 <h2 className="text-lg font-semibold text-gray-800 mb-3">
 Weather Forecast
 </h2>
 
 <RouteSummary />
 
 {weatherPoints.length > 0 && (
 <div className="text-sm text-gray-600 mb-3">
 {weatherPoints.length} weather points along your route
 </div>
 )}
 </div>

 <div className="space-y-3 max-h-96 overflow-y-auto">
 {weatherPoints.map((point, index) => (
 <WeatherPointCard 
 key={`weather-point-${index}`} 
 point={point} 
 index={index}
 />
 ))}
 </div>

 {weatherPoints.length === 0 && route && (
 <div className="text-center py-4">
 <div className="text-sm text-gray-500">
 No weather points generated. Try adjusting your route or settings.
 </div>
 </div>
 )}
 </div>
 );
}

export default WeatherPanel;