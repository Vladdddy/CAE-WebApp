import { useEffect, useState, useRef } from "react";
import Modal from "../components/Modal";
import TaskDetailsModal from "../components/TaskDetailsModal";
import DescriptionModal from "../components/DescriptionModal";
import html2pdf from "html2pdf.js";
import "../styles/tasks.css";

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
    const [taskDetailsModal, setTaskDetailsModal] = useState({
        isOpen: false,
        task: null,
    });
    const [descriptionModal, setDescriptionModal] = useState({
        isOpen: false,
        taskId: null,
        currentDescription: "",
        currentSimulator: "",
    });
    // Filter states
    const [filters, setFilters] = useState({
        searchText: "",
        fromDate: "",
        toDate: "",
    });
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [showFilterResults, setShowFilterResults] = useState(false);
    const API = process.env.REACT_APP_API_URL;
    const tasksListRef = useRef();

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

    const openTaskDetails = (task) => {
        setTaskDetailsModal({
            isOpen: true,
            task: task,
        });
    };

    const closeTaskDetails = () => {
        setTaskDetailsModal({
            isOpen: false,
            task: null,
        });
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

    const canEditDescription = (task) => {
        if (!currentUser) return false;
        // Admins, managers, supervisors can edit any task description
        if (["admin", "manager", "supervisor"].includes(currentUser.role))
            return true;
        // Employees can only edit descriptions for tasks assigned to them
        return (
            currentUser.role === "employee" &&
            task.assignedTo === currentUser.name
        );
    };
    const openDescriptionModal = (task) => {
        setDescriptionModal({
            isOpen: true,
            taskId: task.id,
            currentDescription: task.description || "",
            currentSimulator: task.simulator || "",
        });
    };

    const closeDescriptionModal = () => {
        setDescriptionModal({
            isOpen: false,
            taskId: null,
            currentDescription: "",
            currentSimulator: "",
        });
    };
    const updateTaskDescription = async (data) => {
        const token = localStorage.getItem("authToken");
        try {
            const res = await fetch(
                `${API}/api/tasks/${descriptionModal.taskId}/description`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data),
                }
            );

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
                setTasks(
                    tasks.map((t) =>
                        t.id === descriptionModal.taskId ? updated : t
                    )
                );
                showModal(
                    "Successo",
                    "Descrizione aggiornata con successo",
                    "success"
                );
            } else {
                showModal(
                    "Errore",
                    "Errore durante l'aggiornamento della descrizione",
                    "error"
                );
            }
        } catch (error) {
            showModal(
                "Errore",
                "Errore durante l'aggiornamento della descrizione",
                "error"
            );
        }
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
    }, []); // Update filtered tasks when tasks change
    useEffect(() => {
        if (showFilterResults) {
            const filtered = applyFilters(tasks, filters);
            setFilteredTasks(filtered);
        }
    }, [tasks, filters, showFilterResults]);

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
                showModal(
                    "Errore",
                    errorData.message || "Errore durante l'aggiunta del task",
                    "error"
                );
            }
        } catch (error) {
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
    const handleExportPDF = () => {
        try {
            // Create a clean version of the content for PDF
            const formattedDate = new Date(selectedDate).toLocaleDateString(
                "it-IT",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                }
            );

            // Create a temporary div with clean styling for PDF
            const pdfContent = document.createElement("div");
            pdfContent.style.padding = "20px";
            pdfContent.style.fontFamily = "Arial, sans-serif";
            pdfContent.style.backgroundColor = "white";

            // Add title
            const title = document.createElement("h2");
            title.textContent = `Task per il ${formattedDate}`;
            title.style.marginBottom = "20px";
            title.style.color = "#333";
            title.style.borderBottom = "2px solid #3b82f6";
            title.style.paddingBottom = "10px";
            pdfContent.appendChild(title);

            if (dailyTasks.length === 0) {
                const noTasks = document.createElement("p");
                noTasks.textContent = "Nessun task per questa data";
                noTasks.style.color = "#666";
                noTasks.style.fontStyle = "italic";
                pdfContent.appendChild(noTasks);
            } else {
                dailyTasks.forEach((task, index) => {
                    const taskDiv = document.createElement("div");
                    taskDiv.style.marginBottom = "15px";
                    taskDiv.style.padding = "15px";
                    taskDiv.style.border = `2px solid ${getBorderColor(
                        task.status
                    )}`;
                    taskDiv.style.borderRadius = "8px";
                    taskDiv.style.backgroundColor = "#f9f9f9";

                    const taskTitle = document.createElement("h4");
                    taskTitle.textContent = `${index + 1}. ${task.title}`;
                    taskTitle.style.margin = "0 0 8px 0";
                    taskTitle.style.color = "#333";
                    taskDiv.appendChild(taskTitle);

                    const taskDetails = document.createElement("p");
                    taskDetails.textContent = `Orario: ${task.time} • Assegnato a: ${task.assignedTo} • Status: ${task.status}`;
                    taskDetails.style.margin = "0";
                    taskDetails.style.color = "#666";
                    taskDetails.style.fontSize = "14px";
                    taskDiv.appendChild(taskDetails);

                    pdfContent.appendChild(taskDiv);
                });
            }

            // Temporarily add to body
            document.body.appendChild(pdfContent);

            const opt = {
                margin: 0.5,
                filename: `tasks-${formattedDate.replace(/\//g, "-")}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                },
                jsPDF: {
                    unit: "in",
                    format: "a4",
                    orientation: "portrait",
                },
            };

            html2pdf()
                .from(pdfContent)
                .set(opt)
                .save()
                .then(() => {
                    document.body.removeChild(pdfContent);
                    closeModal();
                    showModal(
                        "Successo",
                        "PDF esportato con successo!",
                        "success"
                    );
                })
                .catch((error) => {
                    console.error("PDF Export Error:", error);
                    document.body.removeChild(pdfContent);
                    closeModal();
                    showModal(
                        "Errore",
                        "Errore durante l'esportazione del PDF",
                        "error"
                    );
                });
        } catch (error) {
            console.error("PDF Export Error:", error);
            showModal(
                "Errore",
                "Errore durante l'esportazione del PDF",
                "error"
            );
        }
    };
    const getBorderColor = (status) => {
        switch (status) {
            case "completato":
                return "#139d5440";
            case "in corso":
                return "#f6ad1040";
            case "non completato":
                return "#dc262640";
            default:
                return "#e5e7eb40";
        }
    }; // Filter functions
    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const applyFilters = (tasksToFilter, currentFilters) => {
        let filtered = [...tasksToFilter];

        // Text search filter
        if (currentFilters.searchText.trim()) {
            const searchLower = currentFilters.searchText.toLowerCase();
            filtered = filtered.filter(
                (task) =>
                    task.title.toLowerCase().includes(searchLower) ||
                    task.assignedTo.toLowerCase().includes(searchLower) ||
                    (task.description &&
                        task.description.toLowerCase().includes(searchLower)) ||
                    (task.simulator &&
                        task.simulator.toLowerCase().includes(searchLower))
            );
        }

        // Date range filter
        if (currentFilters.fromDate) {
            filtered = filtered.filter(
                (task) => task.date >= currentFilters.fromDate
            );
        }
        if (currentFilters.toDate) {
            filtered = filtered.filter(
                (task) => task.date <= currentFilters.toDate
            );
        }

        return filtered;
    };

    const executeFilters = () => {
        const filtered = applyFilters(tasks, filters);
        setFilteredTasks(filtered);
        setShowFilterResults(true);
    };

    const clearFilters = () => {
        setFilters({
            searchText: "",
            fromDate: "",
            toDate: "",
        });
        setFilteredTasks([]);
        setShowFilterResults(false);
    };

    const dailyTasks = tasks.filter((t) => t.date === selectedDate);

    if (loading) return <div>Caricamento task...</div>;

    return (
        <>
            <div className="flex gap-4 flex-col lg:flex-row justify-between max-w-full p-4">
                <div className="flex flex-col min-w-0">
                    <div className="date-selector flex items-center justify-center mb-4 gap-8 flex-wrap">
                        <button
                            onClick={() => handleChangeDay(-1)}
                            className="arroww bg-[#3b82f620] p-2 rounded-md"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                color="#3b82f6"
                                fill="none"
                            >
                                <path
                                    d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"
                                    stroke="#3b82f6"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                ></path>
                            </svg>
                        </button>{" "}
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setDate(e.target.value);
                            }}
                        />
                        <button
                            onClick={() => handleChangeDay(1)}
                            className="arroww bg-[#3b82f620] p-2 rounded-md"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                color="#3b82f6"
                                fill="none"
                            >
                                <path
                                    d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18"
                                    stroke="#3b82f6"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                ></path>
                            </svg>{" "}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="aggiungi-btn flex items-center gap-2 col-span-1 sm:col-span-2 bg-blue-600 px-8 py-2 rounded"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="#fff"
                                fill="none"
                            >
                                <path
                                    d="M20 13V10.6569C20 9.83935 20 9.4306 19.8478 9.06306C19.6955 8.69552 19.4065 8.40649 18.8284 7.82843L14.0919 3.09188C13.593 2.593 13.3436 2.34355 13.0345 2.19575C12.9702 2.165 12.9044 2.13772 12.8372 2.11401C12.5141 2 12.1614 2 11.4558 2C8.21082 2 6.58831 2 5.48933 2.88607C5.26731 3.06508 5.06508 3.26731 4.88607 3.48933C4 4.58831 4 6.21082 4 9.45584V13M13 2.5V3C13 5.82843 13 7.24264 13.8787 8.12132C14.7574 9 16.1716 9 19 9H19.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M19.75 16H17.25C16.6977 16 16.25 16.4477 16.25 17V19M16.25 19V22M16.25 19H19.25M4.25 22V19.5M4.25 19.5V16H6C6.9665 16 7.75 16.7835 7.75 17.75C7.75 18.7165 6.9665 19.5 6 19.5H4.25ZM10.25 16H11.75C12.8546 16 13.75 16.8954 13.75 18V20C13.75 21.1046 12.8546 22 11.75 22H10.25V16Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <p className="text-white">Export</p>
                        </button>
                    </div>
                    <div
                        className="my-8 border p-6 rounded-xl bg-white w-full max-w-md"
                        style={{ boxShadow: "4px 4px 10px #00000010" }}
                    >
                        <div className="title flex flex-row items-center gap-2 mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <path
                                    d="M4 12.0005L4 14.5446C4 17.7896 4 19.4122 4.88607 20.5111C5.06508 20.7331 5.26731 20.9354 5.48933 21.1144C6.58831 22.0005 8.21082 22.0005 11.4558 22.0005C12.1614 22.0005 12.5141 22.0005 12.8372 21.8865C12.9044 21.8627 12.9702 21.8355 13.0345 21.8047C13.3436 21.6569 13.593 21.4075 14.0919 20.9086L18.8284 16.172C19.4065 15.594 19.6955 15.3049 19.8478 14.9374C20 14.5699 20 14.1611 20 13.3436V10.0005C20 6.22922 20 4.34361 18.8284 3.17203C17.7693 2.11287 16.1265 2.01125 13.0345 2.0015M13 21.5005V21.0005C13 18.172 13 16.7578 13.8787 15.8791C14.7574 15.0005 16.1716 15.0005 19 15.0005H19.5"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                ></path>
                                <path
                                    d="M12 5.99954H4M8 1.99954V9.99954"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                ></path>
                            </svg>

                            <p className="text-gray-600">Aggiungi una task</p>
                        </div>

                        <div className="separator"></div>

                        <form
                            onSubmit={handleAddTask}
                            className="flex flex-col gap-4"
                        >
                            <label
                                htmlFor="title"
                                className="text-sm text-gray-600"
                            >
                                Titolo
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                required
                            />
                            <label
                                htmlFor="assignedTo"
                                className="text-sm text-gray-600"
                            >
                                Assegna a
                            </label>
                            <select
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                required
                                disabled={employeesLoading}
                            >
                                <option value="">
                                    {employeesLoading
                                        ? "Caricamento dipendenti..."
                                        : availableEmployees.length === 0
                                        ? "Nessun dipendente disponibile"
                                        : "---"}
                                </option>
                                {availableEmployees.map((employee) => (
                                    <option key={employee} value={employee}>
                                        {employee}
                                    </option>
                                ))}
                            </select>
                            <label
                                htmlFor="date"
                                className="text-sm text-gray-600"
                            >
                                Data
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                required
                            />
                            <label
                                htmlFor="time"
                                className="text-sm text-gray-600"
                            >
                                Orario
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="border px-3 py-2 rounded mb-8 text-gray-600 text-sm"
                                required
                            />{" "}
                            <button
                                type="submit"
                                className="aggiungi-btn col-span-1 sm:col-span-2 bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Aggiungi
                            </button>
                        </form>
                    </div>{" "}
                </div>{" "}
                <div className="flex flex-col items-center justify-between">
                    {" "}
                    <div
                        className="tasks flex flex-col w-[44vw] border p-4 rounded-xl bg-white mb-8 overflow-y-auto max-h-full max-w-full"
                        style={{ boxShadow: "4px 4px 10px #00000010" }}
                    >
                        <div className="title flex flex-row items-center gap-2 mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <path
                                    d="M3 7H6"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M3 17H9"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M18 17L21 17"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M15 7L21 7"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M6 7C6 6.06812 6 5.60218 6.15224 5.23463C6.35523 4.74458 6.74458 4.35523 7.23463 4.15224C7.60218 4 8.06812 4 9 4C9.93188 4 10.3978 4 10.7654 4.15224C11.2554 4.35523 11.6448 4.74458 11.8478 5.23463C12 5.60218 12 6.06812 12 7C12 7.93188 12 8.39782 11.8478 8.76537C11.6448 9.25542 11.2554 9.64477 10.7654 9.84776C10.3978 10 9.93188 10 9 10C8.06812 10 7.60218 10 7.23463 9.84776C6.74458 9.64477 6.35523 9.25542 6.15224 8.76537C6 8.39782 6 7.93188 6 7Z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                />
                                <path
                                    d="M12 17C12 16.0681 12 15.6022 12.1522 15.2346C12.3552 14.7446 12.7446 14.3552 13.2346 14.1522C13.6022 14 14.0681 14 15 14C15.9319 14 16.3978 14 16.7654 14.1522C17.2554 14.3552 17.6448 14.7446 17.8478 15.2346C18 15.6022 18 16.0681 18 17C18 17.9319 18 18.3978 17.8478 18.7654C17.6448 19.2554 17.2554 19.6448 16.7654 19.8478C16.3978 20 15.9319 20 15 20C14.0681 20 13.6022 20 13.2346 19.8478C12.7446 19.6448 12.3552 19.2554 12.1522 18.7654C12 18.3978 12 17.9319 12 17Z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                />
                            </svg>

                            <p className="text-gray-600">Filtro task</p>
                        </div>
                        <div className="separator"></div>{" "}
                        <div className="filter-form flex flex-col gap-4 mt-0">
                            <div className="flex flex-row gap-2">
                                <input
                                    type="text"
                                    id="searchText"
                                    value={filters.searchText}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "searchText",
                                            e.target.value
                                        )
                                    }
                                    onKeyPress={(e) =>
                                        e.key === "Enter" && executeFilters()
                                    }
                                    placeholder="Cerca per testo, titolo, nome..."
                                    className="flex w-full border px-3 py-2 rounded text-gray-600 text-sm focus:outline-nones"
                                />
                                <button
                                    onClick={executeFilters}
                                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
                                        color="white"
                                        fill="none"
                                    >
                                        <path
                                            d="M17.5 17.5L22 22"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M20 11C20 6.02944 15.9706 2 11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C15.9706 20 20 15.9706 20 11Z"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <p className="p-0 m-0">Cerca</p>
                                </button>
                                {showFilterResults && (
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
                                    >
                                        Cancella
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 mt-4">
                                <div className="flex gap-2 items-center">
                                    <div className="flex flex-col flex-1">
                                        <label
                                            htmlFor="fromDate"
                                            className="text-xs text-gray-500 mb-2"
                                        >
                                            Da
                                        </label>
                                        <input
                                            type="date"
                                            id="fromDate"
                                            value={filters.fromDate}
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    "fromDate",
                                                    e.target.value
                                                )
                                            }
                                            className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <label
                                            htmlFor="toDate"
                                            className="text-xs text-gray-500 mb-2"
                                        >
                                            A
                                        </label>
                                        <input
                                            type="date"
                                            id="toDate"
                                            value={filters.toDate}
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    "toDate",
                                                    e.target.value
                                                )
                                            }
                                            className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>{" "}
                            </div>
                        </div>
                    </div>{" "}
                    <div
                        ref={tasksListRef}
                        className="tasks flex flex-col w-[44vw] border p-4 rounded-xl bg-white mb-8 overflow-y-auto max-h-[50vh] flex-1 max-w-full"
                    >
                        <div className="title flex flex-row items-center gap-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <path
                                    d="M10.6119 5.00008L10.0851 7M12.2988 2.76313C12.713 3.49288 12.4672 4.42601 11.7499 4.84733C11.0326 5.26865 10.1153 5.01862 9.70118 4.28887C9.28703 3.55912 9.53281 2.62599 10.2501 2.20467C10.9674 1.78334 11.8847 2.03337 12.2988 2.76313Z"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M13 21.998C12.031 20.8176 10.5 18 8.5 18C7.20975 18.1059 6.53573 19.3611 5.84827 20.3287M5.84827 20.3287C5.45174 19.961 5.30251 19.4126 5.00406 18.3158L3.26022 11.9074C2.5584 9.32827 2.20749 8.0387 2.80316 7.02278C3.39882 6.00686 4.70843 5.66132 7.32766 4.97025L9.5 4.39708M5.84827 20.3287C6.2448 20.6965 6.80966 20.8103 7.9394 21.0379L12.0813 21.8725C12.9642 22.0504 12.9721 22.0502 13.8426 21.8205L16.6723 21.0739C19.2916 20.3828 20.6012 20.0373 21.1968 19.0214C21.7925 18.0055 21.4416 16.7159 20.7398 14.1368L19.0029 7.75375C18.301 5.17462 17.9501 3.88506 16.9184 3.29851C16.0196 2.78752 14.9098 2.98396 12.907 3.5"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                />
                            </svg>{" "}
                            <p className="text-gray-600">
                                {showFilterResults ? (
                                    <>
                                        Risultato{" "}
                                        <span className="span ml-1">
                                            {filteredTasks.length} task
                                        </span>
                                    </>
                                ) : (
                                    `Task per il ${new Date(
                                        selectedDate
                                    ).toLocaleDateString("it-IT", {
                                        year: "numeric",
                                        month: "numeric",
                                        day: "numeric",
                                    })}`
                                )}
                            </p>
                        </div>{" "}
                        <div className="separator"></div>
                        {showFilterResults ? (
                            // Show filtered results
                            filteredTasks.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">
                                    Nessun task trovato con i filtri applicati
                                </div>
                            ) : (
                                filteredTasks.map((task) => (
                                    <>
                                        <div
                                            key={task.id}
                                            className="display-task flex items-center gap-4 justify-between dashboard-content p-3 rounded mt-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                                            style={{
                                                border: `2px solid ${getBorderColor(
                                                    task.status
                                                )}`,
                                            }}
                                            onClick={() =>
                                                openTaskDetails(task)
                                            }
                                        >
                                            <div className="task-info">
                                                <p className="text-gray-600 max-w-md font-semibold text-sm">
                                                    {task.title}
                                                </p>
                                                <div className="text-xs text-gray-500 capitalize">
                                                    {task.date} • {task.time} •{" "}
                                                    {task.assignedTo} •{" "}
                                                    {task.status}
                                                </div>
                                            </div>
                                            <div className="buttons flex flex-row gap-2">
                                                {canToggleTask(task) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleTask(task.id);
                                                        }}
                                                        title="Cambia stato"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="20"
                                                            height="20"
                                                            color={
                                                                task.status ===
                                                                "completato"
                                                                    ? "#139d54"
                                                                    : task.status ===
                                                                      "in corso"
                                                                    ? "#f6ad10"
                                                                    : task.status ===
                                                                      "non completato"
                                                                    ? "#dc2626"
                                                                    : "#6b7280"
                                                            }
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M20.5 5.5H9.5C5.78672 5.5 3 8.18503 3 12"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M3.5 18.5H14.5C18.2133 18.5 21 15.815 21 12"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M18.5 3C18.5 3 21 4.84122 21 5.50002C21 6.15882 18.5 8 18.5 8"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M5.49998 16C5.49998 16 3.00001 17.8412 3 18.5C2.99999 19.1588 5.5 21 5.5 21"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                                {canDeleteTasks() && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteTask(task.id);
                                                        }}
                                                        title="Elimina task"
                                                    >
                                                        <svg
                                                            className="elimina-icon"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="20"
                                                            height="20"
                                                            color="#e53e3e"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                            />
                                                            <path
                                                                d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ))
                            )
                        ) : // Show daily tasks (original behavior)
                        dailyTasks.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                                Nessun task per questa data
                            </div>
                        ) : (
                            dailyTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="display-task flex items-center gap-4 justify-between dashboard-content p-3 rounded mt-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                                    style={{
                                        border: `2px solid ${getBorderColor(
                                            task.status
                                        )}`,
                                    }}
                                    onClick={() => openTaskDetails(task)}
                                >
                                    <div className="task-info">
                                        <p className="text-gray-600 max-w-md font-semibold text-sm">
                                            {task.title}
                                        </p>
                                        <div className=" text-xs text-gray-500 capitalize">
                                            {task.time} • {task.assignedTo} •{" "}
                                            {task.status}
                                        </div>
                                    </div>{" "}
                                    <div className="buttons flex flex-row gap-2">
                                        {canToggleTask(task) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTask(task.id);
                                                }}
                                                title="Cambia stato"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="20"
                                                    height="20"
                                                    color={
                                                        task.status ===
                                                        "completato"
                                                            ? "#139d54"
                                                            : task.status ===
                                                              "in corso"
                                                            ? "#f6ad10"
                                                            : task.status ===
                                                              "non completato"
                                                            ? "#dc2626"
                                                            : "#6b7280"
                                                    }
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M20.5 5.5H9.5C5.78672 5.5 3 8.18503 3 12"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M3.5 18.5H14.5C18.2133 18.5 21 15.815 21 12"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M18.5 3C18.5 3 21 4.84122 21 5.50002C21 6.15882 18.5 8 18.5 8"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M5.49998 16C5.49998 16 3.00001 17.8412 3 18.5C2.99999 19.1588 5.5 21 5.5 21"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                        )}{" "}
                                        {canDeleteTasks() && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTask(task.id);
                                                }}
                                                title="Elimina task"
                                            >
                                                <svg
                                                    className="elimina-icon"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="20"
                                                    height="20"
                                                    color="#e53e3e"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                    <path
                                                        d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>{" "}
                </div>
                <Modal
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    title={modal.title}
                    message={modal.message}
                    type={modal.type}
                    onConfirm={modal.onConfirm}
                />{" "}
                <TaskDetailsModal
                    isOpen={taskDetailsModal.isOpen}
                    onClose={closeTaskDetails}
                    task={taskDetailsModal.task}
                />{" "}
                <DescriptionModal
                    isOpen={descriptionModal.isOpen}
                    onClose={closeDescriptionModal}
                    onSave={updateTaskDescription}
                    currentDescription={descriptionModal.currentDescription}
                    currentSimulator={descriptionModal.currentSimulator}
                />
            </div>
        </>
    );
}
