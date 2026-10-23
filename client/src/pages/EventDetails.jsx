import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  CalendarDays,
  MapPin,
  Users,
  Sparkles,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import RegistrationForm from "../components/RegistrationForm.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export default function EventDetails() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  useEffect(() => {
    let isMounted = true;

    axios
      .get(`${API_URL}/events/${id}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.data) {
          setEvent(res.data.data);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const status = err.response?.status;
        if (status === 404 || status === 400) {
          setNotFound(true);
        } else {
          setErrorMessage("Failed to load event. Please try again later.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSuccess = (details) => {
    setRegistrationSuccess(details);
    if (details.registeredCount !== undefined) {
      setEvent((prev) =>
        prev ? { ...prev, registeredCount: details.registeredCount } : prev
      );
    } else {
      setEvent((prev) =>
        prev ? { ...prev, registeredCount: (prev.registeredCount || 0) + 1 } : prev
      );
    }
  };

  const seatsLeft = event
    ? Math.max(0, event.capacity - (event.registeredCount || 0))
    : 0;

  const isPassed = event ? new Date(event.date) <= new Date() : false;
  const isSoldOut = seatsLeft <= 0;

  const fillPercent =
    event && event.capacity > 0
      ? Math.min(
          100,
          Math.round(((event.registeredCount || 0) / event.capacity) * 100)
        )
      : 0;

  const minTeam = event ? Math.max(2, Number(event.minTeamSize) || 2) : 2;
  const maxTeam = event ? Math.max(minTeam, Number(event.maxTeamSize) || 4) : 4;
  const teamBadgeText =
    minTeam === maxTeam
      ? `Team event (${minTeam} members)`
      : `Team event (${minTeam}-${maxTeam} members)`;

  return (
    <div className="app-shell">
      {/* Navigation */}
      <nav className="navbar">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Sparkles size={20} />
          </span>
          EventEase<span className="brand-dot">.</span>
        </Link>

        <div className="nav-links">
          <Link to="/#events">Explore events</Link>
          <a href="/#about">About</a>
        </div>

        <div className="nav-actions">
          <Link
            className="nav-organizer-link"
            to={isAuthenticated ? "/dashboard" : "/login"}
          >
            {isAuthenticated ? "Organizer dashboard" : "Organize events"}
          </Link>

          <Link className="nav-cta" to="/#events">
            Browse events <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>

      <main className="event-details-main">
        <div className="event-details-container">
          {/* Top back navigation */}
          <div className="event-details-topbar">
            <Link to="/#events" className="event-back-link">
              <ArrowLeft size={16} />
              <span>Back to events</span>
            </Link>
          </div>

          {loading && (
            <div className="event-details-loading">
              <div className="loading-spinner" />
              <p>Loading event information...</p>
            </div>
          )}

          {notFound && !loading && (
            <div className="event-details-not-found">
              <div className="not-found-icon">
                <AlertTriangle size={32} />
              </div>
              <h2>Event not found</h2>
              <p>
                The event you are looking for does not exist, has an invalid link,
                or has been removed.
              </p>
              <Link to="/#events" className="hero-button">
                <ArrowLeft size={16} /> Back to events
              </Link>
            </div>
          )}

          {errorMessage && !notFound && !loading && (
            <div className="event-details-not-found">
              <div className="not-found-icon">
                <AlertTriangle size={32} />
              </div>
              <h2>Something went wrong</h2>
              <p>{errorMessage}</p>
              <Link to="/#events" className="hero-button">
                <ArrowLeft size={16} /> Back to events
              </Link>
            </div>
          )}

          {event && !loading && !notFound && (
            <div className="event-details-layout">
              {/* Event Overview Hero */}
              <article className="event-details-hero">
                <div className="event-details-eyebrow">
                  <span className="event-tag">FEATURED EXPERIENCE</span>
                  {event.isTeamEvent && (
                    <span className="event-team-badge-large">
                      <Users size={14} />
                      {teamBadgeText}
                    </span>
                  )}
                  {isPassed && (
                    <span className="event-status-tag status-closed">
                      Registration closed
                    </span>
                  )}
                  {!isPassed && isSoldOut && (
                    <span className="event-status-tag status-soldout">
                      Sold out
                    </span>
                  )}
                </div>

                <h1 className="event-details-title">{event.title}</h1>

                <div className="event-meta-cards-grid">
                  <div className="event-meta-card">
                    <div className="event-meta-icon">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <span className="event-meta-label">Date & Time</span>
                      <strong className="event-meta-value">
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                      <span className="event-meta-sub">
                        {new Date(event.date).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="event-meta-card">
                    <div className="event-meta-icon">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <span className="event-meta-label">Venue</span>
                      <strong className="event-meta-value">{event.venue}</strong>
                      <span className="event-meta-sub">In-person</span>
                    </div>
                  </div>

                  <div className="event-meta-card">
                    <div className="event-meta-icon">
                      <Users size={20} />
                    </div>
                    <div>
                      <span className="event-meta-label">Organizer</span>
                      <strong className="event-meta-value">
                        {event.organizer}
                      </strong>
                      <span className="event-meta-sub">Host</span>
                    </div>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="event-capacity-section">
                  <div className="event-capacity-header">
                    <div className="event-capacity-title">
                      <Clock size={16} />
                      <strong>Seats availability</strong>
                    </div>
                    <span className="event-seats-left-pill">
                      {isSoldOut ? (
                        <span className="text-soldout">Sold out</span>
                      ) : (
                        <span>
                          <strong>{seatsLeft}</strong> {seatsLeft === 1 ? "seat" : "seats"} left
                        </span>
                      )}
                      <span className="text-muted-capacity">
                        ({event.registeredCount || 0} / {event.capacity} booked)
                      </span>
                    </span>
                  </div>

                  <div
                    className="capacity-track"
                    role="progressbar"
                    aria-valuenow={event.registeredCount || 0}
                    aria-valuemin="0"
                    aria-valuemax={event.capacity}
                  >
                    <div
                      className={`capacity-fill ${
                        isSoldOut ? "capacity-fill-full" : ""
                      }`}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="event-details-description-box">
                  <h3>About this event</h3>
                  <div className="event-full-description">
                    {event.description}
                  </div>
                </div>
              </article>

              {/* Registration Form / Status / Confirmation */}
              <section className="event-registration-column" id="register">
                {registrationSuccess ? (
                  <div className="registration-confirmation-panel" role="status">
                    <div className="confirmation-icon">
                      <CheckCircle2 size={40} />
                    </div>
                    <div className="section-kicker">REGISTRATION CONFIRMED</div>
                    <h2>You're in!</h2>
                    <p className="confirmation-event-name">{event.title}</p>

                    {event.isTeamEvent && (
                      <div className="confirmation-team-details">
                        <div className="confirmation-team-item">
                          <span>Team name:</span>
                          <strong>{registrationSuccess.teamName}</strong>
                        </div>
                        <div className="confirmation-team-item">
                          <span>Members registered:</span>
                          <strong>
                            {registrationSuccess.memberCount} members
                          </strong>
                        </div>
                      </div>
                    )}

                    <div className="confirmation-meta">
                      <p>
                        <CalendarDays size={16} />
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(event.date).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                      <p>
                        <MapPin size={16} />
                        {event.venue}
                      </p>
                    </div>

                    <p className="confirmation-notice">
                      Please carry your college ID and arrive at least 15 minutes
                      before the scheduled time.
                    </p>

                    <Link to="/#events" className="hero-button" style={{ marginTop: "20px" }}>
                      Explore more events <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ) : isPassed ? (
                  <div className="registration-status-card closed">
                    <div className="status-card-icon">
                      <Clock size={28} />
                    </div>
                    <h2>Registration closed</h2>
                    <p>
                      This event took place on{" "}
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      . Registrations are now closed.
                    </p>
                    <Link to="/#events" className="hero-button">
                      Browse upcoming events <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ) : isSoldOut ? (
                  <div className="registration-status-card soldout">
                    <div className="status-card-icon">
                      <AlertTriangle size={28} />
                    </div>
                    <h2>Sold out</h2>
                    <p>
                      All {event.capacity} seats for this event have been filled.
                      Please check back later or explore our other events.
                    </p>
                    <Link to="/#events" className="hero-button">
                      Browse other events <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <div className="registration-card">
                    <div className="registration-card-header">
                      <div className="section-kicker">SECURE YOUR SPOT</div>
                      <h2>
                        Register <span>now.</span>
                      </h2>
                      <p>
                        {event.isTeamEvent
                          ? `Register your team of ${minTeam}${
                              minTeam === maxTeam ? "" : ` to ${maxTeam}`
                            } participants.`
                          : "Fill in your details below to confirm your seat."}
                      </p>
                    </div>

                    <RegistrationForm
                      event={event}
                      onRegistrationSuccess={handleSuccess}
                    />
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <footer>
        <Link className="brand footer-brand" to="/">
          EventEase<span className="brand-dot">.</span>
        </Link>
        <p>Made for people who love showing up.</p>
        <span>© 2026 EventEase</span>
      </footer>
    </div>
  );
}
