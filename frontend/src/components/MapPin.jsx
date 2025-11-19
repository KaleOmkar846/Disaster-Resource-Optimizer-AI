import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "./MapPin.css";

const ICON_SIZE = 32;

// Custom icons for different pin states
const createCustomIcon = (variant) =>
  new L.DivIcon({
    className: `map-pin-icon ${variant}`,
    html: '<span class="map-pin-inner"></span>',
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE],
    popupAnchor: [0, -ICON_SIZE + 6],
  });

// Define icons for each state
const verifiedIcon = createCustomIcon("verified");
const unverifiedIcon = createCustomIcon("unverified");
const selectedIcon = createCustomIcon("selected"); // Brighter green and selected

function MapPin({ need, isSelected, onClick }) {
  // Determine which icon to use
  let icon;
  if (isSelected) {
    icon = selectedIcon;
  } else if (need.status === "Verified") {
    icon = verifiedIcon;
  } else {
    icon = unverifiedIcon;
  }

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
        <b>Status: {need.status}</b>
        <p>{need.description}</p>
        {!isSelected && need.status === "Verified" && (
          <small>Click pin again to select for routing.</small>
        )}
        {isSelected && <small>Selected! Click again to de-select.</small>}
      </Popup>
    </Marker>
  );
}

export default MapPin;
