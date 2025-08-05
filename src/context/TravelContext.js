import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// Theme Context
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply theme to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const value = {
    isDarkMode,
    toggleTheme,
    theme: isDarkMode ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

const TravelContext = createContext();

// Enhanced error logging for context operations
const logContextError = (operation, error, context = {}) => {
  const errorDetails = {
    operation,
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorStack: error?.stack,
    context,
    componentStack: error?.componentStack
  };

  console.error(`❌ TravelContext error in ${operation}:`, errorDetails);
  return errorDetails;
};

// Enhanced state validation utilities
const validateState = (stateName, value, expectedType) => {
  const errors = [];
  
  if (expectedType === 'string' && typeof value !== 'string') {
    errors.push(`${stateName} must be a string, got ${typeof value}`);
  }
  
  if (expectedType === 'number' && (typeof value !== 'number' || isNaN(value))) {
    errors.push(`${stateName} must be a valid number, got ${value} (${typeof value})`);
  }
  
  if (expectedType === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${stateName} must be a boolean, got ${typeof value}`);
  }
  
  if (expectedType === 'array' && !Array.isArray(value)) {
    errors.push(`${stateName} must be an array, got ${typeof value}`);
  }
  
  if (expectedType === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) {
    errors.push(`${stateName} must be an object, got ${typeof value}`);
  }
  
  return errors;
};

export function TravelProvider({ children }) {
  // Enhanced state management with validation
  const [origin, setOriginState] = useState("");
  const [destination, setDestinationState] = useState("");
  const [route, setRouteState] = useState(null);
  const [weatherPoints, setWeatherPointsState] = useState([]);
  const [travelMode, setTravelModeState] = useState("driving-car");
  const [updateInterval, setUpdateIntervalState] = useState(30);
  const [isLoading, setIsLoadingState] = useState(false);
  const [error, setErrorState] = useState(null);
  // Add departure time state (in minutes from now, max 3 days = 4320 minutes)
  const [departureTime, setDepartureTimeState] = useState(0);

  // Enhanced logging for state changes
  useEffect(() => {
    console.log('🏠 TravelContext state updated:', {
      timestamp: new Date().toISOString(),
      origin: origin ? origin.substring(0, 50) + '...' : 'empty',
      destination: destination ? destination.substring(0, 50) + '...' : 'empty',
      hasRoute: !!route,
      routeCoordinatesCount: route?.coordinates?.length || 0,
      weatherPointsCount: weatherPoints?.length || 0,
      travelMode,
      updateInterval,
      isLoading,
      hasError: !!error,
      departureTime
    });
  }, [origin, destination, route, weatherPoints, travelMode, updateInterval, isLoading, error, departureTime]);

  // Enhanced setter functions with validation
  const setOrigin = useCallback((newOrigin) => {
    const operation = 'setOrigin';
    try {
      console.log(`📍 ${operation} called:`, { newOrigin: typeof newOrigin === 'string' ? newOrigin.substring(0, 100) : newOrigin });
      
      const errors = validateState('origin', newOrigin, 'string');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      setOriginState(newOrigin || "");
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newOrigin });
      setErrorState(`Failed to set origin: ${error.message}`);
    }
  }, []);

  const setDestination = useCallback((newDestination) => {
    const operation = 'setDestination';
    try {
      console.log(`🎯 ${operation} called:`, { newDestination: typeof newDestination === 'string' ? newDestination.substring(0, 100) : newDestination });
      
      const errors = validateState('destination', newDestination, 'string');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      setDestinationState(newDestination || "");
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newDestination });
      setErrorState(`Failed to set destination: ${error.message}`);
    }
  }, []);

  const setRoute = useCallback((newRoute) => {
    const operation = 'setRoute';
    try {
      console.log(`🛣️ ${operation} called:`, { 
        hasRoute: !!newRoute,
        routeType: typeof newRoute,
        coordinatesCount: newRoute?.coordinates?.length || 0,
        distance: newRoute?.distance,
        duration: newRoute?.duration
      });
      
      if (newRoute !== null) {
        const errors = validateState('route', newRoute, 'object');
        if (errors.length > 0) {
          console.warn(`⚠️ ${operation} validation warnings:`, errors);
        }
        
        // Validate route structure
        if (newRoute && typeof newRoute === 'object') {
          if (!newRoute.coordinates || !Array.isArray(newRoute.coordinates)) {
            console.warn(`⚠️ ${operation}: Route missing valid coordinates array`);
          } else if (newRoute.coordinates.length === 0) {
            console.warn(`⚠️ ${operation}: Route coordinates array is empty`);
          }
          
          if (typeof newRoute.distance !== 'number' || newRoute.distance < 0) {
            console.warn(`⚠️ ${operation}: Invalid route distance:`, newRoute.distance);
          }
          
          if (typeof newRoute.duration !== 'number' || newRoute.duration < 0) {
            console.warn(`⚠️ ${operation}: Invalid route duration:`, newRoute.duration);
          }
        }
      }
      
      setRouteState(newRoute);
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { 
        hasRoute: !!newRoute,
        routeKeys: newRoute ? Object.keys(newRoute) : []
      });
      setErrorState(`Failed to set route: ${error.message}`);
    }
  }, []);

  const setWeatherPoints = useCallback((newWeatherPoints) => {
    const operation = 'setWeatherPoints';
    try {
      console.log(`🌤️ ${operation} called:`, { 
        pointsCount: newWeatherPoints?.length || 0,
        pointsType: typeof newWeatherPoints,
        isArray: Array.isArray(newWeatherPoints)
      });
      
      const errors = validateState('weatherPoints', newWeatherPoints, 'array');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      // Validate weather points structure
      if (Array.isArray(newWeatherPoints)) {
        const invalidPoints = newWeatherPoints.filter((point, index) => {
          if (!point || typeof point !== 'object') {
            console.warn(`⚠️ ${operation}: Invalid weather point at index ${index} - not an object`);
            return true;
          }
          
          if (!point.coordinates || !Array.isArray(point.coordinates) || point.coordinates.length < 2) {
            console.warn(`⚠️ ${operation}: Invalid weather point coordinates at index ${index}:`, point.coordinates);
            return true;
          }
          
          const [lat, lng] = point.coordinates;
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
            console.warn(`⚠️ ${operation}: Invalid weather point coordinate values at index ${index}:`, { lat, lng });
            return true;
          }
          
          return false;
        });
        
        if (invalidPoints.length > 0) {
          console.warn(`⚠️ ${operation}: Found ${invalidPoints.length} invalid weather points`);
        }
      }
      
      setWeatherPointsState(newWeatherPoints || []);
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { 
        pointsCount: newWeatherPoints?.length,
        isArray: Array.isArray(newWeatherPoints)
      });
      setErrorState(`Failed to set weather points: ${error.message}`);
    }
  }, []);

  const setTravelMode = useCallback((newTravelMode) => {
    const operation = 'setTravelMode';
    try {
      console.log(`🚗 ${operation} called:`, { newTravelMode });
      
      const validModes = ["driving-car", "cycling-regular", "foot-walking"];
      if (newTravelMode && !validModes.includes(newTravelMode)) {
        console.warn(`⚠️ ${operation}: Invalid travel mode "${newTravelMode}". Valid modes:`, validModes);
      }
      
      const errors = validateState('travelMode', newTravelMode, 'string');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      setTravelModeState(newTravelMode || "driving-car");
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newTravelMode });
      setErrorState(`Failed to set travel mode: ${error.message}`);
    }
  }, []);

  const setUpdateInterval = useCallback((newInterval) => {
    const operation = 'setUpdateInterval';
    try {
      console.log(`⏱️ ${operation} called:`, { newInterval });
      
      const validIntervals = [5, 10, 15, 30, 60, 120];
      if (typeof newInterval === 'number' && !validIntervals.includes(newInterval)) {
        console.warn(`⚠️ ${operation}: Unusual update interval "${newInterval}". Common intervals:`, validIntervals);
      }
      
      const errors = validateState('updateInterval', newInterval, 'number');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      if (typeof newInterval === 'number' && newInterval <= 0) {
        console.warn(`⚠️ ${operation}: Update interval must be positive, got:`, newInterval);
      }
      
      setUpdateIntervalState(newInterval || 30);
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newInterval });
      setErrorState(`Failed to set update interval: ${error.message}`);
    }
  }, []);

  const setDepartureTime = useCallback((newDepartureTime) => {
    const operation = 'setDepartureTime';
    try {
      console.log(`🕐 ${operation} called:`, { newDepartureTime });
      
      const errors = validateState('departureTime', newDepartureTime, 'number');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      // Validate departure time is within limits (0 to 3 days = 4320 minutes)
      if (typeof newDepartureTime === 'number') {
        if (newDepartureTime < 0) {
          console.warn(`⚠️ ${operation}: Departure time cannot be negative, got:`, newDepartureTime);
        } else if (newDepartureTime > 4320) {
          console.warn(`⚠️ ${operation}: Departure time exceeds 3-day limit, got:`, newDepartureTime);
        }
      }
      
      setDepartureTimeState(Math.max(0, Math.min(newDepartureTime || 0, 4320)));
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newDepartureTime });
      setErrorState(`Failed to set departure time: ${error.message}`);
    }
  }, []);

  const setLoading = useCallback((newLoading) => {
    const operation = 'setLoading';
    try {
      console.log(`⏳ ${operation} called:`, { newLoading, currentLoading: isLoading });
      
      const errors = validateState('isLoading', newLoading, 'boolean');
      if (errors.length > 0) {
        console.warn(`⚠️ ${operation} validation warnings:`, errors);
      }
      
      setIsLoadingState(Boolean(newLoading));
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newLoading });
      // Don't set error state for loading errors to avoid infinite loops
      console.error(`Failed to set loading state: ${error.message}`);
    }
  }, [isLoading]);

  const setError = useCallback((newError) => {
    const operation = 'setError';
    try {
      console.log(`❌ ${operation} called:`, { 
        newError: typeof newError === 'string' ? newError.substring(0, 200) : newError,
        errorType: typeof newError,
        hasCurrentError: !!error
      });
      
      // Clear any existing error first if setting null/undefined
      if (!newError) {
        setErrorState(null);
        console.log(`✅ ${operation} - error cleared`);
        return;
      }
      
      // Convert error objects to strings
      let errorString;
      if (newError instanceof Error) {
        errorString = newError.message;
        console.log(`🔄 ${operation} - converted Error object to string:`, errorString);
      } else if (typeof newError === 'string') {
        errorString = newError;
      } else {
        errorString = String(newError);
        console.warn(`⚠️ ${operation} - converted non-string error to string:`, errorString);
      }
      
      setErrorState(errorString);
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, { newError });
      // Don't set error state for error setting errors to avoid infinite loops
      console.error(`Failed to set error: ${error.message}`);
    }
  }, [error]);

  const clearRoute = useCallback(() => {
    const operation = 'clearRoute';
    try {
      console.log(`🧹 ${operation} called - clearing all route data`);
      
      setRouteState(null);
      setWeatherPointsState([]);
      setErrorState(null);
      
      console.log(`✅ ${operation} completed successfully`);
    } catch (error) {
      logContextError(operation, error, {});
      setErrorState(`Failed to clear route: ${error.message}`);
    }
  }, []);

  // Enhanced context value with error boundaries
  const contextValue = {
    // State
    origin,
    destination,
    route,
    weatherPoints,
    travelMode,
    updateInterval,
    isLoading,
    error,
    departureTime,
    
    // Actions
    setOrigin,
    setDestination,
    setRoute,
    setWeatherPoints,
    setTravelMode,
    setUpdateInterval,
    setDepartureTime,
    setLoading,
    setError,
    clearRoute,
    
    // Computed values with error handling
    hasValidRoute: (() => {
      try {
        return !!(route && route.coordinates && Array.isArray(route.coordinates) && route.coordinates.length > 0);
      } catch (error) {
        console.warn('⚠️ Error computing hasValidRoute:', error);
        return false;
      }
    })(),
    
    hasValidWeatherPoints: (() => {
      try {
        return !!(weatherPoints && Array.isArray(weatherPoints) && weatherPoints.length > 0);
      } catch (error) {
        console.warn('⚠️ Error computing hasValidWeatherPoints:', error);
        return false;
      }
    })(),
    
    routeDistance: (() => {
      try {
        return route?.distance || 0;
      } catch (error) {
        console.warn('⚠️ Error computing routeDistance:', error);
        return 0;
      }
    })(),
    
    routeDuration: (() => {
      try {
        return route?.duration || 0;
      } catch (error) {
        console.warn('⚠️ Error computing routeDuration:', error);
        return 0;
      }
    })()
  };

  // Log context value creation
  console.log('🏗️ TravelContext value created:', {
    timestamp: new Date().toISOString(),
    hasOrigin: !!origin,
    hasDestination: !!destination,
    hasRoute: !!route,
    weatherPointsCount: weatherPoints?.length || 0,
    travelMode,
    updateInterval,
    isLoading,
    hasError: !!error
  });

  return (
    <TravelContext.Provider value={contextValue}>
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const operation = 'useTravel';
  try {
    const context = useContext(TravelContext);
    
    if (!context) {
      const error = new Error("useTravel must be used within a TravelProvider");
      logContextError(operation, error, { 
        hasContext: !!context,
        callerStack: new Error().stack 
      });
      throw error;
    }
    
    // Validate context structure
    const requiredKeys = [
      'origin', 'destination', 'route', 'weatherPoints', 'travelMode', 
      'updateInterval', 'isLoading', 'error', 'setOrigin', 'setDestination', 
      'setRoute', 'setWeatherPoints', 'setTravelMode', 'setUpdateInterval', 
      'setLoading', 'setError', 'clearRoute'
    ];
    
    const missingKeys = requiredKeys.filter(key => !(key in context));
    if (missingKeys.length > 0) {
      console.warn(`⚠️ ${operation}: Missing context keys:`, missingKeys);
    }
    
    console.log(`✅ ${operation} hook accessed successfully:`, {
      timestamp: new Date().toISOString(),
      contextKeys: Object.keys(context),
      hasAllRequiredKeys: missingKeys.length === 0
    });
    
    return context;
  } catch (error) {
    logContextError(operation, error, {});
    throw error;
  }
}
