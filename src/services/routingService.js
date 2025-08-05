import axios from "axios";
import { db } from "../config/firebase";
import { collection, addDoc, query, where, getDocs, orderBy, limit, deleteDoc, doc } from "firebase/firestore";

// Using OpenRouteService - you'll need to get a free API key
const ORS_API_KEY = process.env.REACT_APP_ORS_API_KEY || "YOUR_ORS_API_KEY";
const ORS_BASE_URL = "https://api.openrouteservice.org/v2";

// Fallback to a public routing service (limited requests)
const PUBLIC_ROUTING_URL = "https://routing.openstreetmap.de/routed-car/route/v1";

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

// Enhanced error logging utility for routing operations
const logRoutingError = (operation, error, context = {}) => {
  const errorDetails = {
    operation,
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorCode: error?.code,
    httpStatus: error?.response?.status,
    httpStatusText: error?.response?.statusText,
    responseData: error?.response?.data,
    requestConfig: {
      url: error?.config?.url,
      method: error?.config?.method,
      data: error?.config?.data
    },
    context,
    hasOrsKey: ORS_API_KEY && ORS_API_KEY !== "YOUR_ORS_API_KEY",
    orsKeyLength: ORS_API_KEY?.length || 0
  };

  console.error(`❌ Routing service error in ${operation}:`, errorDetails);
  return errorDetails;
};

// Enhanced coordinate validation for routing
const validateRouteCoordinates = (start, end, operation) => {
  const errors = [];
  
  // Validate start coordinates
  if (!start || typeof start !== 'object') errors.push('Start coordinates must be an object');
  else {
    if (typeof start.lat !== 'number' || isNaN(start.lat)) errors.push('Start latitude must be a valid number');
    if (typeof start.lng !== 'number' && typeof start.lon !== 'number') errors.push('Start longitude must be specified as lng or lon');
    const startLng = start.lng || start.lon;
    if (typeof startLng !== 'number' || isNaN(startLng)) errors.push('Start longitude must be a valid number');
    if (start.lat < -90 || start.lat > 90) errors.push(`Start latitude ${start.lat} is out of range [-90, 90]`);
    if (startLng < -180 || startLng > 180) errors.push(`Start longitude ${startLng} is out of range [-180, 180]`);
  }
  
  // Validate end coordinates
  if (!end || typeof end !== 'object') errors.push('End coordinates must be an object');
  else {
    if (typeof end.lat !== 'number' || isNaN(end.lat)) errors.push('End latitude must be a valid number');
    if (typeof end.lng !== 'number' && typeof end.lon !== 'number') errors.push('End longitude must be specified as lng or lon');
    const endLng = end.lng || end.lon;
    if (typeof endLng !== 'number' || isNaN(endLng)) errors.push('End longitude must be a valid number');
    if (end.lat < -90 || end.lat > 90) errors.push(`End latitude ${end.lat} is out of range [-90, 90]`);
    if (endLng < -180 || endLng > 180) errors.push(`End longitude ${endLng} is out of range [-180, 180]`);
  }
  
  if (errors.length > 0) {
    const error = new Error(`Invalid coordinates for ${operation}: ${errors.join(', ')}`);
    console.error('📍 Route coordinate validation failed:', {
      operation,
      start,
      end,
      errors
    });
    throw error;
  }
  
  console.log(`✅ Route coordinates validated for ${operation}:`, { start, end });
};

