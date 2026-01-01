import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Users,
  User,
  ChevronRight,
  MapPin,
  MapPinOff,
  Loader2,
} from "lucide-react";
import "./RoleSelector.css";

export default function RoleSelector({ onSelectRole, onPublicAccess }) {
  const { t } = useTranslation();
  const [locationStatus, setLocationStatus] = useState("idle"); // 'idle', 'checking', 'granted', 'denied'
  const [pendingRole, setPendingRole] = useState(null);

  const checkLocationAndProceed = async (role, callback) => {
    if (!navigator.geolocation) {
      // If geolocation not supported, still allow access
      callback(role);
      return;
    }

    setPendingRole(role);
    setLocationStatus("checking");

    const timeoutId = setTimeout(() => {
      setLocationStatus("granted");
      callback(role);
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      () => {
        clearTimeout(timeoutId);
        setLocationStatus("granted");
        callback(role);
      },
      (error) => {
        clearTimeout(timeoutId);
        if (error.code === 1) {
          setLocationStatus("denied");
          setPendingRole(null);
        } else {
          setLocationStatus("granted");
          callback(role);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: Infinity,
      }
    );
  };

  const handleRoleSelect = (role) => {
    if (role === "public") {
      checkLocationAndProceed(role, () => onPublicAccess());
    } else {
      checkLocationAndProceed(role, onSelectRole);
    }
  };

  const retryLocation = () => {
    if (pendingRole) {
      handleRoleSelect(pendingRole);
    }
  };

  // Location denied screen
  if (locationStatus === "denied") {
    return (
      <div className="role-selector-container">
        <div className="role-selector-card">
          <div className="role-selector-header">
            <div className="role-selector-logo">
              <div className="logo-icon">
                <ShieldCheck size={32} strokeWidth={2.5} />
              </div>
              <span className="logo-text">AEGIS</span>
            </div>
            <h1>{t("roleSelector.title", "Emergency Response Portal")}</h1>
            <p className="selector-subtitle">
              {t("roleSelector.subtitle", "Disaster Response Resource Optimization")}
            </p>
          </div>

          <div className="location-denied-section">
            <div className="location-error-icon">
              <MapPinOff size={32} />
            </div>
            <p className="location-message">
              {t("roleSelector.locationRequired", "Location Access Required")}
            </p>
            <p className="location-hint">
              {t(
                "roleSelector.locationHint",
                "Enable location access to use the emergency response system. Your location is needed to coordinate rescue operations."
              )}
            </p>
            <button className="enable-location-btn" onClick={retryLocation}>
              <MapPin size={16} />
              <span>{t("roleSelector.enableLocation", "Enable Location")}</span>
            </button>
            <button
              className="back-btn"
              onClick={() => {
                setLocationStatus("idle");
                setPendingRole(null);
              }}
            >
              {t("common.back", "Back")}
            </button>
          </div>
        </div>

        <div className="login-branding">
          <span>{t("roleSelector.branding", "Disaster Response Resource Optimization Platform")}</span>
        </div>
      </div>
    );
  }

  // Location checking screen
  if (locationStatus === "checking") {
    return (
      <div className="role-selector-container">
        <div className="role-selector-card">
          <div className="role-selector-header">
            <div className="role-selector-logo">
              <div className="logo-icon">
                <ShieldCheck size={32} strokeWidth={2.5} />
              </div>
              <span className="logo-text">AEGIS</span>
            </div>
            <h1>{t("roleSelector.title", "Emergency Response Portal")}</h1>
          </div>

          <div className="location-checking-section">
            <Loader2 size={40} className="spin" />
            <p className="location-message">
              {t("roleSelector.checkingLocation", "Checking location access...")}
            </p>
          </div>
        </div>

        <div className="login-branding">
          <span>{t("roleSelector.branding", "Disaster Response Resource Optimization Platform")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="role-selector-container">
      <div className="role-selector-card">
        <div className="role-selector-header">
          <div className="role-selector-logo">
            <div className="logo-icon">
              <ShieldCheck size={32} strokeWidth={2.5} />
            </div>
            <span className="logo-text">AEGIS</span>
          </div>
          <h1>{t("roleSelector.title", "Emergency Response Portal")}</h1>
          <p className="selector-subtitle">
            {t("roleSelector.subtitle", "Disaster Response Resource Optimization")}
          </p>
        </div>

        <div className="role-options">
          <p className="role-prompt">
            {t("roleSelector.prompt", "How would you like to continue?")}
          </p>

          {/* Public User Option */}
          <button
            className="role-option public"
            onClick={() => handleRoleSelect("public")}
          >
            <div className="role-icon public-icon">
              <User size={24} />
            </div>
            <div className="role-info">
              <span className="role-title">
                {t("roleSelector.publicUser", "Continue as Public User")}
              </span>
              <span className="role-description">
                {t(
                  "roleSelector.publicDesc",
                  "Report emergencies, missing persons, and share photos"
                )}
              </span>
            </div>
            <ChevronRight size={20} className="role-arrow" />
          </button>

          {/* Manager Option */}
          <button
            className="role-option manager"
            onClick={() => handleRoleSelect("manager")}
          >
            <div className="role-icon manager-icon">
              <ShieldCheck size={24} />
            </div>
            <div className="role-info">
              <span className="role-title">
                {t("roleSelector.manager", "Login as Manager")}
              </span>
              <span className="role-description">
                {t("roleSelector.managerDesc", "Full access to dashboard and coordination")}
              </span>
            </div>
            <ChevronRight size={20} className="role-arrow" />
          </button>

          {/* Volunteer Option */}
          <button
            className="role-option volunteer"
            onClick={() => handleRoleSelect("volunteer")}
          >
            <div className="role-icon volunteer-icon">
              <Users size={24} />
            </div>
            <div className="role-info">
              <span className="role-title">
                {t("roleSelector.volunteer", "Login as Volunteer")}
              </span>
              <span className="role-description">
                {t("roleSelector.volunteerDesc", "Access tasks and missions")}
              </span>
            </div>
            <ChevronRight size={20} className="role-arrow" />
          </button>
        </div>

        <div className="role-selector-footer">
          <p>{t("roleSelector.footer", "Select your role to continue")}</p>
        </div>
      </div>

      <div className="login-branding">
        <span>{t("roleSelector.branding", "Disaster Response Resource Optimization Platform")}</span>
      </div>
    </div>
  );
}
