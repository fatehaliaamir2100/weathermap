import React, { useEffect, useRef } from "react";
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

  // Default center (London)
  const defaultCenter = [51.505, -0.09];
  const defaultZoom = 6;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={defaultZoom}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        {/* Map tiles with English labels */}
        {/* Alternative options:
 - CartoDB Positron (light): https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
 - CartoDB Dark Matter: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
 - CartoDB Voyager (current): https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

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

      {/* Map legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <div className="text-sm font-semibold mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-blue-500"></div>
            <span>Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Weather Points</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeatherMap;
