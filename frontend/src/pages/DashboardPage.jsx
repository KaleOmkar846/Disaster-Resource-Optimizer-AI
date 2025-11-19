import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map } from "../components";
import { optimizeRoute, getNeedsForMap } from "../services";
import "./DashboardPage.css";

const DEPOT_LOCATION = { lat: 18.521, lon: 73.854 };

function DashboardPage() {
  const [selectedNeedIds, setSelectedNeedIds] = useState(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    data: needsData = [],
    isLoading: isNeedsLoading,
    error: needsError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["map-needs"],
    queryFn: getNeedsForMap,
    refetchInterval: 10000,
  });

  const needs = useMemo(
    () =>
      (needsData || []).filter(
        (need) => typeof need.lat === "number" && typeof need.lon === "number"
      ),
    [needsData]
  );

  const optimizeLabel =
    selectedNeedIds.size > 0
      ? `Optimize ${selectedNeedIds.size} Stops`
      : "Select verified stops to optimize";

  useEffect(() => {
    setSelectedNeedIds((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        const stillValid = needs.find(
          (need) => need.id === id && need.status === "Verified"
        );
        if (stillValid) {
          next.add(id);
        }
      });
      if (next.size === prev.size) {
        let identical = true;
        next.forEach((id) => {
          if (!prev.has(id)) {
            identical = false;
          }
        });
        if (identical) {
          return prev;
        }
      }
      return next;
    });
  }, [needs]);

  // Handles clicking on a map pin
  const handlePinClick = (needId) => {
    const clickedNeed = needs.find((n) => n.id === needId);

    // Only allow selecting 'Verified' needs for optimization
    if (clickedNeed && clickedNeed.status !== "Verified") {
      alert("This need is not verified yet. A volunteer must verify it first.");
      return;
    }

    // Add or remove the ID from the Set of selected needs
    setSelectedNeedIds((prevSelectedIds) => {
      const newIds = new Set(prevSelectedIds);
      if (newIds.has(needId)) {
        newIds.delete(needId);
      } else {
        newIds.add(needId);
      }
      return newIds;
    });
  };

  // This function calls your backend API
  const handleOptimizeRoute = async () => {
    setIsLoading(true);
    setError(null);
    setOptimizedRoute([]); // Clear previous route

    // 1. Get the full location objects for the selected IDs
    const verifiedStops = needs
      .filter((need) => selectedNeedIds.has(need.id))
      .map((need) => ({ lat: need.lat, lon: need.lon }));

    if (verifiedStops.length === 0) {
      setError("Please select at least one verified stop to optimize.");
      setIsLoading(false);
      return;
    }

    // 2. Prepare the request payload
    const requestPayload = {
      depot: DEPOT_LOCATION,
      stops: verifiedStops,
    };

    // 3. Call the API
    try {
      const response = await optimizeRoute(requestPayload);
      // The response.optimized_route is a list of {lat, lon} objects
      // Convert it to [lat, lon] arrays for the Polyline component
      const routeCoords = response.optimized_route.map((loc) => [
        loc.lat,
        loc.lon,
      ]);
      setOptimizedRoute(routeCoords);
    } catch (err) {
      console.error("Optimization failed:", err);
      setError("Failed to calculate route. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="dashboard-header">
          <h2>Aegis AI Dashboard</h2>
          <button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Syncing..." : "Refresh"}
          </button>
        </div>
        <p className="dashboard-note">Live feed from Twilio + volunteers.</p>

        <button
          className="optimize-button"
          onClick={handleOptimizeRoute}
          disabled={isLoading || selectedNeedIds.size === 0}
        >
          {isLoading ? "Calculating..." : optimizeLabel}
        </button>
        {error && <p className="error-message">{error}</p>}
        {needsError && <p className="error-message">Failed to load needs.</p>}
        {isNeedsLoading && <p>Loading needs...</p>}

        <hr />
        <h3>Incoming Reports</h3>
        <ul className="needs-list">
          {needs.map((need) => {
            const isSelected = selectedNeedIds.has(need.id);
            const isVerified = need.status === "Verified";

            return (
              <li
                key={need.id}
                className={`need-item${isVerified ? " verified" : ""}${
                  isSelected ? " selected" : ""
                }`}
              >
                <div className="need-header">
                  <strong>{need.needType || "Need"}</strong>
                  <span className="need-timestamp">
                    {new Date(need.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="need-description">{need.description}</p>
                <p className="need-location">
                  📍 {need.location || "Unknown location"}
                </p>
                <p className="need-urgency">
                  Urgency: <strong>{need.urgency || "Medium"}</strong>
                </p>
                <p className="need-status">
                  Status: <strong>{need.status}</strong>
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="dashboard-map">
        <Map
          depot={DEPOT_LOCATION}
          needs={needs}
          selectedNeedIds={selectedNeedIds}
          onPinClick={handlePinClick}
          optimizedRoute={optimizedRoute}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
