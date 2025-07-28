import React, { createContext, useContext, useReducer } from "react";

const TravelContext = createContext();

const initialState = {
  origin: "",
  destination: "",
  route: null,
  weatherPoints: [],
  isLoading: false,
  error: null,
  travelMode: "driving-car", // driving-car, foot-walking, cycling-regular
  updateInterval: 30, // minutes
};

function travelReducer(state, action) {
  switch (action.type) {
    case "SET_ORIGIN":
      return { ...state, origin: action.payload };
    case "SET_DESTINATION":
      return { ...state, destination: action.payload };
    case "SET_ROUTE":
      return { ...state, route: action.payload };
    case "SET_WEATHER_POINTS":
      return { ...state, weatherPoints: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_TRAVEL_MODE":
      return { ...state, travelMode: action.payload };
    case "SET_UPDATE_INTERVAL":
      return { ...state, updateInterval: action.payload };
    case "CLEAR_ROUTE":
      return {
        ...state,
        route: null,
        weatherPoints: [],
        error: null,
      };
    default:
      return state;
  }
}

export function TravelProvider({ children }) {
  const [state, dispatch] = useReducer(travelReducer, initialState);

  const setOrigin = (origin) =>
    dispatch({ type: "SET_ORIGIN", payload: origin });
  const setDestination = (destination) =>
    dispatch({ type: "SET_DESTINATION", payload: destination });
  const setRoute = (route) => dispatch({ type: "SET_ROUTE", payload: route });
  const setWeatherPoints = (points) =>
    dispatch({ type: "SET_WEATHER_POINTS", payload: points });
  const setLoading = (loading) =>
    dispatch({ type: "SET_LOADING", payload: loading });
  const setError = (error) => dispatch({ type: "SET_ERROR", payload: error });
  const setTravelMode = (mode) =>
    dispatch({ type: "SET_TRAVEL_MODE", payload: mode });
  const setUpdateInterval = (interval) =>
    dispatch({ type: "SET_UPDATE_INTERVAL", payload: interval });
  const clearRoute = () => dispatch({ type: "CLEAR_ROUTE" });

  const value = {
    ...state,
    setOrigin,
    setDestination,
    setRoute,
    setWeatherPoints,
    setLoading,
    setError,
    setTravelMode,
    setUpdateInterval,
    clearRoute,
  };

  return (
    <TravelContext.Provider value={value}>{children}</TravelContext.Provider>
  );
}

export function useTravel() {
  const context = useContext(TravelContext);
  if (!context) {
    throw new Error("useTravel must be used within a TravelProvider");
  }
  return context;
}
