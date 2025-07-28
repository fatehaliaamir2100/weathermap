import React, { useState, useCallback } from "react";
import WeatherMap from "./components/WeatherMap";
import RouteForm from "./components/RouteForm";
import WeatherPanel from "./components/WeatherPanel";
import { TravelProvider } from "./context/TravelContext";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <TravelProvider>
      <div className="h-screen flex bg-gray-100">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-96" : "w-0"
          } transition-all duration-300 ease-in-out overflow-hidden bg-white shadow-lg z-10`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Weather Map Travel
              </h1>
              <p className="text-sm text-gray-600">
                Plan your journey with weather forecasts along your route
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <RouteForm />
              <WeatherPanel />
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-20 bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  sidebarOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>

          <WeatherMap />
        </div>
      </div>
    </TravelProvider>
  );
}

export default App;
