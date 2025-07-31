// 📄 server.js aggiornato per includere /api/shifts
const express = require("express");
const cors = require("cors");
const path = require("path");
const taskRoutes = require("./routes/tasks");
const logbookRoutes = require("./routes/logbook");
const shiftRoutes = require("./routes/shifts");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const notesRoutes = require("./routes/notes");
const patternsRoutes = require("./routes/patterns");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/logbook", logbookRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/patterns", patternsRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server in ascolto su http://localhost:${port}`);
});
