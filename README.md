# Weather Your Route 🗺️🌦️

A React-based travel assistant that provides real-time weather forecasts along your travel route. Whether you're going on a road trip, cycling adventure, or hiking expedition, plan your journey with live weather updates at regular intervals along your path.

![Weather Your Route](https://img.shields.io/badge/React-18.2.0-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3.2-blue) ![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green) ![Firebase](https://img.shields.io/badge/Firebase-9.0-orange)

## 🚀 Live Demo

**🌍 Try it now:** [weatheryourroute.netlify.app](https://weatheryourroute.netlify.app)

## ✨ Features

### Core Functionality
- 🗺️ **Interactive Weather Map** - Real-time weather forecasts displayed on an interactive map
- 🌦️ **Weather Along Route** - Weather markers every 15m, 30m, 1hr, or 2hr along your journey
- 🚗 **Multiple Travel Modes** - Driving, Cycling, Walking with accurate time estimates
- 📱 **Fully Responsive** - Seamless experience on desktop, tablet, and mobile
- 📍 **Smart Location Search** - Autocomplete search with global location support
- 🎯 **Intelligent Routing** - OpenRouteService with OSRM fallback for optimal routes

### Advanced Features
- 🌍 **Weather Overlays** - Toggle between Clouds, Rain, Wind, Temperature, and Pressure layers
- 📍 **Current Location** - Automatically detect and use your current position
- 🕶️ **Dark Mode** - Toggle between light and dark themes for comfortable viewing
- 👤 **User Authentication** - Secure login with Google and email authentication
- ⭐ **Favorite Routes** - Save and quickly access your frequently traveled routes
- 📖 **Route History** - Keep track of all your planned routes and revisit them anytime
- 💾 **Auto-Save** - Routes are automatically saved to your account
- 🔄 **Real-time Updates** - Weather data refreshes automatically every 30 minutes

### User Experience
- 🎨 **Modern UI** - Clean, intuitive interface with smooth animations
- ⚡ **Performance Optimized** - Smart caching and data fetching for fast loading
- 🎯 **Context-Aware** - Remember your preferences and settings
- 📊 **Detailed Weather Info** - Temperature, humidity, wind speed, visibility, and more
- 🗂️ **Organized Interface** - Collapsible sidebar with organized sections

## 🛠️ Tech Stack

- **Frontend**: React 18, TailwindCSS, Leaflet
- **State Management**: React Context + useReducer
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Maps**: OpenStreetMap, React Leaflet
- **Weather**: OpenWeatherMap API
- **Routing**: OpenRouteService, OSRM
- **Geocoding**: Nominatim (OpenStreetMap)
- **Geospatial**: Turf.js for route calculations
- **Data Fetching**: React Query + Axios with smart caching
- **Styling**: TailwindCSS with dark mode support

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenWeatherMap API key (free)
- OpenRouteService API key (optional, recommended)
- Firebase project (for authentication and data storage)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd weathermap
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit the `.env` file with your API keys:
```env
REACT_APP_OPENWEATHER_API_KEY=your_openweather_api_key_here
REACT_APP_ORS_API_KEY=your_openrouteservice_api_key_here

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

4. **Get Required API Keys**

#### OpenWeatherMap (Required)
1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Create a free account
3. Generate an API key
4. Add to your `.env` file

#### OpenRouteService (Optional but Recommended)
1. Visit [OpenRouteService](https://openrouteservice.org/dev/#/signup)
2. Create a free account
3. Generate an API key
4. Add to your `.env` file

#### Firebase Setup (Required)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Google & Email/Password providers)
4. Enable Firestore Database
5. Copy configuration values to your `.env` file

5. **Start the development server**
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎯 How to Use

1. **Sign Up/Login** - Create an account or sign in with Google
2. **Plan Your Route** - Enter origin and destination addresses
3. **Choose Settings** - Select travel mode and weather update intervals
4. **View Weather** - See real-time weather along your entire route
5. **Explore Overlays** - Toggle different weather layers (clouds, rain, wind, etc.)
6. **Save Favorites** - Bookmark frequently used routes
7. **Review History** - Access previously planned routes

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── WeatherMap.js    # Interactive map with weather overlays
│   ├── RouteForm.js     # Route planning form
│   ├── WeatherPanel.js  # Weather information display
│   ├── FavoriteRoutes.js# Saved routes management
│   ├── RouteHistory.js  # Route history tracking
│   └── HomePage.js      # Landing and authentication page
├── context/             # Global state management
│   └── TravelContext.js # Main app context with theme support
├── hooks/               # Custom React hooks
│   ├── useWeather.js    # Weather data fetching
│   ├── useRouting.js    # Route calculation
│   └── useFavorites.js  # Favorites management
├── services/            # External API services
│   ├── weatherService.js# OpenWeatherMap integration
│   ├── routingService.js# Routing service integration
│   └── authService.js   # Firebase authentication
├── config/              # Configuration files
│   └── firebase.js      # Firebase setup
├── utils/               # Utility functions
│   └── routeUtils.js    # Route calculation helpers
├── App.js              # Main application component
├── index.js            # Application entry point
└── index.css           # Global styles and Tailwind imports
```

## 🔧 API Rate Limits & Optimization

- **OpenWeatherMap Free**: 1,000 calls/day, 60 calls/minute
- **OpenRouteService Free**: 2,000 requests/day
- **Firebase**: Generous free tier for authentication and Firestore
- **Nominatim**: 1 request/second (geocoding)

The application implements intelligent caching, request deduplication, and rate limiting to optimize API usage and ensure smooth performance.

## 🌟 Key Features in Detail

### Weather Integration
- **Real-time Data**: Live weather updates from OpenWeatherMap
- **Route Weather**: Weather points calculated at customizable intervals
- **Weather Overlays**: Visual layers for clouds, precipitation, wind patterns
- **Detailed Info**: Temperature, humidity, wind speed, visibility, pressure
- **Auto Refresh**: Data updates automatically every 30 minutes

### User Management
- **Secure Authentication**: Firebase Auth with Google and email options
- **Personal Dashboard**: Each user has their own saved routes and history
- **Data Persistence**: All user data stored securely in Firestore
- **Cross-device Sync**: Access your routes from any device

### Smart Routing
- **Multiple Providers**: Primary OpenRouteService with OSRM fallback
- **Travel Modes**: Optimized routing for driving, cycling, walking
- **Route Optimization**: Finds the best path considering traffic and road types
- **Distance & Duration**: Accurate time and distance calculations

### Modern UI/UX
- **Dark Mode**: System preference detection with manual toggle
- **Responsive Design**: Works seamlessly on all screen sizes
- **Smooth Animations**: Polished transitions and interactions
- **Intuitive Navigation**: Easy-to-use interface with helpful tooltips

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow React best practices
- Use TailwindCSS for styling
- Write meaningful commit messages
- Test your changes on different devices
- Update documentation as needed

## 🐛 Troubleshooting

### Authentication Issues
- **Login fails**: Check Firebase configuration in `.env`
- **Google sign-in not working**: Verify authorized domains in Firebase Console

### Weather Data Problems
- **"Weather unavailable"**: Verify OpenWeatherMap API key
- **Outdated weather**: Check API rate limits and internet connectivity

### Route Planning Issues
- **Route not found**: Try more specific addresses with city/country
- **Slow routing**: Check OpenRouteService API key for better performance

### Map Display Problems
- **Map not loading**: Clear browser cache and check console errors
- **Markers missing**: Verify all API keys are correctly configured

## 🔮 Roadmap

### Upcoming Features
- [ ] **Weather Alerts** - Notifications for severe weather along route
- [ ] **Multi-stop Routes** - Plan routes with multiple waypoints
- [ ] **Route Sharing** - Share planned routes with friends and family
- [ ] **Offline Support** - Download routes for offline access
- [ ] **Weather-based Routing** - Suggest alternative routes based on weather
- [ ] **Mobile App** - Native iOS and Android applications
- [ ] **Historical Weather** - Compare current conditions with historical data
- [ ] **Traffic Integration** - Real-time traffic data overlay

### Technical Improvements
- [ ] Progressive Web App (PWA) features
- [ ] Enhanced caching strategies
- [ ] Performance monitoring
- [ ] Accessibility improvements
- [ ] Internationalization support

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) - Map data and tiles
- [OpenWeatherMap](https://openweathermap.org/) - Weather data API
- [OpenRouteService](https://openrouteservice.org/) - Routing services
- [Firebase](https://firebase.google.com/) - Authentication and database
- [React Leaflet](https://react-leaflet.js.org/) - React map components
- [Turf.js](https://turfjs.org/) - Geospatial calculations
- [TailwindCSS](https://tailwindcss.com/) - Styling framework

## 📞 Support & Feedback

- 🐛 **Bug Reports**: Open an issue on GitHub
- 💡 **Feature Requests**: Share your ideas via GitHub issues
- 🗣️ **General Feedback**: [Give Feedback](https://forms.gle/your-feedback-form)
- 📧 **Contact**: Reach out for collaborations or questions

---

**Made with ❤️ for travelers who want to be prepared for any weather!**

*Whether you're planning a cross-country road trip or a daily commute, Weather Your Route helps you stay ahead of the weather and travel with confidence.*