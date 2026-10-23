import mongoose from "mongoose";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

const USN_REGEX = /^1BM\d{2}[A-Z]{2}\d{3}$/i;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePerson({ name, email, usn, phone, yearOfStudy }, label) {
  const prefix = label ? `${label}: ` : "";

  if (typeof name !== "string" || !name.trim()) {
    return `${prefix}name is required`;
  }
  if (name.trim().length > 100) {
    return `${prefix}name cannot exceed 100 characters`;
  }

  if (
    typeof email !== "string" ||
    !email.trim() ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    return `${prefix}enter a valid email address`;
  }
  if (email.trim().length > 254) {
    return `${prefix}email cannot exceed 254 characters`;
  }

  if (typeof usn !== "string" || !usn.trim() || !USN_REGEX.test(usn.trim())) {
    return `${prefix}invalid USN`;
  }

  const phoneStr =
    phone !== undefined && phone !== null ? String(phone).trim() : "";
  if (!PHONE_REGEX.test(phoneStr)) {
    return `${prefix}invalid phone number (must be 10 digits)`;
  }

  const yearNum = Number(yearOfStudy);
  if (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > 4) {
    return `${prefix}year of study must be between 1 and 4`;
  }

  return null;
}

// GET /api/v1/events — List all events
export const getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};

// GET /api/v1/events/:id — Get one event
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    });
  }
};

