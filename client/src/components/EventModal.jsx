import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function EventModalForm({ event, onClose, onSuccess }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState(() => {
    if (event) {
      return {
        title: event.title || "",
        description: event.description || "",
        venue: event.venue || "",
        date: event.date
          ? new Date(event.date).toISOString().slice(0, 16)
          : "",
        organizer: event.organizer || "CodeIO",
        capacity: String(event.capacity ?? "50"),
      };
    }
    return {
      title: "",
      description: "",
      venue: "",
      date: "",
      organizer: "CodeIO",
      capacity: "50",
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        capacity: Number(formData.capacity),
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
              rows={3}
              required
            />
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
                min="1"
                max="10000"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                required
              />
            </label>
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
