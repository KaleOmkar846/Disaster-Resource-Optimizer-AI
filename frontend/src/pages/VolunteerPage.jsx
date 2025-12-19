import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  Mic,
  Camera,
  Search,
  MapPin,
  Phone,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  AudioReporter,
  PhotoReporter,
  VolunteerTaskList,
  FloatingSOSButton,
  NotificationBell,
} from "../components";
import { missingPersonsAPI } from "../services/apiService";
import "./VolunteerPage.css";

// Missing Person Report Form Component
function MissingPersonReport() {
  const { t } = useTranslation();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "unknown",
    description: "",
    lastSeenAddress: "",
    reporterName: "",
    reporterPhone: "",
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setCurrentLocation(null)
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const report = {
        fullName: formData.fullName,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        description: { physical: formData.description },
        lastSeenLocation: {
          address: formData.lastSeenAddress,
          point: currentLocation
            ? {
                type: "Point",
                coordinates: [currentLocation.lng, currentLocation.lat],
              }
            : undefined,
        },
        lastSeenDate: new Date().toISOString(),
        reporterInfo: {
          name: formData.reporterName,
          phone: formData.reporterPhone,
        },
      };

      await missingPersonsAPI.report(report);
      setSuccess(true);
      setFormData({
        fullName: "",
        age: "",
        gender: "unknown",
        description: "",
        lastSeenAddress: "",
        reporterName: "",
        reporterPhone: "",
      });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="missing-success">
        <CheckCircle size={48} />
        <h3>{t("missingPerson.success.title")}</h3>
        <p>
          {t("missingPerson.success.message")}
        </p>
        <button onClick={() => setSuccess(false)} className="btn-primary">
          {t("missingPerson.success.button")}
        </button>
      </div>
    );
  }

  return (
    <form className="missing-report-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <Search size={24} />
        <div>
          <h3>{t("missingPerson.form.title")}</h3>
          <p>{t("missingPerson.form.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="form-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="form-section">
        <h4>{t("missingPerson.form.personInfo")}</h4>

        <div className="form-group">
          <label>
            <User size={14} /> {t("missingPerson.form.fullName")}
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            placeholder={t("missingPerson.form.fullNamePlaceholder")}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t("missingPerson.form.age")}</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: e.target.value })
              }
              placeholder={t("missingPerson.form.age")}
              min="0"
              max="150"
            />
          </div>
          <div className="form-group">
            <label>{t("missingPerson.form.gender")}</label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
            >
              <option value="unknown">{t("gender.unknown")}</option>
              <option value="male">{t("gender.male")}</option>
              <option value="female">{t("gender.female")}</option>
              <option value="other">{t("gender.other")}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>{t("missingPerson.form.description")}</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder={t("missingPerson.form.descriptionPlaceholder")}
            rows={3}
          />
        </div>
      </div>

      <div className="form-section">
        <h4>{t("missingPerson.form.lastSeenLocation")}</h4>

        <div className="form-group">
          <label>
            <MapPin size={14} /> {t("missingPerson.form.locationAddress")}
          </label>
          <input
            type="text"
            value={formData.lastSeenAddress}
            onChange={(e) =>
              setFormData({ ...formData, lastSeenAddress: e.target.value })
            }
            placeholder={t("missingPerson.form.locationPlaceholder")}
          />
        </div>

        {currentLocation && (
          <div className="location-detected">
            <MapPin size={14} />
            <span>
              {t("missingPerson.form.locationDetected")} {currentLocation.lat.toFixed(4)},{" "}
              {currentLocation.lng.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      <div className="form-section">
        <h4>{t("missingPerson.form.contactInfo")}</h4>

        <div className="form-group">
          <label>
            <User size={14} /> {t("missingPerson.form.yourName")}
          </label>
          <input
            type="text"
            value={formData.reporterName}
            onChange={(e) =>
              setFormData({ ...formData, reporterName: e.target.value })
            }
            placeholder={t("missingPerson.form.yourNamePlaceholder")}
            required
          />
        </div>

        <div className="form-group">
          <label>
            <Phone size={14} /> {t("missingPerson.form.phoneNumber")}
          </label>
          <input
            type="tel"
            value={formData.reporterPhone}
            onChange={(e) =>
              setFormData({ ...formData, reporterPhone: e.target.value })
            }
            placeholder="+1 234 567 8900"
            required
          />
        </div>
      </div>

      <button type="submit" className="btn-submit" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={18} className="spin" />
            {t("common.submitting")}
          </>
        ) : (
          <>
            <Search size={18} />
            {t("missingPerson.form.submitButton")}
          </>
        )}
      </button>
    </form>
  );
}

function VolunteerPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState("tasks"); // 'tasks' | 'voice' | 'photo' | 'missing'

  const tabs = [
    { id: "tasks", icon: ClipboardList, label: t("fieldOperations.tabs.myTasks") },
    { id: "voice", icon: Mic, label: t("fieldOperations.tabs.voiceReport") },
    { id: "photo", icon: Camera, label: t("fieldOperations.tabs.photoReport") },
    { id: "missing", icon: Search, label: t("fieldOperations.tabs.missingPerson") },
  ];

  return (
    <div className="volunteer-page">
      {/* Simple Header */}
      <header className="field-header">
        <div className="field-header-top">
          <h1>{t("fieldOperations.title")}</h1>
          <NotificationBell />
        </div>
        <p>{t("fieldOperations.subtitle")}</p>
      </header>

      {/* Large, Easy-to-Tap Action Cards */}
      <nav className="action-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`action-tab ${viewMode === tab.id ? "active" : ""}`}
          >
            <tab.icon size={24} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <main className="field-content">
        {viewMode === "tasks" && <VolunteerTaskList />}
        {viewMode === "voice" && <AudioReporter />}
        {viewMode === "photo" && <PhotoReporter />}
        {viewMode === "missing" && <MissingPersonReport />}
      </main>

      {/* Floating SOS Button - always visible */}
      <FloatingSOSButton volunteerId="current-volunteer" />
    </div>
  );
}

export default VolunteerPage;
