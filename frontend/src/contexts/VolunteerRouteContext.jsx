import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { getVolunteerRoute } from "../services/apiService";

const VolunteerRouteContext = createContext(null);

export function VolunteerRouteProvider({ children }) {
  const [activeRoute, setActiveRoute] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // Distance, duration, etc.
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Watch volunteer's current location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.log("Geolocation error:", error);
        // Default to sample location for testing
        setCurrentLocation({ lat: 18.52, lng: 73.85 });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Start route to a task location using centralized backend routing service
  const startRoute = useCallback(
    async (task) => {
      if (!task || !task.lat || !task.lon) {
        console.warn("Cannot start route: task has no coordinates");
        return false;
      }

      if (!currentLocation) {
        console.warn("Cannot start route: current location not available");
        return false;
      }

      setIsLoadingRoute(true);
      setActiveTask(task);

      try {
        // Use centralized backend routing service
        const origin = { lat: currentLocation.lat, lon: currentLocation.lng };
        const destination = { lat: task.lat, lon: task.lon };

        const routeData = await getVolunteerRoute(origin, destination);

        // Set the route geometry for map display
        setActiveRoute(routeData.geometry);
        setRouteInfo({
          distance: routeData.distance,
          duration: routeData.duration,
          isFallback: routeData.isFallback || false,
        });

        return true;
      } catch (error) {
        console.error("Error fetching route from backend:", error);

        // Fallback to simple two-point straight line route
        // Since RouteLine no longer calls OSRM, this will show as dashed
        const fallbackRoute = [
          { lat: currentLocation.lat, lon: currentLocation.lng },
          { lat: task.lat, lon: task.lon },
        ];
        setActiveRoute(fallbackRoute);
        setRouteInfo({
          distance: null,
          duration: null,
          isFallback: true, // Mark as fallback so Map can pass dashed prop
        });

        return true;
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [currentLocation]
  );

  // Cancel active route
  const cancelRoute = useCallback(() => {
    setActiveRoute(null);
    setActiveTask(null);
    setRouteInfo(null);
  }, []);

  const value = {
    activeRoute,
    activeTask,
    currentLocation,
    routeInfo,
    isLoadingRoute,
    startRoute,
    cancelRoute,
    hasActiveRoute: !!activeRoute,
  };

  return (
    <VolunteerRouteContext.Provider value={value}>
      {children}
    </VolunteerRouteContext.Provider>
  );
}

export function useVolunteerRoute() {
  const context = useContext(VolunteerRouteContext);
  if (!context) {
    throw new Error(
      "useVolunteerRoute must be used within a VolunteerRouteProvider"
    );
  }
  return context;
}
