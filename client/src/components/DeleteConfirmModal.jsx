import { Trash2 } from "lucide-react";

export default function DeleteConfirmModal({
  isOpen,
  event,
  onClose,
  onConfirm,
  loading = false,
}) {
  if (!isOpen || !event) return null;

  return (
    <div className="create-event-overlay" role="dialog" aria-modal="true">
      <div className="create-event-modal" style={{ maxWidth: "460px" }}>
        <div className="create-event-header">
          <div>
            <p className="eyebrow">CONFIRM DELETION</p>
            <h2>Delete event</h2>
            <p>
              Are you sure you want to delete &ldquo;{event.title}&rdquo;? This will also remove its registrations.
            </p>
          </div>

          <button
            type="button"
            className="create-event-close"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="create-event-actions">
          <button
            type="button"
            className="create-event-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="dashboard-delete-button"
            style={{
              width: "auto",
              padding: "10px 18px",
              height: "auto",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            <Trash2 size={16} />
            {loading ? "Deleting..." : "Delete event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { DeleteConfirmModal };
