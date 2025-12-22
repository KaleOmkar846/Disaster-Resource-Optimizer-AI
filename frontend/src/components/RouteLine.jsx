import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "./RouteLine.css";

/**
 * RouteLine - Pure rendering component that draws a polyline on the map.
 *
 * All route geometry should be pre-calculated from the backend routing service.
 * This component only handles visualization - no external API calls.
 *
 * @param {Array} route - Array of coordinates [{lat, lon/lng}, ...] or [[lat, lng], ...]
 * @param {string} color - Polyline color (default: blue)
 * @param {boolean} dashed - Whether to show as dashed line (for fallback routes)
 */
function RouteLine({ route, color = "#3b82f6", dashed = false }) {
  const map = useMap();
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!map || !route || route.length < 2) return;

    // Normalize route points to [lat, lng] arrays
    const points = route.map((point) => {
      if (Array.isArray(point)) {
        return [point[0], point[1]];
      }
      return [point.lat, point.lon ?? point.lng];
    });

    // Cleanup previous polyline
    if (polylineRef.current) {
      try {
        map.removeLayer(polylineRef.current);
      } catch {
        // ignore removal errors
      }
      polylineRef.current = null;
    }

    // Don't render if map container is gone
    if (!map.getContainer()) return;

    // Draw the polyline
    const lineOptions = {
      color,
      weight: 5,
      opacity: 0.8,
    };

    // Add dashed style for fallback/straight-line routes
    if (dashed) {
      lineOptions.dashArray = "10, 10";
    }

    const line = L.polyline(points, lineOptions).addTo(map);
    polylineRef.current = line;

    // Cleanup on unmount or route change
    return () => {
      if (polylineRef.current) {
        try {
          if (map.getContainer()) {
            map.removeLayer(polylineRef.current);
          }
        } catch {
          // ignore removal errors
        }
        polylineRef.current = null;
      }
    };
  }, [map, route, color, dashed]);

  return null;
}

export default RouteLine;
