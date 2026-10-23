import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Search, Sparkles, ArrowUpRight } from "lucide-react";
import axios from "axios";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function App() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registrationError, setRegistrationError] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/events`)
      .then((response) => setEvents(response.data.data))
      .catch(() => setError("Couldn't load events. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter((event) =>
    `${event.title} ${event.description} ${event.venue}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link className="brand" to="/">
          <span className="brand-icon"><Sparkles size={20} /></span>
          eventease<span className="brand-dot">.</span>
        </Link>

        <div className="nav-links">
          <a href="#events">Explore events</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <Link className="nav-organizer-link" to={isAuthenticated ? "/dashboard" : "/login"}>
            {isAuthenticated ? "Organizer dashboard" : "Organize events"}
          </Link>

          <a className="nav-cta" href="#events">
            Find your next event <ArrowUpRight size={16} />
          </a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-glow" />
          <div className="eyebrow">
            <span className="status-dot" /> YOUR NEXT EXPERIENCE STARTS HERE
          </div>

          <h1>
            Make time for
            <br />
            <span>something amazing.</span>
          </h1>

          <p className="hero-copy">
            Discover workshops, meet curious minds, and turn
            your interests into experiences worth remembering.
          </p>

          <a className="hero-button" href="#events">
            Explore events <ArrowUpRight size={18} />
          </a>

          <div className="hero-stats">
            <div><strong>{events.length.toString().padStart(2, "0")}</strong><span>EVENTS</span></div>
            <div className="stat-divider" />
            <div><strong>∞</strong><span>POSSIBILITIES</span></div>
            <div className="stat-divider" />
            <div><strong>01</strong><span>COMMUNITY</span></div>
          </div>
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <div className="section-kicker">THE GOOD STUFF</div>
              <h2>Find your <span>thing.</span></h2>
              <p>Experiences that bring people and ideas together.</p>
            </div>

            <label className="search-box">
              <Search size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events..."
              />
            </label>
          </div>

          {loading && <p className="feedback">Finding exciting events...</p>}
          {error && <p className="feedback error">{error}</p>}

          {!loading && !error && filteredEvents.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon"><CalendarDays size={26} /></span>
              <h3>{search ? "No matches just yet" : "Your next experience starts here."}</h3>
              <p>
                {search
                  ? "Try a different search term."
                  : "There aren't any events to show yet. Check back soon!"}
              </p>
            </div>
          )}

          <div className="event-grid">
            {filteredEvents.map((event) => (
              <article className="event-card" key={event._id}>
                <div className="event-art">
                  <span className="event-tag">FEATURED EXPERIENCE</span>
                  <span className="event-art-icon"><Sparkles size={30} /></span>
                  <span className="event-number">EVENT / {event._id.slice(-4).toUpperCase()}</span>
                </div>

                <div className="event-content">
                  <div className="event-date">
                    <CalendarDays size={15} />
                    {new Date(event.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                  <h3>{event.title}</h3>
                  <p className="event-description">{event.description}</p>

                  <div className="event-meta">
                    <span><MapPin size={15} />{event.venue}</span>
                    <span>{Math.max(0, event.capacity - event.registeredCount)} seats left</span>
                  </div>

                  <button
                    className="event-button"
                    onClick={() => {
                    setSelectedEvent(event);
                    setName("");
                    setEmail("");
                    setRegistrationMessage("");
                    setRegistrationError(false);
                  }}
                  >
                    View event <ArrowUpRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-strip" id="about">
          <Sparkles size={22} />
          <p>Less scrolling. More doing. <span>Make your next moment count.</span></p>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="/">eventease<span className="brand-dot">.</span></a>
        <p>Made for people who love showing up.</p>
        <span>© 2026 EventEase</span>
      </footer>

      
{selectedEvent && (
  <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
    <section
      className="registration-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="modal-close"
        type="button"
        onClick={() => setSelectedEvent(null)}
        aria-label="Close registration"
      >
        ×
      </button>

      <div className="section-kicker">SAVE YOUR SPOT</div>
      <h2 id="registration-title">You're in the <span>right place.</span></h2>
      <p className="modal-event-name">{selectedEvent.title}</p>

      <div className="modal-event-details">
        <span>
          <CalendarDays size={16} />
          {new Date(selectedEvent.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span>
          <MapPin size={16} />
          {selectedEvent.venue}
        </span>
        <span>
          {Math.max(
            0,
            selectedEvent.capacity - selectedEvent.registeredCount
          )} seats left
        </span>
      </div>

      <form
        className="registration-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setRegistering(true);
          setRegistrationMessage("");
          setRegistrationError(false);

          try {
            const response = await axios.post(
              `${API_URL}/events/${selectedEvent._id}/register`,
              { name: name.trim(), email: email.trim() }
            );

            setRegistrationMessage(
              response.data.message || "Registration successful!"
            );

            setEvents((currentEvents) =>
              currentEvents.map((item) =>
                item._id === selectedEvent._id
                  ? {
                      ...item,
                      registeredCount:
                        response.data.data?.event?.registeredCount ??
                        item.registeredCount + 1,
                    }
                  : item
              )
            );

            setSelectedEvent((current) =>
              current
                ? {
                    ...current,
                    registeredCount:
                      response.data.data?.event?.registeredCount ??
                      current.registeredCount + 1,
                  }
                : current
            );
          } catch (error) {
            setRegistrationError(true);
            setRegistrationMessage(
              error.response?.data?.message ||
                "Registration failed. Please try again."
            );
          } finally {
            setRegistering(false);
          }
        }}
      >
        <label>
          Your full name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Dharya Goyal"
            minLength={2}
            maxLength={100}
            required
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        {registrationMessage && (
          <p
            className={`registration-feedback ${
              registrationError ? "error" : "success"
            }`}
            role="status"
          >
            {registrationMessage}
          </p>
        )}

        <button
          className="hero-button modal-submit"
          type="submit"
          disabled={registering}
        >
          {registering ? "Saving your spot..." : "Register for event"}
          {!registering && <ArrowUpRight size={18} />}
        </button>
      </form>

      <p className="modal-footnote">
        Your spot is subject to availability. Duplicate registrations are not allowed.
      </p>
    </section>
  </div>
)}

    </div>
  );
}

export default App;
