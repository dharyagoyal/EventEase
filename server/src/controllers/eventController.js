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

// DELETE /api/v1/events/:id/registrations
export const deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const registration = await Registration.findOneAndDelete({
      event: id,
      email: email.trim().toLowerCase(),
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    await Event.updateOne(
      { _id: id, registeredCount: { $gt: 0 } },
      { $inc: { registeredCount: -1 } },
    );

    return res.status(200).json({
      success: true,
      message: "Registration deleted successfully",
    });
  } catch (error) {
    console.error("Delete registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete registration",
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
