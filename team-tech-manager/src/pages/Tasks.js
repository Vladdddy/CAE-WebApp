import { useEffect, useState } from "react";
import Modal from "../components/Modal";

export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [time, setTime] = useState("08:00");
    const [loading, setLoading] = useState(true);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
    });
    const API = process.env.REACT_APP_API_URL;

    // Get current user info from token
    const getCurrentUser = () => {
        const token = localStorage.getItem("authToken");
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload;
        } catch (error) {
            console.error("Error parsing token:", error);
            return null;
        }
    };
    const currentUser = getCurrentUser();

    // Helper functions for modal
    const showModal = (title, message, type = "info", onConfirm = null) => {
        setModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
        });
    };

    const closeModal = () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
    };

    // Helper function to check if user can perform actions
    const canDeleteTasks = () => {
        return (
            currentUser &&
            ["admin", "manager", "supervisor"].includes(currentUser.role)
        );
    };

    const canToggleTask = (task) => {
        if (!currentUser) return false;
        // Admins, managers, supervisors can toggle any task
        if (["admin", "manager", "supervisor"].includes(currentUser.role))
            return true;
        // Employees can only toggle their own tasks
        return (
            currentUser.role === "employee" &&
            task.assignedTo === currentUser.name
        );
    };

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        fetch(`${API}/api/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setTasks(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching tasks:", error);
                setLoading(false);
            });
    }, []);

    // Fetch available employees when date or time changes
    const fetchAvailableEmployees = async (selectedDate, selectedTime) => {
        if (!selectedDate || !selectedTime) {
            setAvailableEmployees([]);
            return;
        }

        setEmployeesLoading(true);
        const token = localStorage.getItem("authToken");

        try {
            const response = await fetch(
                `${API}/api/tasks/available-employees?date=${selectedDate}&time=${selectedTime}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setAvailableEmployees(data.availableEmployees);
            } else {
                console.error(
                    "Error fetching available employees:",
                    await response.text()
                );
                setAvailableEmployees([]);
            }
        } catch (error) {
            console.error("Error fetching available employees:", error);
            setAvailableEmployees([]);
        } finally {
            setEmployeesLoading(false);
        }
    }; // Update available employees when date or time changes
    useEffect(() => {
        fetchAvailableEmployees(date, time);
        setAssignedTo(""); // Reset assigned employee when date/time changes
    }, [date, time]);
    const handleAddTask = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("authToken");
        try {
            const res = await fetch(`${API}/api/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, assignedTo, date, time }),
            });

            if (res.ok) {
                const newTask = await res.json();
                setTasks([...tasks, newTask]);
                setTitle("");
                setAssignedTo("");
                setDate(selectedDate);
                setTime("08:00");
            } else {
                const errorData = await res.json();
                console.error("Error adding task:", errorData);
                showModal(
                    "Errore",
                    errorData.message || "Errore durante l'aggiunta del task",
                    "error"
                );
            }
        } catch (error) {
            console.error("Error adding task:", error);
            showModal("Errore", "Errore durante l'aggiunta del task", "error");
        }
    };
    const toggleTask = async (id) => {
        const token = localStorage.getItem("authToken");
        try {
            const res = await fetch(`${API}/api/tasks/${id}/toggle`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.status === 403) {
                const error = await res.json();
                showModal(
                    "Accesso negato",
                    error.message ||
                        "Non hai i permessi per modificare questo task",
                    "error"
                );
                return;
            }

            if (res.ok) {
                const updated = await res.json();
                setTasks(tasks.map((t) => (t.id === id ? updated : t)));
            } else {
                console.error("Error toggling task:", await res.text());
                showModal(
                    "Errore",
                    "Errore durante la modifica del task",
                    "error"
                );
            }
        } catch (error) {
            console.error("Error toggling task:", error);
            showModal("Errore", "Errore durante la modifica del task", "error");
        }
    };
    const deleteTask = async (id) => {
        showModal(
            "Conferma eliminazione",
            "Confermi l'eliminazione del task?",
            "confirm",
            async () => {
                const token = localStorage.getItem("authToken");
                try {
                    const res = await fetch(`${API}/api/tasks/${id}`, {
                        method: "DELETE",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (res.status === 403) {
                        const error = await res.json();
                        showModal(
                            "Accesso negato",
                            error.message ||
                                "Non hai i permessi per eliminare questo task",
                            "error"
                        );
                        return;
                    }

                    if (res.ok) {
                        setTasks(tasks.filter((t) => t.id !== id));
                        showModal(
                            "Successo",
                            "Task eliminato con successo",
                            "success"
                        );
                    } else {
                        console.error("Error deleting task:", await res.text());
                        showModal(
                            "Errore",
                            "Errore durante l'eliminazione del task",
                            "error"
                        );
                    }
                } catch (error) {
                    console.error("Error deleting task:", error);
                    showModal(
                        "Errore",
                        "Errore durante l'eliminazione del task",
                        "error"
                    );
                }
            }
        );
    };

    const handleChangeDay = (offset) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        const newDate = d.toISOString().split("T")[0];
        setSelectedDate(newDate);
        setDate(newDate);
    };

    const dailyTasks = tasks.filter((t) => t.date === selectedDate);

    if (loading) return <div>Caricamento task...</div>;

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Gestione Task Tecnici</h2>

            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <button
                    onClick={() => handleChangeDay(-1)}
                    className="bg-gray-200 px-3 py-1 rounded"
                >
                    ← Giorno precedente
                </button>
                <div className="font-semibold">{selectedDate}</div>
                <button
                    onClick={() => handleChangeDay(1)}
                    className="bg-gray-200 px-3 py-1 rounded"
                >
                    Giorno successivo →
                </button>
            </div>

            <form
                onSubmit={handleAddTask}
                className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titolo task"
                    className="border px-3 py-2 rounded"
                    required
                />{" "}
                <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="border px-3 py-2 rounded"
                    required
                    disabled={employeesLoading}
                >
                    <option value="">
                        {employeesLoading
                            ? "Caricamento dipendenti..."
                            : availableEmployees.length === 0
                            ? "Nessun dipendente disponibile per questo orario"
                            : "Assegna a..."}
                    </option>
                    {availableEmployees.map((employee) => (
                        <option key={employee} value={employee}>
                            {employee}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border px-3 py-2 rounded"
                    required
                />
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
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

            <h3 className="text-xl font-semibold mb-2">
                Task per il {selectedDate}
            </h3>
            <ul className="space-y-2">
                {dailyTasks.map((task) => (
                    <li
                        key={task.id}
                        className={`relative p-4 border rounded shadow hover:bg-gray-50
              ${
                  task.status === "completato"
                      ? "bg-green-100 border-green-400"
                      : ""
              }
              ${
                  task.status === "in corso"
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
              }
              ${
                  task.status === "non iniziato"
                      ? "bg-red-100 border-red-400"
                      : ""
              }
            `}
                    >
                        {" "}
                        <div
                            className={
                                canToggleTask(task)
                                    ? "cursor-pointer pr-8"
                                    : "pr-8"
                            }
                            onClick={
                                canToggleTask(task)
                                    ? () => toggleTask(task.id)
                                    : undefined
                            }
                        >
                            <strong>{task.title}</strong> —{" "}
                            <em>{task.status}</em>
                            <div className="text-sm text-gray-600">
                                {task.time} • Assegnato a: {task.assignedTo}
                            </div>
                        </div>
                        {canDeleteTasks() && (
                            <button
                                onClick={() => deleteTask(task.id)}
                                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                                title="Elimina"
                            >
                                ✕
                            </button>
                        )}
                    </li>
                ))}{" "}
            </ul>

            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onConfirm={modal.onConfirm}
            />
        </div>
    );
}
