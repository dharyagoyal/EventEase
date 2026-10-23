import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardTopbar({ breadcrumb = "EventEase / Workspace" }) {
  const { user, logout } = useAuth();

  return (
    <header className="dashboard-topbar">
      <span>{breadcrumb}</span>

      <div className="dashboard-profile">
        <span className="dashboard-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || "O"}
        </span>
        <span>{user?.name || "Organizer"}</span>

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
