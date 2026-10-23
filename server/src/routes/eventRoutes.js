import express from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  getEventAttendees,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", createEvent);
router.post("/:id/register", registerForEvent);
router.get("/:id/attendees", getEventAttendees);
router.patch("/:id", updateEvent);
router.delete("/:id", deleteEvent);

export default router;
