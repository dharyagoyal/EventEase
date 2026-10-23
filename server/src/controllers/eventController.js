import mongoose from "mongoose";
import Event from "../models/Event.js";

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
    const { title, description, venue, date, organizer, capacity } = req.body;

    const event = await Event.create({
      title,
      description,
      venue,
      date,
      organizer,
      createdBy: req.user._id,
      capacity,
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

import Registration from "../models/Registration.js";

// POST /api/v1/events/:id/register
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        date: { $gt: new Date() },
        $expr: { $lt: ["$registeredCount", "$capacity"] },
      },
      { $inc: { registeredCount: 1 } },
      { new: true },
    );

    if (!event) {
      const existingEvent = await Event.findById(id);

      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      if (existingEvent.date <= new Date()) {
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
        email: normalizedEmail,
      });

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          registration,
          registeredCount: event.registeredCount,
          remainingSeats: event.capacity - event.registeredCount,
        },
      });
    } catch (error) {
      // Roll back the reserved seat if registration fails.
      await Event.updateOne(
        { _id: id, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: -1 } },
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This email is already registered for the event",
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
      .select("name email createdAt")
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

    if (
      updates.capacity !== undefined &&
      updates.capacity < event.registeredCount
    ) {
      return res.status(400).json({
        success: false,
        message: "Capacity cannot be lower than current registrations",
      });
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
