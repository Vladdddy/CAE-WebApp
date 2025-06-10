import { useEffect, useState } from "react";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(true);

  const API = process.env.REACT_APP_API_URL;

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
    setDate("");
    setTime("");
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

  const groupedTasks = tasks.reduce((acc, task) => {
    acc[task.date] = acc[task.date] || [];
    acc[task.date].push(task);
    return acc;
  }, {});

  if (loading) return <div>Caricamento task...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gestione Task Tecnici</h2>

      <form onSubmit={handleAddTask} className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo task"
          className="border px-3 py-2 rounded"
          required
        />
        <input
          type="text"
          value={assignedTo}
          onChange={e => setAssignedTo(e.target.value)}
          placeholder="Assegnato a..."
          className="border px-3 py-2 rounded"
          required
        />
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

      {Object.keys(groupedTasks).sort().map(date => (
        <div key={date} className="mb-6">
          <h3 className="text-xl font-semibold mb-2">{date}</h3>
          <ul className="space-y-2">
            {groupedTasks[date].map(task => (
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
      ))}
    </div>
  );
}
