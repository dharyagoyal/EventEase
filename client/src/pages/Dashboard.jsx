
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  Ticket,
  Plus,
  LayoutDashboard,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    venue: "",
    date: "",
    organizer: "CodeIO",
    capacity: "50",
  });

  useEffect(() => {
    axios
      .get(`${API_URL}/events`)
      .then((response) => setEvents(response.data.data))
      .catch(() => setError("Couldn't load events. Check that your backend is running."))
      .finally(() => setLoading(false));
  }, []);


  
const handleCreateEvent = async (e) => {
  e.preventDefault();

  setCreating(true);
  setCreateError("");
  setCreateSuccess("");

  try {
    const payload = {
      ...newEvent,
      date: new Date(newEvent.date).toISOString(),
      capacity: Number(newEvent.capacity),
    };

    if (editingEvent) {
      await axios.patch(
        `${API_URL}/events/${editingEvent._id}`,
        payload
      );
    } else {
      await axios.post(`${API_URL}/events`, payload);
    }

    const response = await axios.get(`${API_URL}/events`);
    setEvents(response.data.data);

    setShowCreateForm(false);
    setEditingEvent(null);
    setNewEvent({
      title: "",
      description: "",
      venue: "",
      date: "",
      organizer: "CodeIO",
      capacity: "50",
    });

    setCreateSuccess(
      editingEvent
        ? "Event updated successfully!"
        : "Event created successfully!"
    );
  } catch (err) {
    setCreateError(
      err.response?.data?.message ||
        "Could not save event. Please check your details."
    );
  } finally {
    setCreating(false);
  }
};



  const totalRegistrations = events.reduce(
    (total, event) => total + event.registeredCount,
    0
  );
  

  const totalSeats = events.reduce(
    (total, event) => total + event.capacity,
    0
  );

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="brand">
          <span className="brand-icon">✦</span>
          eventease<span className="brand-dot">.</span>
        </Link>

        <div className="dashboard-nav-label">WORKSPACE</div>

        <div className="dashboard-nav-item active">
          <LayoutDashboard size={18} />
          Overview
        </div>

        <a className="dashboard-nav-item" href="#dashboard-events">
          <CalendarDays size={18} />
          My events
        </a>

        <div className="dashboard-sidebar-bottom">
          <Link to="/" className="dashboard-back-link">
            <ArrowLeft size={16} />
            Back to event discovery
          </Link>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <span>EventEase / Workspace</span>
          <span className="dashboard-profile">
            <span className="dashboard-avatar">O</span>
            Organizer
          </span>
        </header>

        <section className="dashboard-welcome">
          <div>
            <div className="section-kicker">YOUR WORKSPACE</div>
            <h1>Good evening, <span>Organizer.</span></h1>
            <p>Here's what's happening with your events.</p>
          </div>

          <button
  type="button"
  className="hero-button dashboard-create-button"
  onClick={() => {
    setShowCreateForm(true);
    setCreateError("");
    setCreateSuccess("");
  }}
>
  <Plus size={18} />
  Create event
