// 📄 shiftController.js aggiornato con turnazioni fino al 2027 da 5 maggio e pattern personalizzati
const fs = require("fs");
const path = require("path");

const names = ["Luca", "Gianluca", "Mario", "Simone"];
const FESTIVITA = [
  "01-01", "06-01", "25-04", "01-05", "02-06",
  "15-08", "01-11", "08-12", "25-12", "26-12",
];

const PATTERNS = {
  Gianluca: ["ON", "OP", "O"],
  Mario: ["OP", "O", "ON"],
  Simone: ["O", "ON", "OP"],
  Luca: ["O", "O", "OP"],
};

const getDataPath = (year, month) => {
  return path.join(__dirname, `../data/shifts-${year}-${String(month).padStart(2, "0")}.json`);
};

const generateShifts = (year, month) => {
  const result = {};
  const startPattern = new Date("2025-05-05");
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    const dayStr = date.toISOString().split("T")[0];
    const mmdd = dayStr.slice(5, 10);

    result[dayStr] = {};

    names.forEach(name => {
      if (FESTIVITA.includes(mmdd)) {
        result[dayStr][name] = { shift: "F", note: "Festa nazionale" };
      } else if (day === 0 || day === 6) {
        result[dayStr][name] = { shift: "R", note: "Riposo" };
      } else {
        const daysPassed = Math.floor((date - startPattern) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysPassed / 7);
        const pattern = PATTERNS[name];
        const shift = pattern[weekIndex % pattern.length];
        result[dayStr][name] = { shift, note: "" };
      }
    });
    date.setDate(date.getDate() + 1);
  }

  return result;
};

const getShifts = (req, res) => {
  const { year, month } = req.params;
  const filePath = getDataPath(year, month);
  if (!fs.existsSync(filePath)) {
    const data = generateShifts(parseInt(year), parseInt(month));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return res.json(data);
  }
  const json = fs.readFileSync(filePath);
  res.json(JSON.parse(json));
};

const saveShifts = (req, res) => {
  const { year, month } = req.params;
  const filePath = getDataPath(year, month);
  fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
  res.json({ message: "Salvato" });
};

module.exports = { getShifts, saveShifts };
