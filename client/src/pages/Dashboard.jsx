import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  CalendarDays,
  Users,
  Ticket,
  Plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import DashboardTopbar from "../components/DashboardTopbar.jsx";
import EventModal from "../components/EventModal.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export default function Dashboard() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalSeatsRemaining: 0,
    perEvent: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/events/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const overview = response.data?.data || response.data || {};
      setAnalytics({
        totalEvents: overview.totalEvents ?? 0,
        totalRegistrations: overview.totalRegistrations ?? 0,
        totalSeatsRemaining: overview.totalSeatsRemaining ?? 0,
        perEvent: Array.isArray(overview.perEvent) ? overview.perEvent : [],
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't load workspace analytics. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    if (!token) {
      return;
    }

    axios
      .get(`${API_URL}/events/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (!active) return;
        const overview = response.data?.data || response.data || {};
        setAnalytics({
          totalEvents: overview.totalEvents ?? 0,
          totalRegistrations: overview.totalRegistrations ?? 0,
          totalSeatsRemaining: overview.totalSeatsRemaining ?? 0,
          perEvent: Array.isArray(overview.perEvent) ? overview.perEvent : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Couldn't load workspace analytics. Check that your backend is running."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleCreateSuccess = (msg) => {
    setFeedback(msg);
    fetchAnalytics();
  };

  return (
    <div className="dashboard-shell">
      <DashboardSidebar />

      <main className="dashboard-main">
        <DashboardTopbar breadcrumb="EventEase / Workspace" />

        <section className="dashboard-welcome">
          <div>
            <div className="section-kicker">YOUR WORKSPACE</div>
            <h1>
              Good evening, <span>{user?.name || "Organizer"}.</span>
            </h1>
            <p>Here's what's happening with your events.</p>
          </div>

          <button
            type="button"
            className="hero-button dashboard-create-button"
            onClick={() => {
              setFeedback("");
              setShowCreateModal(true);
            }}
          >
            <Plus size={18} />
            Create event
          </button>
        </section>

        {feedback && <p className="feedback">{feedback}</p>}

        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <CalendarDays size={20} />
            </span>
            <p>Total events</p>
            <strong>{loading ? "—" : analytics.totalEvents}</strong>
            <span className="dashboard-stat-note">Events in your workspace</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <Users size={20} />
            </span>
            <p>Total registrations</p>
            <strong>{loading ? "—" : analytics.totalRegistrations}</strong>
            <span className="dashboard-stat-note">Across all events</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              <Ticket size={20} />
            </span>
            <p>Seats remaining</p>
            <strong>{loading ? "—" : analytics.totalSeatsRemaining}</strong>
            <span className="dashboard-stat-note">Available places</span>
          </article>
        </section>

        <section className="dashboard-events-section" id="registrations-overview">
          <div className="dashboard-section-heading">
            <div>
              <h2>Registrations per event</h2>
              <p>Keep track of registrations across your events.</p>
            </div>
            {!loading && !error && (
              <span className="dashboard-event-count">
                {analytics.perEvent.length}{" "}
                {analytics.perEvent.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>

          {loading && <p className="feedback">Loading analytics overview...</p>}

          {!loading && error && (
            <div className="dashboard-empty">
              <p className="feedback error" style={{ marginBottom: "16px" }}>
                {error}
              </p>
              <button
                type="button"
                className="hero-button"
                onClick={fetchAnalytics}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && analytics.perEvent.length === 0 && (
            <div className="dashboard-empty">
              <CalendarDays size={30} />
              <h3>No events yet</h3>
              <p>Create your first event to get started.</p>
              <button
                type="button"
                className="hero-button dashboard-create-button"
                style={{ marginTop: "16px" }}
                onClick={() => {
                  setFeedback("");
                  setShowCreateModal(true);
                }}
              >
                <Plus size={18} />
                Create event
              </button>
            </div>
          )}

          {!loading && !error && analytics.perEvent.length > 0 && (
            <div className="dashboard-event-list">
              {analytics.perEvent.map((event) => {
                const fillPercent = Math.min(
                  100,
                  Math.max(0, event.fillPercent ?? 0)
                );

                return (
                  <article className="dashboard-event-card" key={event._id}>
                    <div className="dashboard-event-icon">
                      <CalendarDays size={22} />
                    </div>

                    <div className="dashboard-event-info">
                      <div className="dashboard-event-title-row">
                        <h3>{event.title}</h3>
                        {event.isTeamEvent && (
                          <span className="dashboard-team-badge">Team event</span>
                        )}
                      </div>
                      <span className="dashboard-event-date">
                        {event.date
                          ? new Date(event.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>

                    <div className="dashboard-event-capacity">
                      <div>
                        <strong>{event.registered}</strong>
                        <span> / {event.capacity} registered</span>
                      </div>
                      <div className="dashboard-progress">
                        <span style={{ width: `${fillPercent}%` }} />
                      </div>
                      <small>{event.seatsLeft} seats left</small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <EventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