// POST /api/v1/events — Create an event
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      venue,
      date,
      organizer,
      capacity,
      isTeamEvent = false,
      minTeamSize = 1,
      maxTeamSize = 1,
    } = req.body;

    const teamEvent = Boolean(isTeamEvent);
    let minSize = 1;
    let maxSize = 1;

    if (teamEvent) {
      minSize = Number(minTeamSize);
      maxSize = Number(maxTeamSize);

      if (
        !Number.isInteger(minSize) ||
        !Number.isInteger(maxSize) ||
        minSize < 2 ||
        maxSize > 10 ||
        minSize > maxSize
      ) {
        return res.status(400).json({
          success: false,
          message:
            "For team events, team size must satisfy: 2 <= minTeamSize <= maxTeamSize <= 10",
        });
      }
    }

    const event = await Event.create({
      title,
      description,
      venue,
      date,
      organizer,
      createdBy: req.user._id,
      capacity,
      isTeamEvent: teamEvent,
      minTeamSize: minSize,
      maxTeamSize: maxSize,
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
};

// POST /api/v1/events/:id/register
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      usn,
      phone,
      yearOfStudy,
      teamName,
      teamMembers,
    } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.date <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Registration for this event has closed",
      });
    }

    if (event.registeredCount >= event.capacity) {
      return res.status(409).json({
        success: false,
        message: "Sorry, this event is full",
      });
    }

    const registrantLabel = event.isTeamEvent ? "Team Leader" : "Registrant";
    const registrantError = validatePerson(
      { name, email, usn, phone, yearOfStudy },
      registrantLabel
    );
    if (registrantError) {
      return res.status(400).json({
        success: false,
        message: registrantError,
      });
    }

    let cleanedTeamMembers = [];
    let cleanedTeamName;

    if (event.isTeamEvent) {
      if (
        typeof teamName !== "string" ||
        teamName.trim().length < 2 ||
        teamName.trim().length > 50
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Team name is required and must be between 2 and 50 characters",
        });
      }
      cleanedTeamName = teamName.trim();

      if (!Array.isArray(teamMembers)) {
        return res.status(400).json({
          success: false,
          message: "teamMembers array is required for team events",
        });
      }

      const totalTeamSize = 1 + teamMembers.length;
      const minTeamSize = event.minTeamSize || 2;
      const maxTeamSize = event.maxTeamSize || 10;

      if (totalTeamSize < minTeamSize || totalTeamSize > maxTeamSize) {
        return res.status(400).json({
          success: false,
          message:
            minTeamSize === maxTeamSize
              ? `Team size must be exactly ${minTeamSize} members (including the team leader). Currently have ${totalTeamSize}.`
              : `Team size must be between ${minTeamSize} and ${maxTeamSize} members (including the team leader). Currently have ${totalTeamSize}.`,
        });
      }

      for (let i = 0; i < teamMembers.length; i++) {
        const member = teamMembers[i];
        const memberLabel = `Member ${i + 2}`;

        if (!member || typeof member !== "object") {
          return res.status(400).json({
            success: false,
            message: `${memberLabel}: details are required`,
          });
        }

        const memberError = validatePerson(member, memberLabel);
        if (memberError) {
          return res.status(400).json({
            success: false,
            message: memberError,
          });
        }

        cleanedTeamMembers.push({
          name: member.name.trim(),
          email: member.email.trim().toLowerCase(),
          usn: member.usn.trim().toUpperCase(),
          phone: String(member.phone).trim(),
          yearOfStudy: Number(member.yearOfStudy),
        });
      }
    } else {
      if (
        (typeof teamName === "string" && teamName.trim().length > 0) ||
        (Array.isArray(teamMembers) && teamMembers.length > 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This is an individual event; teamName and teamMembers are not allowed",
        });
      }
      cleanedTeamMembers = [];
      cleanedTeamName = undefined;
    }

    // Duplicate checks within submission
    const submissionEmails = [
      { email: email.trim().toLowerCase(), label: registrantLabel },
      ...cleanedTeamMembers.map((m, idx) => ({
        email: m.email,
        label: `Member ${idx + 2}`,
      })),
    ];

    const submissionUsns = [
      { usn: usn.trim().toUpperCase(), label: registrantLabel },
      ...cleanedTeamMembers.map((m, idx) => ({
        usn: m.usn,
        label: `Member ${idx + 2}`,
      })),
    ];

    const seenEmails = new Map();
    for (const item of submissionEmails) {
      if (seenEmails.has(item.email)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate email within submission: ${item.email} is used by both ${seenEmails.get(item.email)} and ${item.label}`,
        });
      }
      seenEmails.set(item.email, item.label);
    }

    const seenUsns = new Map();
    for (const item of submissionUsns) {
      if (seenUsns.has(item.usn)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate USN within submission: ${item.usn} is used by both ${seenUsns.get(item.usn)} and ${item.label}`,
        });
      }
      seenUsns.set(item.usn, item.label);
    }

    // Duplicate checks against database for this event
    const emailList = submissionEmails.map((item) => item.email);
    const usnList = submissionUsns.map((item) => item.usn);

    const existingRegistration = await Registration.findOne({
      event: id,
      $or: [
        { email: { $in: emailList } },
        { "teamMembers.email": { $in: emailList } },
        { usn: { $in: usnList } },
        { "teamMembers.usn": { $in: usnList } },
      ],
    });

    if (existingRegistration) {
      const existingEmails = new Set(
        [
          existingRegistration.email?.toLowerCase(),
          ...(existingRegistration.teamMembers || []).map((m) =>
            m.email?.toLowerCase()
          ),
        ].filter(Boolean)
      );

      const existingUsns = new Set(
        [
          existingRegistration.usn?.toUpperCase(),
          ...(existingRegistration.teamMembers || []).map((m) =>
            m.usn?.toUpperCase()
          ),
        ].filter(Boolean)
      );

      const duplicateEmail = submissionEmails.find((item) =>
        existingEmails.has(item.email)
      );
      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: `Email '${duplicateEmail.email}' is already registered for this event`,
        });
      }

      const duplicateUsn = submissionUsns.find((item) =>
        existingUsns.has(item.usn)
      );
      if (duplicateUsn) {
        return res.status(409).json({
          success: false,
          message: `USN '${duplicateUsn.usn}' is already registered for this event`,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "A participant in this submission is already registered for this event",
      });
    }

    // Atomic capacity check and seat increment
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: id,
        date: { $gt: new Date() },
        $expr: { $lt: ["$registeredCount", "$capacity"] },
      },
      { $inc: { registeredCount: 1 } },
      { returnDocument: "after" }
    );

    if (!updatedEvent) {
      const currentEvent = await Event.findById(id);
      if (!currentEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }
      if (currentEvent.date <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Registration for this event has closed",
        });
      }
      return res.status(409).json({
        success: false,
        message: "Sorry, this event is full",
      });
    }

    try {
      const registration = await Registration.create({
        event: id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        usn: usn.trim().toUpperCase(),
        phone: String(phone).trim(),
        yearOfStudy: Number(yearOfStudy),
        teamName: cleanedTeamName,
        teamMembers: cleanedTeamMembers,
      });

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          registration,
          registeredCount: updatedEvent.registeredCount,
          remainingSeats: updatedEvent.capacity - updatedEvent.registeredCount,
        },
      });
    } catch (error) {
      // Roll back the reserved seat if registration fails
      await Event.updateOne(
        { _id: id, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: -1 } }
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This email or USN is already registered for the event",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to register for event",
    });
  }
};

