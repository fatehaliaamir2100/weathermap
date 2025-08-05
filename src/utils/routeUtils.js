import * as turf from "@turf/turf";

export function calculateRouteSegments(
  routeCoordinates,
  intervalMinutes = 30,
  averageSpeedKmh = 80,
  departureTimeMinutes = 0
) {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return [];
  }

  try {
    // Create a LineString from the route coordinates
    const line = turf.lineString(
      routeCoordinates.map((coord) => [coord[1], coord[0]])
    ); // [lng, lat] for turf

    // Calculate total distance in km
    const totalDistance = turf.length(line, { units: "kilometers" });

    // Calculate distance per interval
    const distancePerInterval = (averageSpeedKmh * intervalMinutes) / 60;

    // If the total distance is less than one interval, just return start and end
    if (totalDistance <= distancePerInterval) {
      return [
        {
          coordinates: routeCoordinates[0],
          distanceFromStart: 0,
          estimatedTime: departureTimeMinutes,
        },
        {
          coordinates: routeCoordinates[routeCoordinates.length - 1],
          distanceFromStart: totalDistance,
          estimatedTime:
            departureTimeMinutes + (totalDistance / averageSpeedKmh) * 60, // minutes
        },
      ];
    }

    const segments = [];
    let currentDistance = 0;
    let segmentIndex = 0;

    // Add starting point
    segments.push({
      coordinates: routeCoordinates[0],
      distanceFromStart: 0,
      estimatedTime: departureTimeMinutes,
      segmentIndex: segmentIndex++,
    });

    // Generate intermediate points
    while (currentDistance < totalDistance - distancePerInterval) {
      currentDistance += distancePerInterval;

      try {
        const point = turf.along(line, currentDistance, {
          units: "kilometers",
        });
        const [lng, lat] = point.geometry.coordinates;

        segments.push({
          coordinates: [lat, lng],
          distanceFromStart: currentDistance,
          estimatedTime:
            departureTimeMinutes + (currentDistance / averageSpeedKmh) * 60, // minutes
          segmentIndex: segmentIndex++,
        });
      } catch (error) {
        console.warn("Error calculating point along route:", error);
      }
    }

    // Add ending point
    segments.push({
      coordinates: routeCoordinates[routeCoordinates.length - 1],
      distanceFromStart: totalDistance,
      estimatedTime:
        departureTimeMinutes + (totalDistance / averageSpeedKmh) * 60, // minutes
      segmentIndex: segmentIndex++,
    });

    return segments;
  } catch (error) {
    console.error("Error calculating route segments:", error);
    // Fallback: just return start and end points
    return [
      {
        coordinates: routeCoordinates[0],
        distanceFromStart: 0,
        estimatedTime: departureTimeMinutes,
        segmentIndex: 0,
      },
      {
        coordinates: routeCoordinates[routeCoordinates.length - 1],
        distanceFromStart: 0,
        estimatedTime: departureTimeMinutes,
        segmentIndex: 1,
      },
    ];
  }
}

export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function getAverageSpeed(travelMode) {
  const speeds = {
    "driving-car": 80, // km/h
    "cycling-regular": 15, // km/h
    "foot-walking": 5, // km/h
    driving: 80,
    walking: 5,
    cycling: 15,
  };

  return speeds[travelMode] || 80;
}
