import { useState, useId } from "react";
import axios from "axios";
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

// TODO: payment QR + screenshot upload (future)

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const USN_REGEX = /^1BM\d{2}[A-Z]{2}\d{3}$/i;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePersonFields(person, label) {
  const errors = {};
  const prefix = label ? `${label}: ` : "";

  const trimmedName = (person.name || "").trim();
  if (!trimmedName) {
    errors.name = `${prefix}Full name is required`;
  } else if (trimmedName.length > 100) {
    errors.name = `${prefix}Name cannot exceed 100 characters`;
  }

  const trimmedEmail = (person.email || "").trim();
  if (!trimmedEmail) {
    errors.email = `${prefix}Email address is required`;
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = `${prefix}Enter a valid email address`;
  } else if (trimmedEmail.length > 254) {
    errors.email = `${prefix}Email cannot exceed 254 characters`;
  }

  const trimmedUsn = (person.usn || "").trim();
  if (!trimmedUsn) {
    errors.usn = `${prefix}USN is required`;
  } else if (!USN_REGEX.test(trimmedUsn)) {
    errors.usn = `${prefix}Invalid USN (must match format 1BMxxXXxxx)`;
  }

  const trimmedPhone = (person.phone || "").trim();
  if (!trimmedPhone) {
    errors.phone = `${prefix}Phone number is required`;
  } else if (!PHONE_REGEX.test(trimmedPhone)) {
    errors.phone = `${prefix}Phone number must be exactly 10 digits`;
  }

  const yearNum = Number(person.yearOfStudy);
  if (!person.yearOfStudy || !Number.isInteger(yearNum) || yearNum < 1 || yearNum > 4) {
    errors.yearOfStudy = `${prefix}Select year of study (1-4)`;
  }

  return errors;
}

