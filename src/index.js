import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Validate required environment variables
const requiredEnvVars = ["MONGO_URI", "FRONTEND_URL", "FROM_EMAIL_USER", "FROM_EMAIL_PASS", "TO_EMAIL_USER"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Message Schema
const messageSchema = new mongoose.Schema({
  name: String,
  subject: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.FROM_EMAIL_USER,
    pass: process.env.FROM_EMAIL_PASS,
  },
});

// Verify Nodemailer setup
transporter.verify((error) => {
  if (error) {
    console.error("Error setting up Nodemailer:", error);
  } else {
    console.log("Nodemailer is ready to send emails");
  }
});

// Email validation function
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// API Route


app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  // console.log("Received Data:", req.body); // ✅ Debugging line

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: "Message must be less than 1000 characters" });
  }

  try {
    const newMessage = new Message({ name, email, subject, message });
    await newMessage.save();
    
    // console.log("Saved to DB:", newMessage); // ✅ Debugging line

    // Send Email
    const mailOptions = {
      from: process.env.FROM_EMAIL_USER,
      to: process.env.TO_EMAIL_USER,
      subject: `New : ${subject}`,
      text: `Subject: ${subject}\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully!"); // ✅ Debugging line

    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    // console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));