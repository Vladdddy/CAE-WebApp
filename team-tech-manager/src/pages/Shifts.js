import { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";

const API = process.env.REACT_APP_API_URL;
const names = ["Luca", "Gianluca", "Mario", "Simone"];
const shifts = ["O", "OP", "ON", "F", "M", "R"];

function getMonthDays(year, month) {
  const days = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function Shifts() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [days, setDays] = useState(getMonthDays(year, month));
  const [data, setData] = useState({});
  const [selected, setSelected] = useState(null);
  const tableRef = useRef();

  useEffect(() => {
    setDays(getMonthDays(year, month));
    fetch(`${API}/api/shifts/${year}/${month + 1}`)
      .then((res) => res.json())
      .then((json) => setData(json));
  }, [year, month]);

  const handleChange = (name, day, field, value) => {
    const dateKey = day.toISOString().split("T")[0];
    const updated = {
      ...data,
      [dateKey]: {
        ...data[dateKey],
        [name]: {
          ...(data[dateKey]?.[name] || {}),
          [field]: value,
        },
      },
    };
    setData(updated);
    fetch(`${API}/api/shifts/${year}/${month + 1}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  const changeMonth = (offset) => {
    let newMonth = month + offset;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleExportPDF = () => {
    const element = tableRef.current;
    html2pdf().from(element).set({
      margin: 0.5,
      filename: `turni-${year}-${month + 1}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
    }).save();
  };

  return (
    <div className="overflow-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <button onClick={() => changeMonth(-1)} className="bg-gray-200 px-3 py-1 rounded">←</button>
        <h2 className="text-2xl font-bold">
          Turni - {year} / {month + 1}
        </h2>
        <button onClick={() => changeMonth(1)} className="bg-gray-200 px-3 py-1 rounded">→</button>
        <button onClick={handleExportPDF} className="bg-blue-600 text-white px-4 py-1 rounded">Esporta PDF</button>
      </div>

      <div ref={tableRef} className="overflow-auto">
        <table className="table-auto border border-gray-300 text-xs">
          <thead>
            <tr>
              <th className="border px-2">Nome</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="border px-1 text-sm">
                  {d.getDate()}/{d.getMonth() + 1} ({"DLMGVS"[d.getDay()]})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((name) => (
              <tr key={name}>
                <td className="border px-2 font-semibold">{name}</td>
                {days.map((d) => {
                  const dateKey = d.toISOString().split("T")[0];
                  const entry = data?.[dateKey]?.[name] || {};
                  return (
                    <td
                      key={dateKey}
                      className="border px-1 py-1 text-center cursor-pointer hover:bg-yellow-100"
                      onClick={() => setSelected(`${name}|${dateKey}`)}
                    >
                      <select
                        value={entry.shift || ""}
                        onChange={(e) => handleChange(name, d, "shift", e.target.value)}
                        className="text-xs w-full bg-transparent"
                      >
                        <option value="">--</option>
                        {shifts.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {selected === `${name}|${dateKey}` && (
                        <textarea
                          placeholder="Note / orari..."
                          value={entry.note || ""}
                          onChange={(e) => handleChange(name, d, "note", e.target.value)}
                          className="mt-1 w-full text-[10px] border border-gray-300 rounded"
                          rows={2}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