export default function RegistrationForm({ event, onRegistrationSuccess }) {
  const formId = useId();
  const isTeam = Boolean(event.isTeamEvent);

  const minTeamSize = isTeam ? Math.max(2, Number(event.minTeamSize) || 2) : 1;
  const maxTeamSize = isTeam ? Math.max(minTeamSize, Number(event.maxTeamSize) || 10) : 1;

  // Initial members for team: minTeamSize - 1 (since leader is member 1)
  const [teamName, setTeamName] = useState("");
  const [leader, setLeader] = useState({
    name: "",
    email: "",
    usn: "",
    phone: "",
    yearOfStudy: "",
  });

  const [teamMembers, setTeamMembers] = useState(() => {
    if (!isTeam) return [];
    const initialAdditionalCount = Math.max(0, minTeamSize - 1);
    return Array.from({ length: initialAdditionalCount }, () => ({
      name: "",
      email: "",
      usn: "",
      phone: "",
      yearOfStudy: "",
    }));
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalMembersCount = 1 + teamMembers.length;

  const handleLeaderChange = (field, value) => {
    let cleanVal = value;
    if (field === "usn") {
      cleanVal = value.toUpperCase();
    }
    setLeader((prev) => ({ ...prev, [field]: cleanVal }));

    // Clear error for this field
    if (fieldErrors[`leader_${field}`]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`leader_${field}`];
        return next;
      });
    }
    if (serverError) setServerError("");
  };

  const handleMemberChange = (index, field, value) => {
    let cleanVal = value;
    if (field === "usn") {
      cleanVal = value.toUpperCase();
    }
    setTeamMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: cleanVal };
      return next;
    });

    if (fieldErrors[`member_${index}_${field}`]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`member_${index}_${field}`];
        return next;
      });
    }
    if (serverError) setServerError("");
  };

  const handleAddMember = () => {
    if (totalMembersCount >= maxTeamSize) return;
    setTeamMembers((prev) => [
      ...prev,
      { name: "", email: "", usn: "", phone: "", yearOfStudy: "" },
    ]);
  };

  const handleRemoveMember = (indexToRemove) => {
    if (totalMembersCount <= minTeamSize) return;
    setTeamMembers((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    // Clear field errors associated with members since indices will shift
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = {};

    // 1. Validate team name if team event
    if (isTeam) {
      const trimmedTeamName = teamName.trim();
      if (!trimmedTeamName) {
        errors.teamName = "Team name is required";
      } else if (trimmedTeamName.length < 2 || trimmedTeamName.length > 50) {
        errors.teamName = "Team name must be between 2 and 50 characters";
      }

      if (totalMembersCount < minTeamSize || totalMembersCount > maxTeamSize) {
        errors.teamSize = minTeamSize === maxTeamSize
          ? `Team must have exactly ${minTeamSize} members`
          : `Team size must be between ${minTeamSize} and ${maxTeamSize} members`;
      }
    }

    // 2. Validate leader fields
    const leaderErrors = validatePersonFields(
      leader,
      isTeam ? "Team leader" : ""
    );
    Object.entries(leaderErrors).forEach(([field, msg]) => {
      errors[`leader_${field}`] = msg;
    });

    // 3. Validate member fields
    if (isTeam) {
      teamMembers.forEach((member, idx) => {
        const memberErrors = validatePersonFields(member, `Member ${idx + 2}`);
        Object.entries(memberErrors).forEach(([field, msg]) => {
          errors[`member_${idx}_${field}`] = msg;
        });
      });
    }

    // 4. Duplicate checks within submission
    const allPersons = [
      {
        keyPrefix: "leader",
        label: isTeam ? "Team leader" : "Registrant",
        email: (leader.email || "").trim().toLowerCase(),
        usn: (leader.usn || "").trim().toUpperCase(),
      },
      ...teamMembers.map((m, idx) => ({
        keyPrefix: `member_${idx}`,
        label: `Member ${idx + 2}`,
        email: (m.email || "").trim().toLowerCase(),
        usn: (m.usn || "").trim().toUpperCase(),
      })),
    ];

    const seenEmails = new Map();
    allPersons.forEach((person) => {
      if (!person.email) return;
      if (seenEmails.has(person.email)) {
        const prevLabel = seenEmails.get(person.email).label;
        errors[`${person.keyPrefix}_email`] = `Duplicate email: already used by ${prevLabel}`;
        errors[`${seenEmails.get(person.email).keyPrefix}_email`] = `Duplicate email: already used by ${person.label}`;
      } else {
        seenEmails.set(person.email, person);
      }
    });

    const seenUsns = new Map();
    allPersons.forEach((person) => {
      if (!person.usn) return;
      if (seenUsns.has(person.usn)) {
        const prevLabel = seenUsns.get(person.usn).label;
        errors[`${person.keyPrefix}_usn`] = `Duplicate USN: already used by ${prevLabel}`;
        errors[`${seenUsns.get(person.usn).keyPrefix}_usn`] = `Duplicate USN: already used by ${person.label}`;
      } else {
        seenUsns.set(person.usn, person);
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Build payload
    const payload = {
      name: leader.name.trim(),
      email: leader.email.trim().toLowerCase(),
      usn: leader.usn.trim().toUpperCase(),
      phone: leader.phone.trim(),
      yearOfStudy: Number(leader.yearOfStudy),
    };

    if (isTeam) {
      payload.teamName = teamName.trim();
      payload.teamMembers = teamMembers.map((m) => ({
        name: m.name.trim(),
        email: m.email.trim().toLowerCase(),
        usn: m.usn.trim().toUpperCase(),
        phone: m.phone.trim(),
        yearOfStudy: Number(m.yearOfStudy),
      }));
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/events/${event._id}/register`,
        payload
      );

      const resData = response.data.data;
      if (onRegistrationSuccess) {
        onRegistrationSuccess({
          teamName: payload.teamName,
          memberCount: isTeam ? totalMembersCount : 1,
          registeredCount: resData?.registeredCount,
          remainingSeats: resData?.remainingSeats,
          registration: resData?.registration,
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Registration failed. Please review your details and try again.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="event-registration-form" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="registration-error-banner" role="alert">
          <AlertCircle size={20} />
          <span>{serverError}</span>
        </div>
      )}

      {fieldErrors.teamSize && (
        <div className="registration-error-banner" role="alert">
          <AlertCircle size={20} />
          <span>{fieldErrors.teamSize}</span>
        </div>
      )}

      {isTeam && (
        <div className="team-meta-section">
          <div className="form-field">
            <label htmlFor={`${formId}-teamName`}>
              Team name <span className="field-required">*</span>
            </label>
            <input
              id={`${formId}-teamName`}
              type="text"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (fieldErrors.teamName) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.teamName;
                    return next;
                  });
                }
                if (serverError) setServerError("");
              }}
              placeholder="e.g. Binary Beasts"
              minLength={2}
              maxLength={50}
              className={fieldErrors.teamName ? "input-error" : ""}
              required
            />
            {fieldErrors.teamName && (
              <span className="field-error-text" role="alert">
                {fieldErrors.teamName}
              </span>
            )}
          </div>

          <div className="team-count-bar">
            <span className="team-size-counter">
              <Users size={16} />
              Members: {totalMembersCount} of {maxTeamSize} max
            </span>
            <span className="team-size-hint">
              (Min: {minTeamSize}, Max: {maxTeamSize})
            </span>
          </div>
        </div>
      )}

      {/* Leader block */}
      <fieldset className="member-fieldset">
        <legend className="member-legend">
          {isTeam ? "Member 1 (Team leader)" : "Personal details"}
        </legend>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor={`${formId}-leader-name`}>
              Full name <span className="field-required">*</span>
            </label>
            <input
              id={`${formId}-leader-name`}
              type="text"
              autoComplete="name"
              value={leader.name}
              onChange={(e) => handleLeaderChange("name", e.target.value)}
              placeholder="e.g. Alex Johnson"
              maxLength={100}
              className={fieldErrors.leader_name ? "input-error" : ""}
              required
            />
            {fieldErrors.leader_name && (
              <span className="field-error-text" role="alert">
                {fieldErrors.leader_name}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={`${formId}-leader-usn`}>
              USN <span className="field-required">*</span>
            </label>
            <input
              id={`${formId}-leader-usn`}
              type="text"
              value={leader.usn}
              onChange={(e) => handleLeaderChange("usn", e.target.value)}
              placeholder="1BM22CS001"
              maxLength={10}
              className={fieldErrors.leader_usn ? "input-error" : ""}
              required
            />
            {fieldErrors.leader_usn && (
              <span className="field-error-text" role="alert">
                {fieldErrors.leader_usn}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={`${formId}-leader-email`}>
              Email address <span className="field-required">*</span>
            </label>
            <input
              id={`${formId}-leader-email`}
              type="email"
              autoComplete="email"
              value={leader.email}
              onChange={(e) => handleLeaderChange("email", e.target.value)}
              placeholder="alex@example.com"
              maxLength={254}
              className={fieldErrors.leader_email ? "input-error" : ""}
              required
            />
            {fieldErrors.leader_email && (
              <span className="field-error-text" role="alert">
                {fieldErrors.leader_email}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={`${formId}-leader-phone`}>
              Phone number <span className="field-required">*</span>
            </label>
            <input
              id={`${formId}-leader-phone`}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={leader.phone}
              onChange={(e) => handleLeaderChange("phone", e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              className={fieldErrors.leader_phone ? "input-error" : ""}
              required
            />
            {fieldErrors.leader_phone && (
              <span className="field-error-text" role="alert">
                {fieldErrors.leader_phone}
              </span>
            )}
          </div>

          <div className="form-field form-field-full">
            <label htmlFor={`${formId}-leader-year`}>
              Year of study <span className="field-required">*</span>
            </label>
            <select
              id={`${formId}-leader-year`}
              value={leader.yearOfStudy}
              onChange={(e) => handleLeaderChange("yearOfStudy", e.target.value)}
              className={fieldErrors.leader_yearOfStudy ? "input-error" : ""}
              required
            >
              <option value="">Select year (1-4)</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
            {fieldErrors.leader_yearOfStudy && (
              <span className="field-error-text" role="alert">
                {fieldErrors.leader_yearOfStudy}
              </span>
            )}
          </div>
        </div>
      </fieldset>

      {/* Additional team members */}
      {isTeam &&
        teamMembers.map((member, idx) => {
          const memberNum = idx + 2;
          const isRemovable = totalMembersCount > minTeamSize;

          return (
            <fieldset key={idx} className="member-fieldset">
              <div className="member-legend-row">
                <legend className="member-legend">Member {memberNum}</legend>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(idx)}
                  className="member-remove-btn"
                  disabled={!isRemovable}
                  title={
                    isRemovable
                      ? `Remove Member ${memberNum}`
                      : `Cannot remove below minimum team size (${minTeamSize})`
                  }
                  aria-label={`Remove Member ${memberNum}`}
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor={`${formId}-m${idx}-name`}>
                    Full name <span className="field-required">*</span>
                  </label>
                  <input
                    id={`${formId}-m${idx}-name`}
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      handleMemberChange(idx, "name", e.target.value)
                    }
                    placeholder="e.g. Jordan Smith"
                    maxLength={100}
                    className={
                      fieldErrors[`member_${idx}_name`] ? "input-error" : ""
                    }
                    required
                  />
                  {fieldErrors[`member_${idx}_name`] && (
                    <span className="field-error-text" role="alert">
                      {fieldErrors[`member_${idx}_name`]}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor={`${formId}-m${idx}-usn`}>
                    USN <span className="field-required">*</span>
                  </label>
                  <input
                    id={`${formId}-m${idx}-usn`}
                    type="text"
                    value={member.usn}
                    onChange={(e) =>
                      handleMemberChange(idx, "usn", e.target.value)
                    }
                    placeholder="1BM22CS002"
                    maxLength={10}
                    className={
                      fieldErrors[`member_${idx}_usn`] ? "input-error" : ""
                    }
                    required
                  />
                  {fieldErrors[`member_${idx}_usn`] && (
                    <span className="field-error-text" role="alert">
                      {fieldErrors[`member_${idx}_usn`]}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor={`${formId}-m${idx}-email`}>
                    Email address <span className="field-required">*</span>
                  </label>
                  <input
                    id={`${formId}-m${idx}-email`}
                    type="email"
                    value={member.email}
                    onChange={(e) =>
                      handleMemberChange(idx, "email", e.target.value)
                    }
                    placeholder="jordan@example.com"
                    maxLength={254}
                    className={
                      fieldErrors[`member_${idx}_email`] ? "input-error" : ""
                    }
                    required
                  />
                  {fieldErrors[`member_${idx}_email`] && (
                    <span className="field-error-text" role="alert">
                      {fieldErrors[`member_${idx}_email`]}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor={`${formId}-m${idx}-phone`}>
                    Phone number <span className="field-required">*</span>
                  </label>
                  <input
                    id={`${formId}-m${idx}-phone`}
                    type="tel"
                    inputMode="numeric"
                    value={member.phone}
                    onChange={(e) =>
                      handleMemberChange(idx, "phone", e.target.value)
                    }
                    placeholder="9876543211"
                    maxLength={10}
                    className={
                      fieldErrors[`member_${idx}_phone`] ? "input-error" : ""
                    }
                    required
                  />
                  {fieldErrors[`member_${idx}_phone`] && (
                    <span className="field-error-text" role="alert">
                      {fieldErrors[`member_${idx}_phone`]}
                    </span>
                  )}
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor={`${formId}-m${idx}-year`}>
                    Year of study <span className="field-required">*</span>
                  </label>
                  <select
                    id={`${formId}-m${idx}-year`}
                    value={member.yearOfStudy}
                    onChange={(e) =>
                      handleMemberChange(idx, "yearOfStudy", e.target.value)
                    }
                    className={
                      fieldErrors[`member_${idx}_yearOfStudy`]
                        ? "input-error"
                        : ""
                    }
                    required
                  >
                    <option value="">Select year (1-4)</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                  {fieldErrors[`member_${idx}_yearOfStudy`] && (
                    <span className="field-error-text" role="alert">
                      {fieldErrors[`member_${idx}_yearOfStudy`]}
                    </span>
                  )}
                </div>
              </div>
            </fieldset>
          );
        })}

      {isTeam && (
        <div className="add-member-action">
          <button
            type="button"
            onClick={handleAddMember}
            className="add-member-btn"
            disabled={totalMembersCount >= maxTeamSize}
            title={
              totalMembersCount >= maxTeamSize
                ? `Maximum team size reached (${maxTeamSize})`
                : "Add another team member"
            }
          >
            <Plus size={16} />
            <span>Add member ({totalMembersCount} of {maxTeamSize})</span>
          </button>
        </div>
      )}

      <button
        type="submit"
        className="registration-submit-btn"
        disabled={submitting}
      >
        {submitting ? (
          "Submitting registration..."
        ) : (
          <>
            {isTeam ? "Register team" : "Register for event"}{" "}
            <ArrowUpRight size={18} />
          </>
        )}
      </button>

      <p className="registration-form-disclaimer">
        By registering, you confirm that all entered details are accurate and that
        seats are assigned on a first-come, first-served basis.
      </p>
    </form>
  );
}
