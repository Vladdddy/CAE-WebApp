import { useEffect, useState } from "react";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("08:00");
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const API = process.env.REACT_APP_API_URL;
  const operators = ["Luca", "Mario", "Simone", "Gianluca"];

  useEffect(() => {
    fetch(`${API}/api/tasks`)
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      });
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignedTo, date, time }),
    });
    const newTask = await res.json();
    setTasks([...tasks, newTask]);
    setTitle("");
    setAssignedTo("");
    setDate(selectedDate);
    setTime("08:00");
  };

  const toggleTask = async (id) => {
    const res = await fetch(`${API}/api/tasks/${id}/toggle`, {
      method: "PATCH",
    });
    const updated = await res.json();
    setTasks(tasks.map(t => t.id === id ? updated : t));
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Confermi l'eliminazione del task?")) return;
    const res = await fetch(`${API}/api/tasks/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleChangeDay = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split("T")[0];
    setSelectedDate(newDate);
    setDate(newDate);
  };

  const dailyTasks = tasks.filter(t => t.date === selectedDate);

  if (loading) return <div>Caricamento task...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gestione Task Tecnici</h2>

      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <button onClick={() => handleChangeDay(-1)} className="bg-gray-200 px-3 py-1 rounded">
          ← Giorno precedente
        </button>
        <div className="font-semibold">{selectedDate}</div>
        <button onClick={() => handleChangeDay(1)} className="bg-gray-200 px-3 py-1 rounded">
          Giorno successivo →
        </button>
      </div>

      <form onSubmit={handleAddTask} className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo task"
          className="border px-3 py-2 rounded"
          required
        />
        <select
          value={assignedTo}
          onChange={e => setAssignedTo(e.target.value)}
          className="border px-3 py-2 rounded"
          required
        >
          <option value="">Assegna a...</option>
          {operators.map(o => <option key={o}>{o}</option>)}
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border px-3 py-2 rounded"
          required
        />
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="border px-3 py-2 rounded"
          required
        />
        <button
          type="submit"
          className="col-span-1 sm:col-span-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Aggiungi Task
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-2">Task per il {selectedDate}</h3>
      <ul className="space-y-2">
        {dailyTasks.map(task => (
          <li
            key={task.id}
            className={`relative p-4 border rounded shadow cursor-pointer hover:bg-gray-50
              ${task.status === "completato" ? "bg-green-100 border-green-400" : ""}
              ${task.status === "in corso" ? "bg-yellow-100 border-yellow-400" : ""}
              ${task.status === "non iniziato" ? "bg-red-100 border-red-400" : ""}
            `}
          >
            <div onClick={() => toggleTask(task.id)} className="pr-8">
              <strong>{task.title}</strong> — <em>{task.status}</em>
              <div className="text-sm text-gray-600">
                {task.time} • Assegnato a: {task.assignedTo}
              </div>
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800"
              title="Elimina"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
