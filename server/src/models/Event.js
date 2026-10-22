import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: 2000,
    },
    venue: {
      type: String,
      required: [true, "Event venue is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
      validate: {
        validator: (value) => value > new Date(),
        message: "Event date must be in the future",
      },
    },
    organizer: {
      type: String,
      required: [true, "Organizer name is required"],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Seat capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [10000, "Capacity cannot exceed 10000"],
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole number",
      },
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
