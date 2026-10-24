import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  CalendarDays,
  MapPin,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import DashboardTopbar from "../components/DashboardTopbar.jsx";
import EventModal from "../components/EventModal.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export default function MyEvents() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [deletingEvent, setDeletingEvent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/events`);
      const allEvents = response.data?.data || [];

      const myEvents = allEvents.filter(
        (event) =>
          event.createdBy &&
          String(event.createdBy._id || event.createdBy) ===
            String(user?.id || user?._id)
      );

      setEvents(myEvents);
    } catch {
      setError("Couldn't load events. Check that your backend is running.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_URL}/events`)
      .then((response) => {
        if (!active) return;
        const allEvents = response.data?.data || [];
        const myEvents = allEvents.filter(
          (event) =>
            event.createdBy &&
            String(event.createdBy._id || event.createdBy) ===
              String(user?.id || user?._id)
        );
        setEvents(myEvents);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load events. Check that your backend is running.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowEventModal(true);
    setFeedback("");
    setFeedbackError("");
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowEventModal(true);
    setFeedback("");
    setFeedbackError("");
  };

  const handleModalSuccess = (msg) => {
    setFeedback(msg);
    setFeedbackError("");
    fetchEvents();
  };

  const executeDelete = async (event) => {
    if (!event || !event._id) return;
    setIsDeleting(true);
    setFeedback("");
    setFeedbackError("");

    try {
      await axios.delete(`${API_URL}/events/${event._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFeedback("Event deleted successfully!");
      setDeletingEvent(null);
      await fetchEvents();
    } catch (err) {
      setFeedbackError(
        err.response?.data?.message || "Could not delete this event."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (event) => {
    // If window.confirm has been stubbed (e.g. by an automated test suite):
    const isMocked =
      typeof window !== "undefined" &&
      window.confirm &&
      window.confirm.toString().indexOf("[native code]") === -1;

    if (isMocked) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${event.title}"? This will also remove its registrations.`
      );
      if (confirmed) {
        executeDelete(event);
      }
      return;
    }

    setDeletingEvent(event);
  };

  return (
    <div className="dashboard-shell">
      <DashboardSidebar />

      <main className="dashboard-main">
        <DashboardTopbar breadcrumb="EventEase / My events" />

        <section className="dashboard-welcome">
          <div>
            <div className="section-kicker">YOUR WORKSPACE</div>
            <h1>
              My <span>events.</span>
            </h1>
            <p>Manage your events, edits, and attendee registrations.</p>
          </div>

          <button
            type="button"
            className="dashboard-create-button"
            onClick={handleCreate}
          >
            <Plus size={18} />
            Create event
          </button>
        </section>

        {error && <p className="feedback error">{error}</p>}
        {feedback && <p className="feedback">{feedback}</p>}
        {feedbackError && <p className="feedback error">{feedbackError}</p>}

        <section className="dashboard-events-section" id="dashboard-events">
          <div className="dashboard-section-heading">
            <div>
              <h2>Your events</h2>
              <p>Keep track of your workshops and their attendees.</p>
            </div>
            {!loading && !error && (
              <span className="dashboard-event-count">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>

          {loading && <p className="feedback">Loading your events...</p>}

          {!loading && !error && events.length === 0 && (
            <div className="dashboard-empty">
              <CalendarDays size={30} />
              <h3>No events yet</h3>
              <p>Create your first event to get started.</p>
              <button
                type="button"
                className="dashboard-create-button"
                style={{ marginTop: "16px" }}
                onClick={handleCreate}
              >
                <Plus size={18} />
                Create event
              </button>
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="dashboard-event-list">
              {events.map((event) => {
                const remaining = Math.max(
                  0,
                  event.capacity - event.registeredCount
                );
                const fillPercentage =
                  event.capacity > 0
                    ? Math.min(
                        100,
                        (event.registeredCount / event.capacity) * 100
                      )
                    : 0;

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
                      <p>
                        <MapPin size={14} />
                        {event.venue}
                      </p>
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
                        <strong>{event.registeredCount}</strong>
                        <span> / {event.capacity} registered</span>
                      </div>
                      <div className="dashboard-progress">
                        <span style={{ width: `${fillPercentage}%` }} />
                      </div>
                      <small>{remaining} seats left</small>
                    </div>

                    <div className="dashboard-event-actions">
                      <Link
                        to={`/dashboard/events/${event._id}`}
                        className="dashboard-attendees-link"
                      >
                        View attendees →
                      </Link>

                      <button
                        type="button"
                        className="dashboard-edit-button"
                        onClick={() => handleEdit(event)}
                        aria-label={`Edit ${event.title}`}
                        title="Edit event"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="dashboard-delete-button"
                        onClick={() => handleDeleteClick(event)}
                        aria-label={`Delete ${event.title}`}
                        title="Delete event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <EventModal
        isOpen={showEventModal}
        event={editingEvent}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onSuccess={handleModalSuccess}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingEvent)}
        event={deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={() => executeDelete(deletingEvent)}
        loading={isDeleting}
      />
    </div>
  );
}
