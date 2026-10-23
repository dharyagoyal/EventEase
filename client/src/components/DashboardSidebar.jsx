import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  LayoutDashboard,
} from "lucide-react";

export default function DashboardSidebar() {
  const location = useLocation();
  const isOverview = location.pathname === "/dashboard";
  const isMyEvents =
    location.pathname === "/dashboard/events" ||
    location.pathname.startsWith("/dashboard/events/");

  return (
    <aside className="dashboard-sidebar">
      <Link to="/" className="brand">
        <span className="brand-icon">✦</span>
        EventEase<span className="brand-dot">.</span>
      </Link>

      <div className="dashboard-nav-label">WORKSPACE</div>

      <Link
        to="/dashboard"
        className={`dashboard-nav-item ${isOverview ? "active" : ""}`}
      >
        <LayoutDashboard size={18} />
        Overview
      </Link>

      <Link
        to="/dashboard/events"
        className={`dashboard-nav-item ${isMyEvents ? "active" : ""}`}
      >
        <CalendarDays size={18} />
        My events
      </Link>

      <div className="dashboard-sidebar-bottom">
        <Link to="/" className="dashboard-back-link">
          <ArrowLeft size={16} />
          Back to event discovery
        </Link>
      </div>
    </aside>
  );
}