// Enhanced Firebase operation wrapper
const executeFirebaseOperation = async (operation, firebaseOperation, context = {}) => {
  const operationId = `${operation}-${Date.now()}`;
  console.log(`🔥 Starting Firebase operation ${operationId}:`, context);
  
  try {
    const result = await firebaseOperation();
    console.log(`✅ Firebase operation ${operationId} completed successfully:`, {
      resultType: typeof result,
      hasData: !!result
    });
    return result;
  } catch (error) {
    const errorDetails = {
      operationId,
      operation,
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.error(`❌ Firebase operation ${operationId} failed:`, errorDetails);
    throw error;
  }
};

export const routingService = {
  async getRoute(start, end, profile = "driving-car") {
    const operation = 'getRoute';
    console.log(`🗺️ Starting ${operation}:`, { start, end, profile });

    try {
      validateRouteCoordinates(start, end, operation);
      
      // Normalize the profile
      const normalizedProfile = PROFILE_MAPPING[profile] || "driving-car";
      console.log(`📋 Profile normalized for ${operation}:`, { 
        original: profile, 
        normalized: normalizedProfile,
        availableProfiles: Object.keys(PROFILE_MAPPING)
      });

      // Try OpenRouteService first if API key is available
      if (ORS_API_KEY && ORS_API_KEY !== "YOUR_ORS_API_KEY") {
        console.log(`🎯 Attempting ORS route for ${operation}`);
        try {
          const orsResult = await this.getORSRoute(start, end, normalizedProfile);
          console.log(`✅ ORS route successful for ${operation}`);
          return orsResult;
        } catch (orsError) {
          logRoutingError(`${operation}-ors`, orsError, { start, end, profile: normalizedProfile });
          console.log(`🔄 ORS failed, falling back to OSRM for ${operation}`);
        }
      } else {
        console.log(`⚠️ No valid ORS API key, using OSRM directly for ${operation}:`, {
          hasKey: !!ORS_API_KEY,
          isDefault: ORS_API_KEY === "YOUR_ORS_API_KEY"
        });
      }

      // Fallback to public OSRM
      const osrmResult = await this.getOSRMRoute(start, end);
      console.log(`✅ OSRM route successful for ${operation}`);
      return osrmResult;

    } catch (error) {
      logRoutingError(operation, error, { start, end, profile });
      throw error;
    }
  },

  async getORSRoute(start, end, profile) {
    const operation = 'getORSRoute';
    console.log(`🌍 Starting ${operation}:`, { start, end, profile });

    try {
      validateRouteCoordinates(start, end, operation);

      const requestData = {
        coordinates: [
          [start.lng || start.lon, start.lat],
          [end.lng || end.lon, end.lat],
        ],
        format: "geojson",
      };

      console.log(`📤 ORS request for ${operation}:`, {
        url: `${ORS_BASE_URL}/directions/${profile}/geojson`,
        coordinates: requestData.coordinates,
        hasAuth: !!ORS_API_KEY
      });

      const response = await axios.post(
        `${ORS_BASE_URL}/directions/${profile}/geojson`,
        requestData,
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 15000 // 15 second timeout
        }
      );

      // Validate response structure
      if (!response.data || !response.data.features || !Array.isArray(response.data.features)) {
        throw new Error('Invalid ORS response structure: missing features array');
      }

      if (response.data.features.length === 0) {
        throw new Error('No route features returned from ORS');
      }

      const feature = response.data.features[0];
      
      if (!feature.geometry || !feature.properties) {
        throw new Error('Invalid ORS feature structure: missing geometry or properties');
      }

      if (!feature.properties.segments || !Array.isArray(feature.properties.segments) || feature.properties.segments.length === 0) {
        throw new Error('Invalid ORS response: missing route segments');
      }

      const segment = feature.properties.segments[0];
      
      // Validate and process coordinates
      if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
        throw new Error('Invalid ORS response: missing or invalid coordinates');
      }

      const coordinates = feature.geometry.coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) {
          console.warn(`⚠️ Invalid coordinate at index ${index}:`, coord);
          return null;
        }
        return [coord[1], coord[0]]; // Convert [lng, lat] to [lat, lng]
      }).filter(coord => coord !== null);

      const result = {
        geometry: feature.geometry,
        distance: segment.distance || 0,
        duration: segment.duration || 0,
        coordinates: coordinates
      };

      console.log(`✅ ${operation} completed successfully:`, {
        coordinateCount: result.coordinates.length,
        distance: result.distance,
        duration: result.duration,
        hasGeometry: !!result.geometry
      });

      return result;

    } catch (error) {
      logRoutingError(operation, error, { start, end, profile });
      throw error;
    }
  },

  async getOSRMRoute(start, end) {
    const operation = 'getOSRMRoute';
    console.log(`🚗 Starting ${operation}:`, { start, end });

    try {
      validateRouteCoordinates(start, end, operation);

      const startLng = start.lng || start.lon;
      const endLng = end.lng || end.lon;
      const routeUrl = `${PUBLIC_ROUTING_URL}/driving/${startLng},${start.lat};${endLng},${end.lat}`;

      console.log(`📤 OSRM request for ${operation}:`, { url: routeUrl });

      const response = await axios.get(routeUrl, {
        params: {
          overview: "full",
          geometries: "geojson",
        },
        timeout: 15000 // 15 second timeout
      });

      // Validate response structure
      if (!response.data || !response.data.routes || !Array.isArray(response.data.routes)) {
        throw new Error('Invalid OSRM response structure: missing routes array');
      }

      if (response.data.routes.length === 0) {
        throw new Error('No routes returned from OSRM');
      }

      const route = response.data.routes[0];
      
      if (!route.geometry || !route.distance !== undefined || !route.duration !== undefined) {
        throw new Error('Invalid OSRM route structure: missing required fields');
      }

      // Validate and process coordinates
      if (!route.geometry.coordinates || !Array.isArray(route.geometry.coordinates)) {
        throw new Error('Invalid OSRM response: missing or invalid coordinates');
      }

      const coordinates = route.geometry.coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) {
          console.warn(`⚠️ Invalid coordinate at index ${index}:`, coord);
          return null;
        }
        return [coord[1], coord[0]]; // Convert [lng, lat] to [lat, lng]
      }).filter(coord => coord !== null);

      const result = {
        geometry: route.geometry,
        distance: route.distance || 0,
        duration: route.duration || 0,
        coordinates: coordinates
      };

      console.log(`✅ ${operation} completed successfully:`, {
        coordinateCount: result.coordinates.length,
        distance: result.distance,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logRoutingError(operation, error, { start, end });
      throw error;
    }
  },

  async saveRouteHistory(userId, routeData) {
    const operation = 'saveRouteHistory';
    console.log(`💾 Starting ${operation}:`, { 
      userId, 
      hasRouteData: !!routeData,
      origin: routeData?.origin,
      destination: routeData?.destination
    });

    try {
      if (!userId) {
        throw new Error('User ID is required for saving route history');
      }

      if (!routeData) {
        throw new Error('Route data is required for saving route history');
      }

      // Validate required route data fields
      const requiredFields = ['origin', 'destination'];
      const missingFields = requiredFields.filter(field => !routeData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required route data fields: ${missingFields.join(', ')}`);
      }

      // Prepare route history document with enhanced validation
      const routeHistory = {
        userId,
        origin: routeData.origin,
        destination: routeData.destination,
        distance: routeData.distance || 0,
        duration: routeData.duration || 0,
        travelMode: routeData.travelMode || 'driving-car',
        // Flatten coordinates to avoid nested arrays
        coordinates: routeData.coordinates ? routeData.coordinates.flat() : [],
        // Flatten weather points coordinates as well
        weatherPoints: routeData.weatherPoints ? routeData.weatherPoints.map((point, index) => {
          try {
            return {
              ...point,
              coordinates: point.coordinates ? point.coordinates.flat() : []
            };
          } catch (pointError) {
            console.warn(`⚠️ Error processing weather point ${index}:`, pointError);
            return null;
          }
        }).filter(point => point !== null) : [],
        timestamp: new Date().toISOString(),
      };

      console.log(`📊 Processed route data for ${operation}:`, {
        coordinatesLength: routeHistory.coordinates.length,
        weatherPointsCount: routeHistory.weatherPoints.length,
        sampleCoordinates: routeHistory.coordinates.slice(0, 4),
        hasValidData: routeHistory.coordinates.length > 0
      });

      const docRef = await executeFirebaseOperation(
        operation,
        () => addDoc(collection(db, 'routeHistory'), routeHistory),
        { userId, routeDataKeys: Object.keys(routeData) }
      );

      console.log(`✅ Route saved to history with ID: ${docRef.id}`);

      // Clean up old routes - keep only the 10 most recent
      try {
        await this.cleanupOldRoutes(userId);
        console.log(`🧹 Cleanup completed for ${operation}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Cleanup failed for ${operation}:`, cleanupError);
        // Don't fail the entire operation if cleanup fails
      }
      
      return docRef.id;

    } catch (error) {
      logRoutingError(operation, error, { userId, routeDataKeys: Object.keys(routeData || {}) });
      throw error;
    }
  },

  async cleanupOldRoutes(userId) {
    const operation = 'cleanupOldRoutes';
    console.log(`🧹 Starting ${operation}:`, { userId });

    try {
      if (!userId) {
        throw new Error('User ID is required for cleanup operation');
      }

      const queryOperation = () => {
        // Get all routes for this user, ordered by timestamp descending
        const q = query(
          collection(db, 'routeHistory'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        );
        return getDocs(q);
      };

      const querySnapshot = await executeFirebaseOperation(
        `${operation}-query`,
        queryOperation,
        { userId }
      );

      const allRoutes = querySnapshot.docs;
      console.log(`📊 Found ${allRoutes.length} routes for cleanup evaluation`);

      // If we have more than 10 routes, delete the oldest ones
      if (allRoutes.length > 10) {
        const routesToDelete = allRoutes.slice(10); // Get routes beyond the first 10
        
        console.log(`🗑️ Deleting ${routesToDelete.length} old routes`);
        
        // Delete old routes with individual error handling
        const deleteResults = await Promise.allSettled(
          routesToDelete.map(async (routeDoc, index) => {
            try {
              await deleteDoc(doc(db, 'routeHistory', routeDoc.id));
              console.log(`✅ Deleted route ${index + 1}/${routesToDelete.length}: ${routeDoc.id}`);
              return { success: true, id: routeDoc.id };
            } catch (deleteError) {
              console.error(`❌ Failed to delete route ${routeDoc.id}:`, deleteError);
              return { success: false, id: routeDoc.id, error: deleteError.message };
            }
          })
        );

        const successfulDeletes = deleteResults.filter(result => result.value?.success).length;
        const failedDeletes = deleteResults.filter(result => !result.value?.success).length;

        console.log(`📈 Cleanup summary for ${operation}:`, {
          totalRoutesToDelete: routesToDelete.length,
          successfulDeletes,
          failedDeletes,
          userId
        });

        if (failedDeletes > 0) {
          console.warn(`⚠️ Some deletions failed in ${operation}: ${failedDeletes}/${routesToDelete.length}`);
        }
      } else {
        console.log(`✅ No cleanup needed for ${operation}: only ${allRoutes.length} routes found`);
      }

    } catch (error) {
      logRoutingError(operation, error, { userId });
      // Don't throw error here as this is cleanup - the main save operation succeeded
      console.warn(`⚠️ ${operation} completed with errors, but continuing...`);
    }
  },

  async getUserRouteHistory(userId) {
    try {
      console.log('🔍 Attempting to fetch route history with orderBy for user:', userId);
      
      // First try with orderBy (requires Firestore index)
      let q = query(
        collection(db, 'routeHistory'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
        console.log('✅ Route history fetched with orderBy, count:', querySnapshot.size);
      } catch (orderError) {
        console.warn('⚠️ OrderBy query failed, trying without orderBy:', orderError.message);
        
        // Fallback: query without orderBy
        q = query(
          collection(db, 'routeHistory'),
          where('userId', '==', userId),
          limit(10)
        );
        
        querySnapshot = await getDocs(q);
        console.log('✅ Route history fetched without orderBy, count:', querySnapshot.size);
      }

      const routes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort client-side if we couldn't use orderBy
      const sortedRoutes = routes.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA; // Descending order (newest first)
      });

      console.log('📊 Sorted route history:', sortedRoutes.map(r => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        timestamp: r.timestamp
      })));

      return sortedRoutes.slice(0, 10); // Ensure we only return 10 routes
    } catch (error) {
      console.error('❌ Error fetching route history:', error);
      throw error;
    }
  },

  async getFavoriteRoutes(userId) {
    try {
      const q = query(
        collection(db, 'favoriteRoutes'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching favorite routes:', error);
      throw error;
    }
  },

  async saveAsFavorite(userId, routeData) {
    try {
      const favoriteRoute = {
        userId,
        origin: routeData.origin,
        destination: routeData.destination,
        travelMode: routeData.travelMode,
        name: routeData.name || `${routeData.origin} to ${routeData.destination}`,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'favoriteRoutes'), favoriteRoute);
      return docRef.id;
    } catch (error) {
      console.error('Error saving favorite route:', error);
      throw error;
    }
  },

  async deleteRouteHistory(routeId) {
    try {
      await deleteDoc(doc(db, 'routeHistory', routeId));
    } catch (error) {
      console.error('Error deleting route history:', error);
      throw error;
    }
  },

  async deleteFavoriteRoute(routeId) {
    try {
      await deleteDoc(doc(db, 'favoriteRoutes', routeId));
    } catch (error) {
      console.error('Error deleting favorite route:', error);
      throw error;
    }
  }
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
