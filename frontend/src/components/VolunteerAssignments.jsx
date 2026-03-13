import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Navigation,
  MapPin,
  Loader2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Phone,
} from "lucide-react";
import {
  getMyAssignments,
  acceptAssignment,
  declineAssignment,
  completeAssignment,
} from "../services/apiService";
import { useVolunteerRoute } from "../contexts";
import "./VolunteerAssignments.css";

const URGENCY_COLORS = {
  High: "urgency-high",
  Medium: "urgency-medium",
  Low: "urgency-low",
};

export default function VolunteerAssignments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { startRoute, currentLocation } = useVolunteerRoute();
  const [processingTasks, setProcessingTasks] = useState(new Set());
  const [expandedTask, setExpandedTask] = useState(null);

  const {
    data: assignments,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: getMyAssignments,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const handleAction = async (taskId, action, e) => {
    e.stopPropagation();
    setProcessingTasks((prev) => new Set(prev).add(taskId));

    try {
      if (action === "accept") {
        await acceptAssignment(taskId);
      } else if (action === "decline") {
        await declineAssignment(taskId);
      } else if (action === "complete") {
        await completeAssignment(taskId);
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ["unverifiedTasks"] });
    } catch (err) {
      console.error(`Error ${action}ing task:`, err);
    } finally {
      setProcessingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleStartRoute = async (task, e) => {
    e.stopPropagation();
    if (!task.lat || !task.lng) return;

    const success = await startRoute({
      ...task,
      lon: task.lng,
    });
    if (success) navigate("/dashboard");
  };

  const toggleExpand = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="assignments-container">
        <div className="assignments-loading">
          <Loader2 size={24} className="spin" />
          <span>Loading assignments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignments-container">
        <div className="assignments-error">
          <AlertTriangle size={20} />
          <span>Failed to load assignments</span>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <h2>{t("dispatch.myAssignments", "My Assignments")}</h2>
        <span className="assignments-count">{assignments?.length || 0}</span>
      </div>

      {assignments && assignments.length === 0 ? (
        <div className="assignments-empty">
          <CheckCircle2 size={40} strokeWidth={1.5} />
          <p>{t("dispatch.noAssignments", "No tasks assigned to you")}</p>
          <span>
            {t(
              "dispatch.noAssignmentsHint",
              "Tasks will appear here when dispatch assigns them to you",
            )}
          </span>
        </div>
      ) : (
        <div className="assignment-cards">
          {assignments?.map((task) => {
            const isProcessing = processingTasks.has(task.id);
            const isExpanded = expandedTask === task.id;
            const isAssigned = task.status === "assigned";
            const isAccepted = task.status === "accepted";
            const hasCoords =
              typeof task.lat === "number" && typeof task.lng === "number";

            return (
              <div
                key={task.id}
                className={`assignment-card ${isAssigned ? "status-assigned" : "status-accepted"} ${isExpanded ? "expanded" : ""}`}
                onClick={() => toggleExpand(task.id)}
              >
                <div className="assignment-card-main">
                  <div className="assignment-info">
                    <div className="assignment-badges">
                      {task.needType && (
                        <span
                          className={`badge-type badge-${task.needType?.toLowerCase()}`}
                        >
                          {task.needType}
                        </span>
                      )}
                      {task.urgency && (
                        <span
                          className={`badge-urgency ${URGENCY_COLORS[task.urgency] || ""}`}
                        >
                          {task.urgency}
                        </span>
                      )}
                      <span className={`badge-status badge-${task.status}`}>
                        {isAssigned ? "New" : "Active"}
                      </span>
                    </div>
                    <p className="assignment-description">{task.description}</p>
                    <div className="assignment-meta">
                      {task.location && (
                        <span className="meta-item">
                          <MapPin size={12} /> {task.location}
                        </span>
                      )}
                      <span className="meta-item">
                        <Clock size={12} /> {formatTime(task.assignedAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className={`expand-icon ${isExpanded ? "rotated" : ""}`}
                  />
                </div>

                {isExpanded && (
                  <div className="assignment-card-expanded">
                    {task.phoneNumber && (
                      <div className="assignment-phone">
                        <Phone size={12} />
                        <a href={`tel:${task.phoneNumber}`}>
                          {task.phoneNumber}
                        </a>
                      </div>
                    )}

                    <div className="assignment-actions">
                      {hasCoords && currentLocation && (
                        <button
                          className="btn-navigate"
                          onClick={(e) => handleStartRoute(task, e)}
                        >
                          <Navigation size={14} />
                          {t("dispatch.navigate", "Navigate")}
                        </button>
                      )}

                      {isAssigned && (
                        <>
                          <button
                            className="btn-accept"
                            onClick={(e) => handleAction(task.id, "accept", e)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 size={14} className="spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {t("dispatch.accept", "Accept")}
                          </button>
                          <button
                            className="btn-decline"
                            onClick={(e) => handleAction(task.id, "decline", e)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 size={14} className="spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            {t("dispatch.decline", "Decline")}
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          className="btn-complete"
                          onClick={(e) => handleAction(task.id, "complete", e)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {t("dispatch.complete", "Mark Complete")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