// GET /api/v1/events/:id/attendees
export const getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.createdBy || String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view these attendees",
      });
    }

    const attendees = await Registration.find({ event: id })
      .select("name email usn phone yearOfStudy teamName teamMembers createdAt")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: attendees.length,
      data: attendees,
    });
  } catch (error) {
    console.error("Attendee list error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch attendees",
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "venue",
      "date",
      "organizer",
      "capacity",
      "isTeamEvent",
      "minTeamSize",
      "maxTeamSize",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      !event.createdBy ||
      event.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this event",
      });
    }

    if (updates.capacity !== undefined) {
      const parsedCapacity = Number(updates.capacity);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive whole number",
        });
      }
      if (parsedCapacity < event.registeredCount) {
        return res.status(400).json({
          success: false,
          message: "Capacity cannot be lower than current registrations",
        });
      }
      updates.capacity = parsedCapacity;
    }

    // Team setting guards if event already has registrations
    const hasRegistrations = event.registeredCount > 0;
    if (hasRegistrations) {
      const storedIsTeamEvent = Boolean(event.isTeamEvent);
      const storedMinTeamSize =
        event.minTeamSize !== undefined && event.minTeamSize !== null
          ? Number(event.minTeamSize)
          : (storedIsTeamEvent ? 2 : 1);
      const storedMaxTeamSize =
        event.maxTeamSize !== undefined && event.maxTeamSize !== null
          ? Number(event.maxTeamSize)
          : (storedIsTeamEvent ? 2 : 1);

      const isChangingTeamEvent =
        updates.isTeamEvent !== undefined &&
        Boolean(updates.isTeamEvent) !== storedIsTeamEvent;

      const isChangingMinTeamSize =
        updates.minTeamSize !== undefined &&
        Number(updates.minTeamSize) !== storedMinTeamSize;

      const isChangingMaxTeamSize =
        updates.maxTeamSize !== undefined &&
        Number(updates.maxTeamSize) !== storedMaxTeamSize;

      if (
        isChangingTeamEvent ||
        isChangingMinTeamSize ||
        isChangingMaxTeamSize
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot modify team settings (isTeamEvent, minTeamSize, maxTeamSize) once an event has registrations",
        });
      }
    }

    const finalIsTeamEvent =
      updates.isTeamEvent !== undefined
        ? Boolean(updates.isTeamEvent)
        : event.isTeamEvent;

    if (finalIsTeamEvent) {
      const finalMinTeamSize =
        updates.minTeamSize !== undefined
          ? Number(updates.minTeamSize)
          : event.minTeamSize;
      const finalMaxTeamSize =
        updates.maxTeamSize !== undefined
          ? Number(updates.maxTeamSize)
          : event.maxTeamSize;

      if (
        !Number.isInteger(finalMinTeamSize) ||
        !Number.isInteger(finalMaxTeamSize) ||
        finalMinTeamSize < 2 ||
        finalMaxTeamSize > 10 ||
        finalMinTeamSize > finalMaxTeamSize
      ) {
        return res.status(400).json({
          success: false,
          message:
            "For team events, team size must satisfy: 2 <= minTeamSize <= maxTeamSize <= 10",
        });
      }
      updates.minTeamSize = finalMinTeamSize;
      updates.maxTeamSize = finalMaxTeamSize;
      updates.isTeamEvent = true;
    } else if (updates.isTeamEvent === false) {
      updates.minTeamSize = 1;
      updates.maxTeamSize = 1;
      updates.isTeamEvent = false;
    }

    Object.assign(event, updates);
    await event.save();

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update event error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      !event.createdBy ||
      event.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this event",
      });
    }

    await Registration.deleteMany({ event: id });
    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: "Event and its registrations deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
};

