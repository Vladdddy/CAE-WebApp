// ✅ Logbook.js aggiornato con modulo di creazione/modifica entry
import { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL;
const authors = ["Luca", "Mario", "Simone", "Gianluca"];
const categories = {
  "routine task": ["PM", "MR"],
  troubleshooting: ["HW", "SW"],
  others: [],
};

const troubleshootingDetails = [
  "VISUAL", "COMPUTER", "AVIONIC", "ENV", "BUILDING", "POWER LOSS",
  "MOTION", "INTERFACE", "CONTROLS", "VIBRATION", "SOUND",
  "COMMS", "IOS", "OTHERS",
];

export default function Logbook() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);

  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [extraDetail, setExtraDetail] = useState("");
  const [formDate, setFormDate] = useState(date);
  const [formTime, setFormTime] = useState("08:00");
  const [duration, setDuration] = useState("");
  const [editIndex, setEditIndex] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch(`${API}/api/logbook/${date}`)
      .then(res => res.json())
      .then(data => {
        setEntries(data);
        setFilteredEntries(data);
      });
  }, [date]);

  const getDateRange = (start, end) => {
    const dates = [];
    let d = new Date(start);
    while (d <= new Date(end)) {
      dates.push(new Date(d).toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const loadEntriesFromRange = async () => {
    const dates = getDateRange(startDate, endDate);
    let all = [];
    for (const d of dates) {
      const res = await fetch(`${API}/api/logbook/${d}`);
      const data = await res.json();
      all.push(...data.map(e => ({ ...e, date: d })));
    }
    return all;
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) return;
    const allEntries = await loadEntriesFromRange();
    let filtered = [...allEntries];

    if (search) {
      filtered = filtered.filter(e =>
        e.text.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterCategory) {
      filtered = filtered.filter(e => e.category === filterCategory);
    }
    if (filterSubcategory) {
      filtered = filtered.filter(
        e =>
          e.subcategory === filterSubcategory ||
          e.extraDetail === filterSubcategory
      );
    }
    setFilteredEntries(filtered);
  };

  const saveEntries = async (newEntries) => {
    await fetch(`${API}/api/logbook/${date}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntries),
    });
    setEntries(newEntries);
    resetForm();
  };

  const resetForm = () => {
    setText("");
    setAuthor("");
    setCategory("");
    setSubcategory("");
    setExtraDetail("");
    setFormDate(date);
    setFormTime("08:00");
    setDuration("");
    setEditIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const entry = {
      text,
      author,
      category,
      subcategory,
      extraDetail: category === "troubleshooting" ? extraDetail : "",
      date: formDate,
      time: formTime,
      duration,
    };

    const newEntries = [...entries];
    if (editIndex !== null) {
      newEntries[editIndex] = entry;
    } else {
      newEntries.push(entry);
    }

    await saveEntries(newEntries);
  };

  const handleDelete = async (index) => {
    if (!window.confirm("Vuoi eliminare questa entry?")) return;
    const newEntries = entries.filter((_, i) => i !== index);
    await saveEntries(newEntries);
  };

  const handleEdit = (index) => {
    const entry = entries[index];
    setText(entry.text);
    setAuthor(entry.author);
    setCategory(entry.category);
    setSubcategory(entry.subcategory);
    setExtraDetail(entry.extraDetail || "");
    setFormDate(entry.date);
    setFormTime(entry.time);
    setDuration(entry.duration || "");
    setEditIndex(index);
  };

  const handleChangeDay = (offset) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  const handleExport = () => {
    const lines = filteredEntries.map((e, i) => {
      return `#${i + 1}\n${e.date} ${e.time} (${e.duration || "?"}) - ${e.author}\n${e.category}${e.subcategory ? "/" + e.subcategory : ""}${e.extraDetail ? "/" + e.extraDetail : ""}\n\n${e.text}\n---\n`;
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logbook-ricerca.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Logbook Giornaliero</h2>

      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <button onClick={() => handleChangeDay(-1)} className="bg-gray-200 px-3 py-1 rounded">
          ← Giorno precedente
        </button>
        <div className="font-semibold">{date}</div>
        <button onClick={() => handleChangeDay(1)} className="bg-gray-200 px-3 py-1 rounded">
          Giorno successivo →
        </button>
        <button onClick={handleExport} className="bg-green-600 text-white px-3 py-1 rounded">
          Esporta risultati
        </button>
      </div>

      {/* Ricerca avanzata su più giorni */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Ricerca avanzata</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <input type="text" placeholder="Cerca testo..." value={search} onChange={e => setSearch(e.target.value)} className="border px-3 py-1 rounded" />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border px-3 py-1 rounded">
            <option value="">Tutte le categorie</option>
            {Object.keys(categories).map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterSubcategory} onChange={e => setFilterSubcategory(e.target.value)} className="border px-3 py-1 rounded">
            <option value="">Tutte le sotto</option>
            {[...new Set(Object.values(categories).flat().concat(troubleshootingDetails))].map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border px-3 py-1 rounded" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border px-3 py-1 rounded" />
          <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-1 rounded">Cerca</button>
        </div>
      </div>

      {/* Form per creare/modificare entry */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-3 p-4 border rounded bg-white shadow">
        <h3 className="text-lg font-semibold">
          {editIndex !== null ? "Modifica voce" : "Nuova voce"}
        </h3>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Testo della voce..."
          className="w-full border px-3 py-2 rounded"
          required
        />

        <div className="flex flex-wrap gap-2">
          <select value={author} onChange={(e) => setAuthor(e.target.value)} className="border px-3 py-1 rounded" required>
            <option value="">Seleziona autore</option>
            {authors.map(a => <option key={a}>{a}</option>)}
          </select>

          <select value={category} onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("");
            setExtraDetail("");
          }} className="border px-3 py-1 rounded" required>
            <option value="">Categoria</option>
            {Object.keys(categories).map(c => <option key={c}>{c}</option>)}
          </select>

          <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="border px-3 py-1 rounded">
            <option value="">Sotto-categoria</option>
            {(categories[category] || []).map(sc => <option key={sc}>{sc}</option>)}
          </select>

          {category === "troubleshooting" && (
            <select value={extraDetail} onChange={(e) => setExtraDetail(e.target.value)} className="border px-3 py-1 rounded">
              <option value="">Dettaglio extra</option>
              {troubleshootingDetails.map(d => <option key={d}>{d}</option>)}
            </select>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="border px-3 py-1 rounded" required />
          <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="border px-3 py-1 rounded" required />
          <input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Durata (es. 1h30)" className="border px-3 py-1 rounded" />
        </div>

        <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded">
          {editIndex !== null ? "Salva modifica" : "Aggiungi voce"}
        </button>
        {editIndex !== null && (
          <button type="button" onClick={resetForm} className="ml-2 text-gray-600 underline">
            Annulla modifica
          </button>
        )}
      </form>

      <ul className="space-y-3">
        {filteredEntries.map((entry, index) => (
          <li key={index} className="relative p-4 border rounded shadow bg-gray-50 hover:bg-gray-100">
            <div className="text-sm text-gray-600 mb-1">
              {entry.date} {entry.time} • {entry.duration} • {entry.author} • {entry.category}
              {entry.subcategory && ` / ${entry.subcategory}`}
              {entry.extraDetail && ` / ${entry.extraDetail}`}
            </div>
            <div>{entry.text}</div>
            <div className="absolute top-2 right-2 space-x-2">
              <button onClick={() => handleEdit(entries.indexOf(entry))} className="text-blue-600 hover:underline">Modifica</button>
              <button onClick={() => handleDelete(entries.indexOf(entry))} className="text-red-600 hover:underline">Elimina</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
