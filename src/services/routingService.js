import axios from "axios";

// Using OpenRouteService - you'll need to get a free API key
const ORS_API_KEY = process.env.REACT_APP_ORS_API_KEY || "YOUR_ORS_API_KEY";
const ORS_BASE_URL = "https://api.openrouteservice.org/v2";

// Fallback to a public routing service (limited requests)
const PUBLIC_ROUTING_URL =
  "https://routing.openstreetmap.de/routed-car/route/v1";

// Profile mapping to ensure valid profiles
const PROFILE_MAPPING = {
  "driving-car": "driving-car",
  "cycling-regular": "cycling-regular",
  "foot-walking": "foot-walking",
  driving: "driving-car",
  cycling: "cycling-regular",
  walking: "foot-walking",
  foot: "foot-walking",
};

export const routingService = {
  async getRoute(start, end, profile = "driving-car") {
    try {
      // Normalize the profile
      const normalizedProfile = PROFILE_MAPPING[profile] || "driving-car";
      console.log("Using profile:", normalizedProfile, "for input:", profile);

      // Try OpenRouteService first
      if (ORS_API_KEY && ORS_API_KEY !== "YOUR_ORS_API_KEY") {
        return await this.getORSRoute(start, end, normalizedProfile);
      }

      // Fallback to public OSRM
      return await this.getOSRMRoute(start, end);
    } catch (error) {
      console.error("Error getting route:", error);
      throw error;
    }
  },

  async getORSRoute(start, end, profile) {
    const response = await axios.post(
      `${ORS_BASE_URL}/directions/${profile}/geojson`,
      {
        coordinates: [
          [start.lng, start.lat],
          [end.lng, end.lat],
        ],
        format: "geojson",
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const feature = response.data.features[0];
    return {
      geometry: feature.geometry,
      distance: feature.properties.segments[0].distance,
      duration: feature.properties.segments[0].duration,
      coordinates: feature.geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]), // [lat, lng]
    };
  },

  async getOSRMRoute(start, end) {
    const response = await axios.get(
      `${PUBLIC_ROUTING_URL}/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
      {
        params: {
          overview: "full",
          geometries: "geojson",
        },
      }
    );

    const route = response.data.routes[0];
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]), // [lat, lng]
    };
  },
};

// Geocoding service for converting addresses to coordinates
export const geocodingService = {
  async geocode(address) {
    try {
      // Using Nominatim (OpenStreetMap's geocoding service) - free and open
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: address,
            format: "json",
            limit: 5,
            addressdetails: 1,
          },
        }
      );

      return response.data.map((result) => ({
        display_name: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        importance: result.importance,
      }));
    } catch (error) {
      console.error("Error geocoding address:", error);
      throw error;
    }
  },
};
