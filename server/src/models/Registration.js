import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    usn: {
      type: String,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
    },
    yearOfStudy: {
      type: Number,
      min: 1,
      max: 4,
    },
  },
  { _id: true },
);

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Participant name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },
    usn: {
      type: String,
      trim: true,
      uppercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    yearOfStudy: {
      type: Number,
      min: 1,
      max: 4,
    },
    teamName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    teamMembers: {
      type: [teamMemberSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// One email can register only once per event.
registrationSchema.index({ event: 1, email: 1 }, { unique: true });
registrationSchema.index({ event: 1, usn: 1 });
registrationSchema.index({ event: 1, "teamMembers.email": 1 });
registrationSchema.index({ event: 1, "teamMembers.usn": 1 });

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;

