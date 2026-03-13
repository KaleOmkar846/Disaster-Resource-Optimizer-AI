import { Marker, Popup } from "react-leaflet";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "./MapPin.css";

const ICON_SIZE = 32;

// Custom icons for different pin states
// The wrapper div is NOT rotated — only the inner pin shape rotates.
// This keeps the cluster badge stable during zoom.
const createCustomIcon = (variant, clusterCount = 0) => {
  const badgeHtml =
    clusterCount > 0
      ? `<span class="cluster-badge">${clusterCount + 1}</span>`
      : "";
  return new L.DivIcon({
    className: `map-pin-wrapper ${variant}${clusterCount > 0 ? " clustered" : ""}`,
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE],
    popupAnchor: [0, -ICON_SIZE + 6],
    html: `<div class="map-pin-icon"><span class="map-pin-inner"></span>${badgeHtml}</div>`,
  });
};

// Icons are now created dynamically via createCustomIcon(variant, clusterCount)
// to support cluster badge rendering on pins with duplicates.

function MapPin({ need, isSelected, onClick }) {
  const { t } = useTranslation();
  const isReport = need.isReport || need.status === "Report";
  const isInProgress = need.status === "InProgress";
  const emergencyStatus = need.emergencyStatus || "none";
  const emergencyType = need.emergencyType || "general";
  const duplicateCount = need.duplicateCount || 0;

  // Determine which icon to use based on emergencyStatus
  let variant;

  if (isSelected) {
    variant = "selected";
  } else if (emergencyStatus === "rejected") {
    variant = "rejected";
  } else if (emergencyStatus === "dispatched") {
    variant = "dispatched";
  } else if (emergencyStatus === "assigned") {
    variant = "assigned";
  } else if (emergencyStatus === "resolved") {
    variant = "resolved";
  } else if (
    emergencyStatus === "pending" ||
    need.status === "Verified" ||
    need.status === "Analyzed" ||
    need.status === "Analyzed_Full"
  ) {
    variant = "verified";
  } else if (isInProgress) {
    variant = "in-progress";
  } else if (isReport) {
    variant = "report";
  } else {
    variant = "received";
  }

  const icon =
    duplicateCount > 0
      ? createCustomIcon(variant, duplicateCount)
      : createCustomIcon(variant);

  const getStatusLabel = () => {
    // Show emergency status if available
    if (emergencyStatus && emergencyStatus !== "none") {
      const statusLabels = {
        pending: t("map.pendingAssignment", "Pending Assignment"),
        assigned: t("map.assignedToStation", "Assigned to Station"),
        dispatched: t("map.unitsDispatched", "Units Dispatched"),
        rejected: t("map.rejectedNeedsReroute", "Rejected - Needs Reroute"),
        resolved: t("map.resolved", "Resolved"),
      };
      return statusLabels[emergencyStatus] || emergencyStatus;
    }
    if (isReport) return t("map.analyzedReport");
    return need.status;
  };

  const getDescription = () => {
    if (isReport) {
      return need.text || need.description || t("taskList.noDescription");
    }
    return need.description || t("taskList.noDescription");
  };

  const getEmergencyStatusBadge = () => {
    if (!emergencyStatus || emergencyStatus === "none") return null;

    const badgeColors = {
      pending: "#10b981", // Green
      assigned: "#eab308", // Yellow
      dispatched: "#f97316", // Orange
      rejected: "#ef4444", // Red
      resolved: "#6b7280", // Gray
    };

    return (
      <p
        className="pin-emergency-status"
        style={{ color: badgeColors[emergencyStatus] }}
      >
        <strong>🚨 {getStatusLabel()}</strong>
      </p>
    );
  };

  return (
    <Marker
      position={[need.lat, need.lon]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onClick) {
            onClick(need.id);
          }
        },
      }}
    >
      <Popup>
        <div className="pin-popup">
          <b>
            {t("map.status")}: {need.status}
          </b>
          {emergencyType && emergencyType !== "none" && (
            <p className="pin-emergency-type">
              <strong>📋 {t("map.type")}:</strong> {emergencyType.toUpperCase()}
            </p>
          )}
          {getEmergencyStatusBadge()}
          {duplicateCount > 0 && (
            <p className="pin-cluster-info" style={{ color: "#8b5cf6" }}>
              <strong>🔗 Cluster:</strong> {duplicateCount + 1} reports for this
              emergency
            </p>
          )}
          {need.assignedStation?.stationName && (
            <p className="pin-station">
              <strong>📍 {t("map.station")}:</strong>{" "}
              {need.assignedStation.stationName}
            </p>
          )}
          {isReport && need.category && (
            <p className="pin-category">
              <strong>{t("map.category")}:</strong> {need.category}
            </p>
          )}
          {isReport && need.severity && (
            <p className="pin-severity">
              <strong>{t("map.severity")}:</strong> {need.severity}/10
            </p>
          )}
          {isReport && need.needs && need.needs.length > 0 && (
            <p className="pin-needs">
              <strong>{t("map.needs")}:</strong> {need.needs.join(", ")}
            </p>
          )}
          <p className="pin-description">{getDescription()}</p>
          {emergencyStatus === "rejected" &&
            need.assignedStation?.rejectionReason && (
              <p className="pin-rejection" style={{ color: "#ef4444" }}>
                <strong>{t("map.rejectionReason")}:</strong>{" "}
                {need.assignedStation.rejectionReason}
              </p>
            )}
          {!isSelected &&
            (need.status === "Verified" ||
              isReport ||
              emergencyStatus === "rejected") && (
              <small>
                {emergencyStatus === "rejected"
                  ? t("map.clickToReroute", "Click to reroute")
                  : t("map.clickToSelect")}
              </small>
            )}
          {isSelected && <small>{t("map.clickToDeselect")}</small>}
        </div>
      </Popup>
    </Marker>
  );
}

export default MapPin;
