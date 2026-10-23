import { useAuth } from "../context/AuthContext.jsx";
import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  UserCheck,
  Mail,
  MapPin,
  Search,
  Trash2,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [expandedTeams, setExpandedTeams] = useState({});

  const handleExportCSV = async () => {
    if (exporting || attendees.length === 0) return;
    setExporting(true);
    setExportError("");

    try {
      const response = await axios.get(
        `${API_URL}/events/${id}/attendees/export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      let filename = "attendees.csv";
      const disposition =
        response.headers?.["content-disposition"] ||
        (response.headers?.get && response.headers.get("content-disposition"));

      if (disposition) {
        const match = disposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i
        );
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "").trim();
        }
      }

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let errorMessage = "Failed to export attendees. Please try again.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) {
            errorMessage = parsed.message;
          }
        } catch {
          // Response blob was not valid JSON
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setExportError(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleRemoveAttendee = async (attendee) => {
    if (!attendee || !attendee._id) return;
    if (removingId) return;

    const isTeam = Boolean(
      attendee.teamName ||
        (Array.isArray(attendee.teamMembers) &&
          attendee.teamMembers.length > 0) ||
        event?.isTeamEvent
    );

    const displayName = attendee.teamName || attendee.name;

    const confirmed = window.confirm(
      isTeam
        ? `Are you sure you want to remove team "${displayName}"? Removing it removes the whole team (leader and all members) and frees one seat.`
        : `Are you sure you want to remove ${attendee.name} from this event? This will cancel their registration and free up a seat.`
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
        response.data?.message ||
          (isTeam
            ? `Removed team "${displayName}" successfully.`
            : `Removed ${attendee.name} successfully.`)
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

  const matchesSearch = (attendee, query) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;

    if (attendee.name && attendee.name.toLowerCase().includes(q)) return true;
    if (attendee.email && attendee.email.toLowerCase().includes(q)) return true;
    if (attendee.usn && attendee.usn.toLowerCase().includes(q)) return true;
    if (attendee.teamName && attendee.teamName.toLowerCase().includes(q))
      return true;

    if (Array.isArray(attendee.teamMembers)) {
      for (const member of attendee.teamMembers) {
        if (!member) continue;
        if (member.name && member.name.toLowerCase().includes(q)) return true;
        if (member.email && member.email.toLowerCase().includes(q)) return true;
        if (member.usn && member.usn.toLowerCase().includes(q)) return true;
      }
    }

    return false;
  };

  const hasMemberSearchMatch = (attendee, query) => {
    if (!query) return false;
    const q = query.trim().toLowerCase();
    if (!q) return false;
    if (!Array.isArray(attendee.teamMembers)) return false;
    return attendee.teamMembers.some(
      (m) =>
        m &&
        ((m.name && m.name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.usn && m.usn.toLowerCase().includes(q)))
    );
  };

  const isRowExpanded = (attendee) => {
    if (expandedTeams[attendee._id] !== undefined) {
      return expandedTeams[attendee._id];
    }
    return Boolean(search.trim()) && hasMemberSearchMatch(attendee, search);
  };

  const toggleExpand = (attendeeId, currentlyExpanded) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [attendeeId]: !currentlyExpanded,
    }));
  };

  const filteredAttendees = attendees.filter((item) =>
    matchesSearch(item, search)
  );

  const totalRegistered = attendees.length;
  const totalPeople = attendees.reduce((acc, curr) => {
    const memberCount = Array.isArray(curr.teamMembers)
      ? curr.teamMembers.length
      : 0;
    return acc + 1 + memberCount;
  }, 0);

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

          <div className="dashboard-welcome-actions">
            <button
              type="button"
              className="attendees-export-btn"
              onClick={handleExportCSV}
              disabled={exporting || loading || attendees.length === 0}
              title={
                attendees.length === 0
                  ? "No registrations to export"
                  : "Export attendees as CSV"
              }
              aria-label="Export attendees as CSV"
            >
              {exporting ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <Download size={16} />
              )}
              {exporting ? "Exporting..." : "Export CSV"}
            </button>

            <Link to="/dashboard/events" className="dashboard-back-link">
              <ArrowLeft size={16} />
              Back to events
            </Link>
          </div>
        </section>

        {event && (
          <section className="dashboard-stats attendees-stats">
            <article className="dashboard-stat-card">
              <span className="dashboard-stat-icon">
                <Users size={20} />
              </span>
              <p>Total registered</p>
              <strong>{totalRegistered}</strong>
              <span className="dashboard-stat-note">
                {event.isTeamEvent ? "Total registered teams" : "Confirmed registrations"}
              </span>
            </article>

            <article className="dashboard-stat-card">
              <span className="dashboard-stat-icon">
                <UserCheck size={20} />
              </span>
              <p>Total people</p>
              <strong>{totalPeople}</strong>
              <span className="dashboard-stat-note">
                Leaders plus all team members
              </span>
            </article>

            <article className="dashboard-stat-card">
              <span className="dashboard-stat-icon">
                <TicketIcon />
              </span>
              <p>Available seats</p>
              <strong>
                {Math.max(
                  0,
                  (event.capacity ?? 0) - (event.registeredCount ?? totalRegistered)
                )}
              </strong>
              <span className="dashboard-stat-note">
                Out of {event.capacity} total {event.isTeamEvent ? "teams" : "seats"}
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

          {exportError && (
            <div
              className="registration-feedback error"
              style={{ marginBottom: "20px" }}
              role="alert"
            >
              {exportError}
            </div>
          )}

          <label className="attendee-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, USN, or team..."
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
                  ? "Try searching with a different name, email, USN, or team."
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
                    <th>USN</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>YEAR</th>
                    <th>REGISTERED ON</th>
                    <th className="attendee-actions-header">ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendees.map((attendee) => {
                    const isTeam = Boolean(
                      attendee.teamName ||
                        (Array.isArray(attendee.teamMembers) &&
                          attendee.teamMembers.length > 0) ||
                        event?.isTeamEvent
                    );
                    const isExpanded = isRowExpanded(attendee);
                    const displayName = isTeam
                      ? (attendee.teamName || attendee.name)
                      : attendee.name;

                    return (
                      <Fragment key={attendee._id}>
                        <tr>
                          <td>
                            <div className="attendee-name-cell">
                              {isTeam ? (
                                <>
                                  <button
                                    type="button"
                                    className="team-expand-toggle"
                                    onClick={() =>
                                      toggleExpand(attendee._id, isExpanded)
                                    }
                                    aria-expanded={isExpanded}
                                    aria-label={
                                      isExpanded
                                        ? "Collapse team members"
                                        : "Expand team members"
                                    }
                                    title={
                                      isExpanded
                                        ? "Collapse members"
                                        : "Expand members"
                                    }
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={16} />
                                    ) : (
                                      <ChevronRight size={16} />
                                    )}
                                  </button>

                                  <span className="attendee-avatar team-avatar">
                                    <Users size={16} />
                                  </span>

                                  <div className="attendee-title-group">
                                    <div className="attendee-team-line">
                                      <strong>{displayName}</strong>
                                      <span className="attendee-team-badge">
                                        Team
                                      </span>
                                    </div>
                                    <span className="attendee-leader-sub">
                                      Leader: {attendee.name}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="attendee-avatar">
                                    {attendee.name?.charAt(0).toUpperCase() ||
                                      "A"}
                                  </span>
                                  <div className="attendee-title-group">
                                    <strong>{attendee.name}</strong>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>

                          <td>{attendee.usn || "-"}</td>

                          <td>
                            <span className="attendee-email">
                              <Mail size={14} />
                              {attendee.email || "-"}
                            </span>
                          </td>

                          <td>{attendee.phone || "-"}</td>

                          <td>
                            {attendee.yearOfStudy != null
                              ? attendee.yearOfStudy
                              : "-"}
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
                              : "-"}
                          </td>

                          <td className="attendee-actions-cell">
                            <button
                              type="button"
                              className="dashboard-delete-button attendee-remove-button"
                              onClick={() => handleRemoveAttendee(attendee)}
                              disabled={Boolean(removingId)}
                              aria-label={
                                isTeam
                                  ? `Remove team ${displayName}`
                                  : `Remove attendee ${attendee.name}`
                              }
                              title={isTeam ? "Remove team" : "Remove attendee"}
                            >
                              {removingId === attendee._id ? (
                                <Loader2 size={16} className="spinner" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isTeam && isExpanded && (
                          <tr className="team-members-expand-row">
                            <td colSpan={7}>
                              <div className="team-members-subpanel">
                                <div className="team-members-header">
                                  <Users size={14} />
                                  <span>
                                    Other Members (
                                    {attendee.teamMembers?.length || 0})
                                  </span>
                                </div>

                                {Array.isArray(attendee.teamMembers) &&
                                attendee.teamMembers.length > 0 ? (
                                  <div className="team-subtable-wrap">
                                    <table className="team-subtable">
                                      <thead>
                                        <tr>
                                          <th>NAME</th>
                                          <th>USN</th>
                                          <th>EMAIL</th>
                                          <th>PHONE</th>
                                          <th>YEAR</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {attendee.teamMembers.map(
                                          (member, mIdx) => (
                                            <tr
                                              key={
                                                member._id ||
                                                `${attendee._id}-mem-${mIdx}`
                                              }
                                            >
                                              <td>
                                                <div className="member-name-cell">
                                                  <span className="member-bullet" />
                                                  <strong>
                                                    {member.name || "-"}
                                                  </strong>
                                                </div>
                                              </td>
                                              <td>{member.usn || "-"}</td>
                                              <td>
                                                <span className="attendee-email">
                                                  <Mail size={13} />
                                                  {member.email || "-"}
                                                </span>
                                              </td>
                                              <td>{member.phone || "-"}</td>
                                              <td>
                                                {member.yearOfStudy != null
                                                  ? member.yearOfStudy
                                                  : "-"}
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="team-empty-members">
                                    No additional team members listed.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              <div className="attendee-table-footer">
                Showing {filteredAttendees.length} of {attendees.length}{" "}
                {attendees.length === 1 ? "registration" : "registrations"}
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
