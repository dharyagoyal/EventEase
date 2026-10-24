import { useAuth } from "../context/AuthContext.jsx";
import { displayNameFromEmail } from "../utils/displayName.js";

export default function DashboardTopbar({ breadcrumb = "EventEase / Workspace" }) {
  const { user, logout } = useAuth();
  const displayName = displayNameFromEmail(user?.email);

  return (
    <header className="dashboard-topbar">
      <span className="dashboard-breadcrumb">{breadcrumb}</span>

      <div className="dashboard-profile">
        <span className="dashboard-avatar">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="dashboard-user-name">{displayName}</span>

        <button
          type="button"
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
          className="dashboard-logout-button"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
