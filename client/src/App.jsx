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
      <header className="site-header">
        <nav className="navbar">
          <Link className="brand" to="/">
            eventease<span className="brand-dot">.</span>
          </Link>

          <div className="nav-links">
            <a href="#events">explore events</a>
            <a href="#about">about</a>
          </div>

          <div className="nav-actions">
            <Link className="nav-organizer-link" to={isAuthenticated ? "/dashboard" : "/login"}>
              organizer dashboard
            </Link>

            <a className="nav-cta" href="#events">
              find events <ArrowUpRight size={15} />
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>
            make time for
            <br />
            <span>something amazing.</span>
          </h1>

          <p className="hero-copy">
            Discover workshops, meet curious minds, and turn
            your interests into experiences worth remembering.
          </p>

          <a className="hero-button" href="#events">
            explore events <ArrowUpRight size={18} />
          </a>
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <div className="section-kicker">THE GOOD STUFF</div>
              <h2>find your <span>thing.</span></h2>
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
            {filteredEvents.map((event) => {
              const seatsRemaining = Math.max(0, event.capacity - event.registeredCount);
              return (
                <article className="event-card" key={event._id}>
                  <div className="event-art">
                    <span className="event-art-icon"><Sparkles size={28} /></span>
                    <span className="event-number">EVENT / {event._id.slice(-4).toUpperCase()}</span>
                  </div>

                  <div className="event-content">
                    <div className="event-date-row">
                      <div className="event-date">
                        <CalendarDays size={14} />
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      {event.isTeamEvent && (
                        <span className="event-team-badge">Team event</span>
                      )}
                    </div>

                    <h3>{event.title}</h3>
                    <p className="event-description">{event.description}</p>

                    <div className="event-meta">
                      <span><MapPin size={14} />{event.venue}</span>
                      {seatsRemaining === 0 ? (
                        <span className="seats-soldout-mono">sold out</span>
                      ) : (
                        <span className="seats-left-mono">{seatsRemaining} seats left</span>
                      )}
                    </div>

                    <Link
                      to={`/events/${event._id}`}
                      className="event-button"
                    >
                      View event <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
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
    </div>
  );
}

export default App;
