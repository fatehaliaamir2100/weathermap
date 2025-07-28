# Weather Map Travel 🗺️🌤️

A React application that provides weather forecasts along your travel route. Plan your journey with real-time weather updates at regular intervals along your path from origin to destination.

![Weather Map Travel](https://img.shields.io/badge/React-18.2.0-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3.2-blue) ![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green)

## Features

- 🗺️ Interactive map with route visualization
- 🌦️ Real-time weather data along your route
- 📍 Weather points at customizable intervals (15min, 30min, 1hr, 2hr)
- 🚗 Multiple travel modes (Driving, Cycling, Walking)
- 📱 Responsive design for mobile and desktop
- 🔍 Location search with autocomplete
- 📊 Detailed weather information including temperature, humidity, wind speed
- 🎯 Route optimization using open-source routing services

## Demo

Enter your origin and destination cities, select your travel mode, and get weather forecasts for every segment of your journey!

## Technologies Used

- **Frontend**: React 18, React Leaflet, TailwindCSS
- **Maps**: OpenStreetMap, Leaflet
- **Weather Data**: OpenWeatherMap API
- **Routing**: OpenRouteService / OSRM
- **Geocoding**: Nominatim (OpenStreetMap)
- **Geospatial**: Turf.js
- **State Management**: React Context + useReducer
- **Data Fetching**: React Query, Axios

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenWeatherMap API key (free)
- OpenRouteService API key (optional, for better routing)

## Setup Instructions

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd weather-map-travel
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit the `.env` file and add your API keys:
```env
REACT_APP_OPENWEATHER_API_KEY=your_openweather_api_key_here
REACT_APP_ORS_API_KEY=your_openrouteservice_api_key_here
```

### 4. Get API Keys

#### OpenWeatherMap (Required)
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to API keys section
4. Copy your API key to the `.env` file

#### OpenRouteService (Optional but Recommended)
1. Go to [OpenRouteService](https://openrouteservice.org/dev/#/signup)
2. Sign up for a free account
3. Create a new API key
4. Copy your API key to the `.env` file

> **Note**: If you don't provide an OpenRouteService API key, the app will fallback to public OSRM routing (with limited requests).

### 5. Start the development server
```bash
npm start
```

The application will open at `http://localhost:3000`

## Usage

1. **Enter Route**: Type your origin and destination in the form fields
2. **Select Travel Mode**: Choose between Driving, Cycling, or Walking
3. **Set Weather Interval**: Choose how often you want weather updates along your route
4. **Plan Route**: Click "Plan Route" to generate your route and weather forecasts
5. **View Results**: 
 - See your route on the interactive map
 - View weather markers along the route
 - Check detailed weather information in the sidebar panel
 - Click on any weather marker for more details

## Project Structure

```
src/
├── components/ # React components
│ ├── WeatherMap.js # Main map component with Leaflet
│ ├── RouteForm.js # Route planning form
│ └── WeatherPanel.js # Weather information sidebar
├── context/ # React Context for state management
│ └── TravelContext.js
├── hooks/ # Custom React hooks
│ ├── useWeather.js # Weather data fetching
│ └── useRouting.js # Routing and geocoding
├── services/ # API services
│ ├── weatherService.js
│ └── routingService.js
├── utils/ # Utility functions
│ └── routeUtils.js # Route calculation helpers
├── App.js # Main app component
├── index.js # App entry point
└── index.css # Global styles
```

## Features in Detail

### Weather Integration
- Real-time weather data from OpenWeatherMap
- Automatic refresh every 30 minutes
- Weather points calculated at regular intervals along route
- Detailed weather info: temperature, humidity, wind speed, visibility

### Route Planning
- Multiple routing providers (OpenRouteService, OSRM)
- Support for different travel modes
- Automatic route optimization
- Distance and duration calculations

### Interactive Map
- OpenStreetMap tiles
- Custom weather markers
- Route visualization
- Responsive zoom and pan
- Popup details for each weather point

### Smart Location Search
- Autocomplete address suggestions
- Global location support
- Fuzzy matching for location names

## API Rate Limits

- **OpenWeatherMap Free**: 1,000 calls/day, 60 calls/minute
- **OpenRouteService Free**: 2,000 requests/day
- **Nominatim**: 1 request/second (geocoding)

The app implements smart caching and rate limiting to stay within these limits.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Troubleshooting

### Common Issues

1. **"Weather data unavailable"**
 - Check your OpenWeatherMap API key
 - Ensure you have internet connectivity
 - Verify API key is correctly set in `.env`

2. **"Could not find location"**
 - Try using more specific address formats
 - Include city and country for better results
 - Check if location name is spelled correctly

3. **Route planning fails**
 - Ensure both origin and destination are valid
 - Try different routing providers if one fails
 - Check network connectivity

4. **Map not loading**
 - Clear browser cache
 - Check browser console for errors
 - Verify all dependencies are installed

## Future Enhancements

- [ ] Historical weather data comparison
- [ ] Weather alerts and warnings along route
- [ ] Multiple route alternatives
- [ ] Save and share planned routes
- [ ] Offline map support
- [ ] Weather-based route recommendations
- [ ] Integration with traffic data
- [ ] Mobile app version

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [OpenWeatherMap](https://openweathermap.org/) for weather data
- [OpenRouteService](https://openrouteservice.org/) for routing
- [React Leaflet](https://react-leaflet.js.org/) for map components
- [Turf.js](https://turfjs.org/) for geospatial calculations

---

Made with ❤️ for travelers who want to be prepared for any weather!