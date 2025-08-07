import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import { useTravel } from "../context/TravelContext";
import { useWeather } from "../hooks/useWeather";
import {
  getWeatherIcon,
  getWeatherDescription,
} from "../services/weatherService";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Weather overlay configuration
const WEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || "YOUR_OPENWEATHER_API_KEY";

const WEATHER_OVERLAYS = {
  clouds: {
    name: "Clouds",
    layer: "clouds_new",
    icon: "☁️",
    description: "Cloud coverage"
  },
  precipitation: {
    name: "Rain/Snow",
    layer: "precipitation_new", 
    icon: "🌧️",
    description: "Precipitation intensity"
  },
  pressure: {
    name: "Pressure",
    layer: "pressure_new",
    icon: "📊", 
    description: "Sea level pressure"
  },
  wind: {
    name: "Wind",
    layer: "wind_new",
    icon: "💨",
    description: "Wind speed and direction"
  },
  temperature: {
    name: "Temperature",
    layer: "temp_new",
    icon: "🌡️",
    description: "Temperature"
  }
};

// Weather overlay toggle component
function WeatherOverlayToggle({ overlayType, isActive, onToggle }) {
  const overlay = WEATHER_OVERLAYS[overlayType];
  
  return (
    <button
      onClick={() => onToggle(overlayType)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
      title={overlay.description}
    >
      <span className="text-base">{overlay.icon}</span>
      <span>{overlay.name}</span>
    </button>
  );
}

// Weather overlay controls panel
function WeatherOverlayControls({ activeOverlays, onToggleOverlay }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-600 overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              Weather Overlays
            </span>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-0' : 'rotate-180'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expandable overlay controls */}
        {isExpanded && (
          <div className="p-3 pt-0 space-y-2 max-w-xs">
            {Object.keys(WEATHER_OVERLAYS).map(overlayType => (
              <WeatherOverlayToggle
                key={overlayType}
                overlayType={overlayType}
                isActive={activeOverlays.includes(overlayType)}
                onToggle={onToggleOverlay}
              />
            ))}
            
            {/* Info text */}
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-600">
              Toggle weather layers on/off. Multiple layers can be active simultaneously.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Weather overlay tile layer component
function WeatherOverlay({ overlayType, opacity = 0.6 }) {
  const overlay = WEATHER_OVERLAYS[overlayType];
  
  if (!overlay || !WEATHER_API_KEY || WEATHER_API_KEY === "YOUR_OPENWEATHER_API_KEY") {
    return null;
  }

  const tileUrl = `https://tile.openweathermap.org/map/${overlay.layer}/{z}/{x}/{y}.png?appid=${WEATHER_API_KEY}`;

  return (
    <TileLayer
      url={tileUrl}
      attribution={`Weather data © <a href="https://openweathermap.org/">OpenWeatherMap</a>`}
      opacity={opacity}
      zIndex={1000}
    />
  );
}

// Custom weather marker icon
const createWeatherIcon = (iconCode, temp) => {
  return L.divIcon({
    html: `
 <div class="weather-marker">
 <div class="weather-icon">
 <img src="${getWeatherIcon(
   iconCode
 )}" alt="weather" style="width: 32px; height: 32px;" />
 </div>
 <div class="weather-temp">${Math.round(temp)}°C</div>
 </div>
 `,
    className: "custom-weather-marker",
    iconSize: [60, 70],
    iconAnchor: [30, 70],
  });
};

// Component to fit map bounds to route
function MapController({ route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.coordinates && route.coordinates.length > 0) {
      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [route, map]);

  return null;
}

// Weather marker component
function WeatherMarker({ point, index }) {
  const lat = point?.coordinates?.[0];
  const lon = point?.coordinates?.[1];
  const estimatedMinutes = Math.round(point?.estimatedTime || 0);

  // Always call the hook, but pass false for enabled if coordinates are invalid
  const coordinatesValid =
    lat != null && lon != null && !isNaN(lat) && !isNaN(lon);
  const {
    data: weather,
    isLoading,
    error,
  } = useWeather(lat, lon, coordinatesValid, estimatedMinutes);

  // Skip rendering if coordinates are invalid
  if (!coordinatesValid) {
    return null;
  }

  if (isLoading || error || !weather) {
    return (
      <Marker position={[lat, lon]}>
        <Popup>
          <div className="p-2">
            <div className="font-semibold text-sm">Segment {index + 1}</div>
            <div className="text-sm text-gray-600">
              {isLoading ? "Loading weather..." : "Weather unavailable"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Distance: {point.distanceFromStart?.toFixed(1)}km
            </div>
            <div className="text-xs text-gray-500">
              ETA: {Math.round(point.estimatedTime || 0)}min
            </div>
          </div>
        </Popup>
      </Marker>
    );
  }

  const temp = weather.temp || weather.current?.temp || weather.main?.temp || 0;
  const iconCode =
    weather.weather?.[0]?.icon || weather.current?.weather?.[0]?.icon || "01d";
  const description = getWeatherDescription(weather);

  const customIcon = createWeatherIcon(iconCode, temp);

  return (
    <Marker position={[lat, lon]} icon={customIcon}>
      <Popup>
        <div className="p-2 min-w-48">
          <div className="font-semibold text-sm mb-2">Segment {index + 1}</div>

          <div className="flex items-center gap-2 mb-2">
            <img
              src={getWeatherIcon(iconCode)}
              alt="weather"
              className="w-8 h-8"
            />
            <div>
              <div className="font-medium">{Math.round(temp)}°C</div>
              <div className="text-sm text-gray-600">{description}</div>
            </div>
          </div>

          {(weather.current || weather.isForecasted) && (
            <div className="text-xs text-gray-600 space-y-1">
              <div>
                Feels like:{" "}
                {Math.round(
                  weather.feels_like ||
                    weather.current?.feels_like ||
                    weather.main?.feels_like ||
                    temp
                )}
                °C
              </div>
              <div>
                Humidity:{" "}
                {weather.humidity ||
                  weather.current?.humidity ||
                  weather.main?.humidity}
                %
              </div>
              <div>
                Wind:{" "}
                {Math.round(
                  (weather.wind_speed ||
                    weather.current?.wind_speed ||
                    weather.wind?.speed ||
                    0) * 3.6
                )}{" "}
                km/h
              </div>
              {(weather.visibility || weather.current?.visibility) && (
                <div>
                  Visibility:{" "}
                  {(
                    (weather.visibility || weather.current?.visibility) / 1000
                  ).toFixed(1)}
                  km
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-2 mt-2 text-xs text-gray-500">
            <div>Distance: {point.distanceFromStart?.toFixed(1)}km</div>
            <div>ETA: {Math.round(point.estimatedTime || 0)}min</div>
            {weather.isForecasted && (
              <div className="text-blue-600 font-medium">
                📅 Forecast for{" "}
                {new Date(
                  Date.now() + estimatedMinutes * 60 * 1000
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            {!weather.isForecasted && estimatedMinutes > 0 && (
              <div className="text-orange-600 text-xs">
                ⚠️ Current weather (forecast unavailable)
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function WeatherMap() {
  const { route, weatherPoints } = useTravel();
  const mapRef = useRef();
  const [activeOverlays, setActiveOverlays] = useState([]);

  // Default center (London)
  const defaultCenter = [51.505, -0.09];
  const defaultZoom = 6;

  const handleToggleOverlay = (overlayType) => {
    setActiveOverlays(prev => {
      if (prev.includes(overlayType)) {
        // Remove overlay
        return prev.filter(type => type !== overlayType);
      } else {
        // Add overlay
        return [...prev, overlayType];
      }
    });
  };

  return (
    <div className="h-full w-full relative">
      {/* Weather overlay controls */}
      <WeatherOverlayControls 
        activeOverlays={activeOverlays}
        onToggleOverlay={handleToggleOverlay}
      />

      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={defaultZoom}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        {/* Base map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Weather overlay layers */}
        {activeOverlays.map(overlayType => (
          <WeatherOverlay 
            key={overlayType} 
            overlayType={overlayType}
            opacity={0.6}
          />
        ))}

        {/* Zoom control positioned in top-right corner */}
        <ZoomControl position="topright" />

        {route && <MapController route={route} />}

        {/* Route polyline */}
        {route && route.coordinates && (
          <Polyline
            positions={route.coordinates}
            color="#3B82F6"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Weather markers */}
        {weatherPoints.map((point, index) => (
          <WeatherMarker key={`weather-${index}`} point={point} index={index} />
        ))}
      </MapContainer>

      {/* Map legend - updated to include overlay info */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg z-10 border dark:border-gray-600">
        <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
          Legend
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-blue-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Weather Points</span>
          </div>
          {activeOverlays.length > 0 && (
            <>
              <div className="border-t dark:border-gray-600 mt-2 pt-2">
                <div className="text-gray-600 dark:text-gray-400 font-medium mb-1">Active Overlays:</div>
                {activeOverlays.map(overlayType => (
                  <div key={overlayType} className="flex items-center gap-2">
                    <span>{WEATHER_OVERLAYS[overlayType].icon}</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {WEATHER_OVERLAYS[overlayType].name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherMap;
