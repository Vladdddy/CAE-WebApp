// 📄 server.js aggiornato per includere /api/shifts
const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/tasks");
const logbookRoutes = require("./routes/logbook");
const shiftRoutes = require("./routes/shifts");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/tasks", taskRoutes);
app.use("/api/logbook", logbookRoutes);
app.use("/api/shifts", shiftRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server in ascolto su http://localhost:${port}`);
});
