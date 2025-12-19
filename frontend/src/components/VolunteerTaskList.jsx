import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Navigation, X, Loader2 } from "lucide-react";
import { getUnverifiedTasks, verifyTask } from "../services";
import { useVolunteerRoute, useAuth } from "../contexts";
import "./VolunteerTaskList.css";

// Format distance in meters/km
const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// Format duration in seconds to minutes/hours
const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

export default function VolunteerTaskList() {
  const { t } = useTranslation();
  const { isVolunteer } = useAuth();
  const [verifyingTasks, setVerifyingTasks] = useState(new Set());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const {
    activeTask,
    startRoute,
    cancelRoute,
    currentLocation,
    hasActiveRoute,
    routeInfo,
    isLoadingRoute,
  } = useVolunteerRoute();

  // Fetch tasks using react-query for caching
  const {
    data: tasks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["unverifiedTasks"],
    queryFn: getUnverifiedTasks,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: true,
  });

  // Handle verify button click
  const handleVerify = async (task) => {
    setVerifyingTasks((prev) => new Set(prev).add(task.id));

    try {
      const result = await verifyTask(task);

      if (result.status === "offline-pending") {
        // Task queued for sync
      } else {
        // Refetch tasks to update the list
        refetch();
      }
    } catch (error) {
      console.error("Error verifying task:", error);
      // Remove from verifying set on error
      setVerifyingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  };

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refetch tasks when back online
      refetch();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refetch]);

  if (isLoading) {
    return <div className="task-list-container">{t("tasks.loading")}</div>;
  }

  if (error) {
    return (
      <div className="task-list-container error-message">
        {t("tasks.errorLoading")}: {error.message}
      </div>
    );
  }

  // Handle start route button click
  const handleStartRoute = (task) => {
    if (!task.lat || !task.lon) {
      alert(t("tasks.noLocation"));
      return;
    }
    if (!currentLocation) {
      alert(t("tasks.locationRequired"));
      return;
    }
    startRoute(task);
  };

  // Check if a task has valid coordinates
  const hasCoordinates = (task) => {
    return typeof task.lat === "number" && typeof task.lon === "number";
  };

  return (
    <div className="task-list-container">
      <h2>{t("tasks.title")}</h2>

      {!isOnline && (
        <div className="task-list-offline-banner">
          <AlertTriangle size={16} className="icon-inline" />{" "}
          {t("tasks.offlineBanner")}
        </div>
      )}

      {/* Active Route Banner */}
      {hasActiveRoute && activeTask && (
        <div className="task-route-active-banner">
          <div className="route-info">
            <Navigation size={18} className="route-icon" />
            <div className="route-details">
              <strong>{t("tasks.routeActive")}</strong>
              <span>
                {activeTask.description ||
                  activeTask.location ||
                  t("tasks.noDescription")}
              </span>
              {routeInfo && (
                <span className="route-stats">
                  {formatDistance(routeInfo.distance)} •{" "}
                  {formatDuration(routeInfo.duration)}
                </span>
              )}
            </div>
          </div>
          <button
            className="route-cancel-btn"
            onClick={cancelRoute}
            aria-label={t("tasks.cancelRoute")}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {tasks && tasks.length === 0 ? (
        <p className="task-list-empty">{t("tasks.empty")}</p>
      ) : (
        <ul className="task-list">
          {tasks?.map((task) => {
            const isVerifying = verifyingTasks.has(task.id);
            const isActiveTask = activeTask && activeTask.id === task.id;
            const isLoadingThisRoute =
              isLoadingRoute && activeTask?.id === task.id;
            const canStartRoute =
              hasCoordinates(task) &&
              currentLocation &&
              !isActiveTask &&
              !isLoadingRoute;

            return (
              <li
                key={task.id}
                className={`task-item ${isVerifying ? "verifying" : ""} ${
                  isActiveTask ? "active-route" : ""
                }`}
              >
                <div className="task-field">
                  <strong>{t("tasks.taskId")}:</strong> {task.id}
                </div>
                <div className="task-field">
                  <strong>{t("tasks.description")}:</strong>{" "}
                  {task.description || t("tasks.noDescription")}
                </div>
                <div className="task-field">
                  <strong>{t("tasks.notes")}:</strong>{" "}
                  {task.notes || t("tasks.noNotes")}
                </div>
                {task.location && (
                  <div className="task-field">
                    <strong>{t("tasks.location")}:</strong> {task.location}
                  </div>
                )}

                <div className="task-actions">
                  {/* Start Route Button - Only show if task has coordinates and user is volunteer */}
                  {isVolunteer && hasCoordinates(task) && (
                    <button
                      onClick={() => handleStartRoute(task)}
                      disabled={!canStartRoute}
                      className={`task-route-button ${
                        isActiveTask ? "active" : ""
                      } ${isLoadingThisRoute ? "loading" : ""}`}
                    >
                      {isLoadingThisRoute ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Navigation size={16} />
                      )}
                      {isLoadingThisRoute
                        ? t("tasks.calculatingRoute")
                        : isActiveTask
                        ? t("tasks.routeStarted")
                        : t("tasks.startRoute")}
                    </button>
                  )}

                  <button
                    onClick={() => handleVerify(task)}
                    disabled={isVerifying}
                    className="task-verify-button"
                  >
                    {isVerifying && !isOnline
                      ? t("tasks.pendingSync")
                      : isVerifying
                      ? t("tasks.verifying")
                      : t("tasks.verify")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
