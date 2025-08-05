import React, { useState, useCallback, useEffect } from "react";
import WeatherMap from "./components/WeatherMap";
import RouteForm from "./components/RouteForm";
import WeatherPanel from "./components/WeatherPanel";
import FavoriteRoutes from "./components/FavoriteRoutes";
import RouteHistory from "./components/RouteHistory";
import HomePage from "./components/HomePage";
import { TravelProvider } from "./context/TravelContext";
import { authService } from "./services/authService";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <HomePage onAuthenticated={() => setUser(authService.getCurrentUser())} />;
  }

  return (
    <TravelProvider>
      <div className="h-screen flex" style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-96" : "w-0"
          } transition-all duration-300 ease-in-out overflow-hidden bg-white/95 backdrop-blur-sm shadow-lg z-10`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-gray-800">
                  Weather Your Route
                </h1>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Welcome, {user.displayName || "User"}!
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <RouteForm />
              <FavoriteRoutes />
              <WeatherPanel />
              <RouteHistory />
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow"
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