export const removeEventAttendee = async (req, res) => {
  let session = null;

  try {
    const { id, attendeeId } = req.params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(attendeeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event or attendee ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      !event.createdBy ||
      event.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to remove attendees from this event",
      });
    }

    // Use a MongoDB transaction if connected and supported by the deployment (e.g. replica set/Atlas)
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }
    }

    const registration = await Registration.findOneAndDelete(
      {
        _id: attendeeId,
        event: id,
      },
      session ? { session } : {}
    );

    if (!registration) {
      if (session) {
        await session.abortTransaction();
      }
      return res.status(404).json({
        success: false,
        message: "Attendee registration not found",
      });
    }

    try {
      const updateResult = await Event.updateOne(
        { _id: id, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: -1 } },
        session ? { session } : {}
      );

      if (updateResult.matchedCount === 0) {
        await Event.updateOne(
          { _id: id },
          { $set: { registeredCount: 0 } },
          session ? { session } : {}
        );
      }

      if (session) {
        await session.commitTransaction();
      }
    } catch (countError) {
      if (session) {
        await session.abortTransaction();
      } else {
        // Fallback rollback when transactions are not supported
        try {
          await Registration.create({
            _id: registration._id,
            event: registration.event,
            name: registration.name,
            email: registration.email,
            usn: registration.usn,
            phone: registration.phone,
            yearOfStudy: registration.yearOfStudy,
            teamName: registration.teamName,
            teamMembers: registration.teamMembers,
          });
        } catch (rollbackError) {
          console.error(
            "Failed to restore registration after count update error:",
            rollbackError.message
          );
        }
      }
      throw countError;
    }

    return res.status(200).json({
      success: true,
      message: "Attendee removed successfully",
      data: {
        attendeeId: registration._id,
      },
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        // Session already aborted or closed
      }
    }
    console.error("Remove attendee error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove attendee",
    });
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        // Ignore session cleanup error
      }
    }
  }
};