</button>
        </section>

        {error && <p className="feedback error">{error}</p>}
        {createSuccess && (
          <p className="feedback">{createSuccess}</p>
        )}

        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon"><CalendarDays size={20} /></span>
            <p>Total events</p>
            <strong>{loading ? "—" : events.length}</strong>
            <span className="dashboard-stat-note">Events in your workspace</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon"><Users size={20} /></span>
            <p>Total registrations</p>
            <strong>{loading ? "—" : totalRegistrations}</strong>
            <span className="dashboard-stat-note">Across all events</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon"><Ticket size={20} /></span>
            <p>Seats remaining</p>
            <strong>{loading ? "—" : Math.max(0, totalSeats - totalRegistrations)}</strong>
            <span className="dashboard-stat-note">Available places</span>
          </article>
        </section>

        <section className="dashboard-events-section" id="dashboard-events">
          <div className="dashboard-section-heading">
            <div>
              <h2>Your events</h2>
              <p>Keep track of your workshops and their attendees.</p>
            </div>
            <span className="dashboard-event-count">
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
          </div>

          {loading && <p className="feedback">Loading your events...</p>}

          {!loading && !error && events.length === 0 && (
            <div className="dashboard-empty">
              <CalendarDays size={30} />
              <h3>No events yet</h3>
              <p>Create your first event to get started.</p>
            </div>
          )}

          <div className="dashboard-event-list">
            {events.map((event) => {
              const remaining = Math.max(
                0,
                event.capacity - event.registeredCount
              );
              const fillPercentage =
                event.capacity > 0
                  ? Math.min(100, (event.registeredCount / event.capacity) * 100)
                  : 0;

              return (
                <article className="dashboard-event-card" key={event._id}>
                  <div className="dashboard-event-icon">
                    <CalendarDays size={22} />
                  </div>

                  <div className="dashboard-event-info">
                    <h3>{event.title}</h3>
                    <p>
                      <MapPin size={14} />
                      {event.venue}
                    </p>
                    <span className="dashboard-event-date">
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
                      onClick={() => {
                        setEditingEvent(event);
                        setNewEvent({
                          title: event.title,
                          description: event.description,
                          venue: event.venue,
                          date: event.date
                            ? new Date(event.date).toISOString().slice(0, 16)
                            : "",
                          organizer: event.organizer,
                          capacity: String(event.capacity),
                        });
                        setCreateError("");
                        setCreateSuccess("");
                        setShowCreateForm(true);
                      }}
                      aria-label={`Edit ${event.title}`}
                      title="Edit event"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      className="dashboard-delete-button"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Are you sure you want to delete "${event.title}"? This will also remove its registrations.`
                        );

                        if (!confirmed) return;

                        try {
                          await axios.delete(`${API_URL}/events/${event._id}`);

                          setEvents((currentEvents) =>
                            currentEvents.filter((item) => item._id !== event._id)
                          );

                          setCreateSuccess("Event deleted successfully!");
                          setCreateError("");
                        } catch (err) {
                          setCreateError(
                            err.response?.data?.message || "Could not delete this event."
                          );
                          setCreateSuccess("");
                        }
                      }}
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
        </section>
      </main>
      {showCreateForm && (
  <div className="create-event-overlay">
    <div className="create-event-modal">
      <div className="create-event-header">
        <div>
          <p className="eyebrow">EVENT MANAGEMENT</p>
          <h2>{editingEvent ? "Edit event" : "Create a new event"}</h2>
          <p>Fill in the details to publish your event.</p>
        </div>

        <button
          type="button"
          className="create-event-close"
          onClick={() => setShowCreateForm(false)}
          aria-label="Close form"
        >
          ×
        </button>
      </div>

      <form className="create-event-form" onSubmit={handleCreateEvent}>
        <label>
          Event title
          <input
            type="text"
            placeholder="e.g. React Workshop"
            value={newEvent.title}
            onChange={(e) =>
              setNewEvent({ ...newEvent, title: e.target.value })
            }
            required
          />
        </label>

        <label>
          Description
          <textarea
            placeholder="What is this event about?"
            value={newEvent.description}
            onChange={(e) =>
              setNewEvent({ ...newEvent, description: e.target.value })
            }
            rows={3}
            required
          />
        </label>

        <label>
          Venue
          <input
            type="text"
            placeholder="e.g. BMSCE Campus"
            value={newEvent.venue}
            onChange={(e) =>
              setNewEvent({ ...newEvent, venue: e.target.value })
            }
            required
          />
        </label>

        <label>
          Date and time
          <input
            type="datetime-local"
            value={newEvent.date}
            onChange={(e) =>
              setNewEvent({ ...newEvent, date: e.target.value })
            }
            required
          />
        </label>

        <div className="create-event-row">
          <label>
            Organizer
            <input
              type="text"
              value={newEvent.organizer}
              onChange={(e) =>
                setNewEvent({ ...newEvent, organizer: e.target.value })
              }
              required
            />
          </label>

          <label>
            Capacity
            <input
              type="number"
              min="1"
              max="10000"
              value={newEvent.capacity}
              onChange={(e) =>
                setNewEvent({ ...newEvent, capacity: e.target.value })
              }
              required
            />
          </label>
        </div>

        {createError && (
          <p className="create-event-error">{createError}</p>
        )}

        <div className="create-event-actions">
          <button
            type="button"
            className="create-event-cancel"
            onClick={() => setShowCreateForm(false)}
          >
            Cancel
          </button>

          <button
  type="submit"
  className="create-event-submit"
  disabled={creating}
>
  {creating
  ? "Saving..."
  : editingEvent
    ? "Save changes"
    : "Create event"}
</button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
}

export default Dashboard;
