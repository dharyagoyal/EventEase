import { useAuth } from "../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  Mail,
  MapPin,
  Search,
  Trash2,
  Loader2,
} from "lucide-react";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import DashboardTopbar from "../components/DashboardTopbar.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function Attendees() {
  const { id } = useParams();
  const { token } = useAuth();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const handleRemoveAttendee = async (attendee) => {
    if (!attendee || !attendee._id) return;
    if (removingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${attendee.name} from this event? This will cancel their registration and free up a seat.`
    );

    if (!confirmed) return;

    setRemovingId(attendee._id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await axios.delete(
        `${API_URL}/events/${id}/attendees/${attendee._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAttendees((currentAttendees) =>
        currentAttendees.filter((item) => item._id !== attendee._id)
      );

      setEvent((currentEvent) => {
        if (!currentEvent) return currentEvent;
        const currentCount = currentEvent.registeredCount ?? 0;
        return {
          ...currentEvent,
          registeredCount: Math.max(0, currentCount - 1),
        };
      });

      setActionSuccess(
        response.data?.message || `Removed ${attendee.name} successfully.`
      );
    } catch (err) {
      if (err.response?.status === 401) {
        setActionError("Your session has expired. Please sign in again.");
      } else if (err.response?.status === 403) {
        setActionError(
          "You are not authorized to remove attendees from this event."
        );
      } else if (err.response?.status === 404) {
        setActionError(
          err.response?.data?.message || "Attendee registration not found."
        );
      } else {
        setActionError(
          err.response?.data?.message ||
            "Failed to remove attendee. Please try again."
        );
      }
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadAttendees() {
      setLoading(true);
      setError("");

      try {
        const [eventResponse, attendeeResponse] = await Promise.all([
          axios.get(`${API_URL}/events/${id}`),
          axios.get(`${API_URL}/events/${id}/attendees`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!active) return;

        const eventData = eventResponse.data.data;
        const attendeeData = attendeeResponse.data.data;

        setEvent(eventData?.event ?? eventData);
        setAttendees(
          Array.isArray(attendeeData)
            ? attendeeData
            : attendeeData?.attendees ?? attendeeResponse.data.attendees ?? []
        );
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Couldn't load attendees. Please check your backend."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAttendees();

    return () => {
      active = false;
    };
  }, [id, token]);

  const filteredAttendees = attendees.filter((attendee) =>
    `${attendee.name} ${attendee.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-shell">
      <DashboardSidebar />

      <main className="dashboard-main">
        <DashboardTopbar breadcrumb="EventEase / Attendees" />

        <section className="dashboard-welcome">
          <div>
            <div className="section-kicker">EVENT MANAGEMENT</div>
            <h1>Manage your <span>attendees.</span></h1>
            <p>
              {event?.title || "Review registrations for your event."}
            </p>
          </div>

          <Link to="/dashboard/events" className="dashboard-back-link">
            <ArrowLeft size={16} />
            Back to events
          </Link>
        </section>

        {event && (
          <section className="dashboard-stats">
            <article className="dashboard-stat-card">
              <span className="dashboard-stat-icon">
                <Users size={20} />
              </span>
              <p>Total registered</p>
              <strong>{attendees.length}</strong>
              <span className="dashboard-stat-note">
                Confirmed attendee records
              </span>
            </article>

            <article className="dashboard-stat-card">
              <span className="dashboard-stat-icon">
                <TicketIcon />
              </span>
              <p>Available seats</p>
              <strong>
                {Math.max(0, event.capacity - event.registeredCount)}
              </strong>
              <span className="dashboard-stat-note">
                Out of {event.capacity} total seats
              </span>
            </article>

            <article className="dashboard-stat-card">
              <span className="dashboard-stat-icon">
                <MapPin size={20} />
              </span>
              <p>Event venue</p>
              <strong className="attendee-venue">
                {event.venue}
              </strong>
              <span className="dashboard-stat-note">
                {new Date(event.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </article>
          </section>
        )}

        <section className="dashboard-events-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Registration list</h2>
              <p>People who have reserved a spot for this event.</p>
            </div>
          </div>

          {actionSuccess && (
            <div
              className="registration-feedback success"
              style={{ marginBottom: "20px" }}
              role="status"
            >
              {actionSuccess}
            </div>
          )}

          {actionError && (
            <div
              className="registration-feedback error"
              style={{ marginBottom: "20px" }}
              role="alert"
            >
              {actionError}
            </div>
          )}

          <label className="attendee-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
            />
          </label>

          {loading && (
            <p className="feedback">Loading attendee records...</p>
          )}

          {!loading && error && (
            <div className="dashboard-empty">
              <p>{error}</p>
              <button
                className="event-button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredAttendees.length === 0 && (
            <div className="dashboard-empty">
              <Users size={30} />
              <h3>
                {search ? "No matching attendees" : "No registrations yet"}
              </h3>
              <p>
                {search
                  ? "Try searching with a different name or email."
                  : "New registrations will appear here."}
              </p>
            </div>
          )}

          {!loading && !error && filteredAttendees.length > 0 && (
            <div className="attendee-table-wrap">
              <table className="attendee-table">
                <thead>
                  <tr>
                    <th>ATTENDEE</th>
                    <th>EMAIL ADDRESS</th>
                    <th>REGISTERED ON</th>
                    <th className="attendee-actions-header">ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendees.map((attendee) => (
                    <tr key={attendee._id}>
                      <td>
                        <div className="attendee-name-cell">
                          <span className="attendee-avatar">
                            {attendee.name?.charAt(0).toUpperCase() || "A"}
                          </span>
                          <strong>{attendee.name}</strong>
                        </div>
                      </td>

                      <td>
                        <span className="attendee-email">
                          <Mail size={14} />
                          {attendee.email}
                        </span>
                      </td>

                      <td>
                        {attendee.createdAt
                          ? new Date(attendee.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </td>

                      <td className="attendee-actions-cell">
                        <button
                          type="button"
                          className="dashboard-delete-button attendee-remove-button"
                          onClick={() => handleRemoveAttendee(attendee)}
                          disabled={Boolean(removingId)}
                          aria-label={`Remove attendee ${attendee.name}`}
                          title="Remove attendee"
                        >
                          {removingId === attendee._id ? (
                            <Loader2 size={16} className="spinner" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="attendee-table-footer">
                Showing {filteredAttendees.length} of {attendees.length} attendees
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function TicketIcon() {
  return <CalendarDays size={20} />;
}

export default Attendees;
