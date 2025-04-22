const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { google } = require("googleapis");
const session = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "dIh1r[596*.L",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect("mongodb://localhost:27017/schedulerDB", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const availabilitySchema = new mongoose.Schema({
  userId: String,
  day: String,
  startTime: String,
  endTime: String,
});

const Availability = mongoose.model("Availability", availabilitySchema);

app.get("/auth/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json({ userId: req.user.profile.id });
});

app.post("/set-availability", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    const { userId, day, startTime, endTime } = req.body;

    if (!userId || !day || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingAvailability = await Availability.findOne({ userId, day });

    if (existingAvailability) {
      existingAvailability.startTime = startTime;
      existingAvailability.endTime = endTime;
      await existingAvailability.save();
      return res.json({ message: "availability updated successfully!" });
    }

    const newAvailability = new Availability({ userId, day, startTime, endTime });
    await newAvailability.save();

    res.json({ message: "availability saved successfully!" });
  } catch (error) {
    console.error("Error saving availability:", error);
    res.status(500).json({ message: "Error saving availability" });
  }
});

app.get("/get-doctor-availability/:doctorId", async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const availability = await Availability.find({ userId: doctorId });

    if (!availability.length) {
      return res.json({ message: "No availability set by this doctor." });
    }

    res.json(availability);
  } catch (error) {
    console.error("Error fetching doctor availability:", error);
    res.status(500).json({ message: "Error fetching availability" });
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: "526661561021-7klbdls8mvl9n0a94sv522bh76kr6pob.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",
,
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, { profile, accessToken });
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/tasks",
    ],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/calendar");
  }
);

app.get("/calendar", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: req.user.accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const tasks = google.tasks({ version: "v1", auth: oauth2Client });

  try {
    const eventsResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const tasksResponse = await tasks.tasks.list({ tasklist: "@default" });

    const events = eventsResponse.data.items || [];
    const taskItems = tasksResponse.data.items || [];

    res.send(`
      <html>
        <head>
          <title>Your Google Calendar Events and Tasks</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f9; padding: 20px; }
            .container { max-width: 800px; background: white; padding: 20px; border-radius: 10px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); }
            .card { margin: 10px 0; padding: 15px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1); }
            .event-card { background-color: #d1ecf1; }
            .task-card { background-color: #f8d7da; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="text-center">Your Upcoming Events</h1>
            ${events.length ? events.map(event => `
              <div class="card event-card">
                <h3>${event.summary}</h3>
                <p><strong>Start:</strong> ${new Date(event.start.dateTime).toLocaleString()}</p>
                <p><strong>End:</strong> ${new Date(event.end.dateTime).toLocaleString()}</p>
                <a href="${event.htmlLink}" target="_blank">View in Google Calendar</a>
              </div>
            `).join('') : '<p>No upcoming events found.</p>'}
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.send("Error fetching calendar events or tasks.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

