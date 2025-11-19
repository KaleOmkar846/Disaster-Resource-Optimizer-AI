import React from "react";
import { VolunteerTaskList } from "../components";
import "./VolunteerPage.css";

function VolunteerPage() {
  return (
    <div className="volunteer-page">
      <header className="volunteer-header">
        <h1>Disaster Response - Volunteer Portal</h1>
        <p className="volunteer-subtitle">Verify tasks in your area</p>
      </header>

      <VolunteerTaskList />

      <footer className="volunteer-footer">
        <p>
          Need the dashboard? <a href="/dashboard">Go to Dashboard</a>
        </p>
      </footer>
    </div>
  );
}

export default VolunteerPage;
