const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const getFilePath = (date) => path.join(dataDir, `${date}.json`);

exports.getEntriesByDate = (req, res) => {
  const { date } = req.params;
  const filePath = getFilePath(date);

  if (!fs.existsSync(filePath)) {
    return res.json([]);
  }

  try {
    const rawData = fs.readFileSync(filePath);
    const entries = JSON.parse(rawData);
    res.json(entries);
  } catch (err) {
    console.error("Errore nella lettura del file:", err);
    res.status(500).json({ error: "Errore nella lettura del file logbook" });
  }
};

exports.saveEntriesByDate = (req, res) => {
  const { date } = req.params;
  const entries = req.body;
  const filePath = getFilePath(date);

  try {
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
    res.status(200).json({ message: "Entries salvate con successo" });
  } catch (err) {
    console.error("Errore nel salvataggio:", err);
    res.status(500).json({ error: "Errore nel salvataggio del logbook" });
  }
};
