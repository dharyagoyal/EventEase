import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function formatDateTimeLocal(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function EventModalForm({ event, onClose, onSuccess }) {
  const { token } = useAuth();
  const hasRegistrations = Boolean(event && (event.registeredCount || 0) > 0);

  const [formData, setFormData] = useState(() => {
    if (event) {
      return {
        title: event.title || "",
        description: event.description || "",
        venue: event.venue || "",
        date: formatDateTimeLocal(event.date),
        organizer: event.organizer || "",
        capacity: String(event.capacity ?? "50"),
        isTeamEvent: Boolean(event.isTeamEvent),
        minTeamSize:
          event.isTeamEvent &&
          event.minTeamSize !== undefined &&
          event.minTeamSize !== null
            ? String(event.minTeamSize)
            : "2",
        maxTeamSize:
          event.isTeamEvent &&
          event.maxTeamSize !== undefined &&
          event.maxTeamSize !== null
            ? String(event.maxTeamSize)
            : "4",
      };
    }
    return {
      title: "",
      description: "",
      venue: "",
      date: "",
      organizer: "",
      capacity: "50",
      isTeamEvent: false,
      minTeamSize: "2",
      maxTeamSize: "4",
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validations
    if (!formData.title.trim()) {
      setError("Event title is required.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (formData.description.length > 5000) {
      setError("Description cannot exceed 5000 characters.");
      return;
    }

    if (!formData.venue.trim()) {
      setError("Venue is required.");
      return;
    }

    if (!formData.date || isNaN(new Date(formData.date).getTime())) {
      setError("Please provide a valid date and time.");
      return;
    }

    const capacityNum = Number(formData.capacity);
    if (!Number.isInteger(capacityNum) || capacityNum < 1) {
      setError("Capacity must be a positive whole number (at least 1).");
      return;
    }

    if (
      event &&
      (event.registeredCount || 0) > 0 &&
      capacityNum < event.registeredCount
    ) {
      setError(
        `Capacity cannot be lower than current registrations (${event.registeredCount}).`
      );
      return;
    }

    let minSize = 1;
    let maxSize = 1;

    if (formData.isTeamEvent) {
      minSize = Number(formData.minTeamSize);
      maxSize = Number(formData.maxTeamSize);

      if (!Number.isInteger(minSize) || !Number.isInteger(maxSize)) {
        setError("Team sizes must be whole numbers.");
        return;
      }

      if (minSize < 2 || minSize > 10) {
        setError("Minimum team size must be between 2 and 10.");
        return;
      }

      if (maxSize < 2 || maxSize > 10) {
        setError("Maximum team size must be between 2 and 10.");
        return;
      }

      if (minSize > maxSize) {
        setError("Minimum team size cannot be greater than maximum team size.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        venue: formData.venue.trim(),
        date: new Date(formData.date).toISOString(),
        organizer: formData.organizer.trim(),
        capacity: capacityNum,
        isTeamEvent: formData.isTeamEvent,
        ...(formData.isTeamEvent
          ? {
              minTeamSize: minSize,
              maxTeamSize: maxSize,
            }
          : {}),
      };

      const authConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (event && event._id) {
        await axios.patch(
          `${API_URL}/events/${event._id}`,
          payload,
          authConfig
        );
      } else {
        await axios.post(
          `${API_URL}/events`,
          payload,
          authConfig
        );
      }

      const successMsg = event
        ? "Event updated successfully!"
        : "Event created successfully!";

      if (onSuccess) {
        onSuccess(successMsg);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not save event. Please check your details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-event-overlay">
      <div className="create-event-modal">
        <div className="create-event-header">
          <div>
            <p className="eyebrow">EVENT MANAGEMENT</p>
            <h2>{event ? "Edit event" : "Create a new event"}</h2>
            <p>Fill in the details to publish your event.</p>
          </div>

          <button
            type="button"
            className="create-event-close"
            onClick={onClose}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form className="create-event-form" onSubmit={handleSubmit}>
          <label>
            Event title
            <input
              type="text"
              placeholder="e.g. React Workshop"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </label>

          <label>
            Description
            <textarea
              placeholder="What is this event about?"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={6}
              maxLength={5000}
              required
            />
            <div className="create-event-textarea-footer">
              <span className="create-event-hint">
                Shown in full on the event page
              </span>
              <span
                className={`create-event-char-count ${
                  formData.description.length >= 4900 ? "near-limit" : ""
                }`}
              >
                {formData.description.length} / 5000
              </span>
            </div>
          </label>

          <label>
            Venue
            <input
              type="text"
              placeholder="e.g. BMSCE Campus"
              value={formData.venue}
              onChange={(e) =>
                setFormData({ ...formData, venue: e.target.value })
              }
              required
            />
          </label>

          <label>
            Date and time
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </label>

          <div className="create-event-row">
            <label>
              Organizer
              <input
                type="text"
                value={formData.organizer}
                placeholder="e.g. Cloud Club"
                placeholder="e.g. Cloud Club"
                onChange={(e) =>
                  setFormData({ ...formData, organizer: e.target.value })
                }
                required
              />
            </label>

            <label>
              Capacity
              <input
                type="number"
                min={
                  event && (event.registeredCount || 0) > 0
                    ? event.registeredCount
                    : 1
                }
                max="10000"
                step="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                required
              />
              {event && (event.registeredCount || 0) > 0 && (
                <span className="create-event-capacity-hint">
                  Current registrations: {event.registeredCount}
                </span>
              )}
            </label>
          </div>

          <div className="create-event-team-section">
            <label className="create-event-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isTeamEvent}
                disabled={hasRegistrations}
                onChange={(e) =>
                  setFormData({ ...formData, isTeamEvent: e.target.checked })
                }
              />
              <span>Team event</span>
            </label>

            {hasRegistrations && (
              <p className="create-event-note">
                Team settings can&apos;t be changed once people have registered.
              </p>
            )}

            {formData.isTeamEvent && (
              <div className="create-event-row create-event-team-inputs">
                <label>
                  Min team size
                  <input
                    type="number"
                    min="2"
                    max="10"
                    step="1"
                    value={formData.minTeamSize}
                    disabled={hasRegistrations}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minTeamSize: e.target.value,
                      })
                    }
                    required={formData.isTeamEvent}
                  />
                </label>

                <label>
                  Max team size
                  <input
                    type="number"
                    min="2"
                    max="10"
                    step="1"
                    value={formData.maxTeamSize}
                    disabled={hasRegistrations}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTeamSize: e.target.value,
                      })
                    }
                    required={formData.isTeamEvent}
                  />
                </label>
              </div>
            )}
          </div>

          {error && <p className="create-event-error">{error}</p>}

          <div className="create-event-actions">
            <button
              type="button"
              className="create-event-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-event-submit"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : event
                ? "Save changes"
                : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventModal({
  isOpen,
  onClose,
  event = null,
  onSuccess,
}) {
  if (!isOpen) return null;

  return (
    <EventModalForm
      key={event?._id || "create-new-event"}
      event={event}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

export { EventModal };
