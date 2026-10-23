import authMiddleware from "../middleware/authMiddleware.js";
import express from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  getEventAttendees,
  updateEvent,
  deleteEvent,
  removeEventAttendee,
} from "../controllers/eventController.js";

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", authMiddleware, createEvent);
router.post("/:id/register", registerForEvent);
router.get("/:id/attendees", authMiddleware, getEventAttendees);
router.delete("/:id/attendees/:attendeeId", authMiddleware, removeEventAttendee);
router.patch("/:id", authMiddleware, updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

export default router;
