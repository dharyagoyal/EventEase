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
      maxlength: 5000,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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
    isTeamEvent: {
      type: Boolean,
      default: false,
    },
    minTeamSize: {
      type: Number,
      default: 1,
      min: [1, "Minimum team size must be at least 1"],
      max: [10, "Minimum team size cannot exceed 10"],
      validate: {
        validator: Number.isInteger,
        message: "minTeamSize must be a whole number",
      },
    },
    maxTeamSize: {
      type: Number,
      default: 1,
      min: [1, "Maximum team size must be at least 1"],
      max: [10, "Maximum team size cannot exceed 10"],
      validate: {
        validator: Number.isInteger,
        message: "maxTeamSize must be a whole number",
      },
    },
  },
  { timestamps: true },
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