// GET /api/v1/events/analytics/overview — Organizer analytics overview
export const getOrganizerAnalytics = async (req, res) => {
  try {
    const rawUserId = req.user._id;
    const organizerId = mongoose.isValidObjectId(rawUserId)
      ? new mongoose.Types.ObjectId(String(rawUserId))
      : rawUserId;

    const pipeline = [
      {
        $match: {
          $or: [
            { createdBy: organizerId },
            { createdBy: String(rawUserId) },
          ],
        },
      },
      {
        $sort: { date: 1, createdAt: 1 },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          date: 1,
          capacity: { $ifNull: ["$capacity", 0] },
          registered: { $ifNull: ["$registeredCount", 0] },
          isTeamEvent: { $ifNull: ["$isTeamEvent", false] },
          seatsLeft: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ["$capacity", 0] },
                  { $ifNull: ["$registeredCount", 0] },
                ],
              },
            ],
          },
          fillPercent: {
            $cond: [
              { $gt: [{ $ifNull: ["$capacity", 0] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $ifNull: ["$registeredCount", 0] },
                          { $ifNull: ["$capacity", 1] },
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $facet: {
          perEvent: [{ $match: {} }],
          totals: [
            {
              $group: {
                _id: null,
                totalEvents: { $sum: 1 },
                totalRegistrations: { $sum: "$registered" },
                totalSeatsRemaining: { $sum: "$seatsLeft" },
              },
            },
          ],
        },
      },
    ];

    const result = await Event.aggregate(pipeline);

    const facetData = (result && result[0]) || { perEvent: [], totals: [] };
    const totals = (facetData.totals && facetData.totals[0]) || {
      totalEvents: 0,
      totalRegistrations: 0,
      totalSeatsRemaining: 0,
    };

    const overview = {
      totalEvents: totals.totalEvents || 0,
      totalRegistrations: totals.totalRegistrations || 0,
      totalSeatsRemaining: totals.totalSeatsRemaining || 0,
      perEvent: facetData.perEvent || [],
    };

    return res.status(200).json({
      success: true,
      ...overview,
      data: overview,
    });
  } catch (error) {
    console.error("Analytics overview error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics overview",
    });
  }
};

function slugifyTitle(text) {
  if (!text) return "event";
  const slug = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "event";
}

function formatRegisteredDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // CSV formula injection defense:
  // prefix any cell starting with = + - @ with a single quote
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }

  // Escape commas, quotes and newlines
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// GET /api/v1/events/:id/attendees/export — Export event attendees as CSV
export const exportEventAttendeesCSV = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!event.createdBy || String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to export attendees for this event",
      });
    }

    const registrations = await Registration.find({ event: id }).sort({
      createdAt: 1,
    });

    const slug = slugifyTitle(event.title);
    const filename = `${slug}-attendees.csv`;

    const headers = [
      "Team Name",
      "Role",
      "Name",
      "USN",
      "Email",
      "Phone",
      "Year",
      "Registered On",
    ];

    const lines = [];
    lines.push(headers.map(escapeCsvCell).join(","));

    for (const reg of registrations) {
      const isTeam =
        Boolean(event.isTeamEvent) ||
        Boolean(reg.teamName) ||
        (Array.isArray(reg.teamMembers) && reg.teamMembers.length > 0);

      if (isTeam) {
        // Leader row
        lines.push(
          [
            reg.teamName || "",
            "Leader",
            reg.name || "",
            reg.usn || "",
            reg.email || "",
            reg.phone != null ? String(reg.phone) : "",
            reg.yearOfStudy != null ? String(reg.yearOfStudy) : "",
            formatRegisteredDate(reg.createdAt),
          ]
            .map(escapeCsvCell)
            .join(",")
        );

        // Member rows
        if (Array.isArray(reg.teamMembers)) {
          for (const member of reg.teamMembers) {
            if (!member) continue;
            lines.push(
              [
                reg.teamName || "",
                "Member",
                member.name || "",
                member.usn || "",
                member.email || "",
                member.phone != null ? String(member.phone) : "",
                member.yearOfStudy != null ? String(member.yearOfStudy) : "",
                formatRegisteredDate(reg.createdAt),
              ]
                .map(escapeCsvCell)
                .join(",")
            );
          }
        }
      } else {
        // Solo registration
        lines.push(
          [
            "",
            "Solo",
            reg.name || "",
            reg.usn || "",
            reg.email || "",
            reg.phone != null ? String(reg.phone) : "",
            reg.yearOfStudy != null ? String(reg.yearOfStudy) : "",
            formatRegisteredDate(reg.createdAt),
          ]
            .map(escapeCsvCell)
            .join(",")
        );
      }
    }

    const csvBody = lines.join("\r\n");
    const csvWithBom = `\uFEFF${csvBody}`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(csvWithBom);
  } catch (error) {
    console.error("Export attendees CSV error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to export attendees",
    });
  }
};

