import express from "express";
import cors from "cors";
import eventRoutes from "./routes/eventRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  }),
);

app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EventEase API is running",
  });
});

export default app;
