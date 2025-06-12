import { useEffect, useState, useRef } from "react";
import Modal from "../components/Modal";
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
            default:
                return "#e5e7eb40";
        }
    };

    const dailyTasks = tasks.filter((t) => t.date === selectedDate);

    if (loading) return <div>Caricamento task...</div>;

    return (
        <>
            <div className="flex gap-64 flex-col lg:flex-row justify-between max-w-full p-4">
                <div className="flex-1 min-w-0">
                    <div className="date-selector flex items-center justify-start mb-4 gap-8 flex-wrap">
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
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                ></path>
                            </svg>
                        </button>{" "}
                        <p className="text-xl font-normal text-gray-600">
                            {new Date(selectedDate).toLocaleDateString(
                                "it-IT",
                                {
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                }
                            )}
                        </p>
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
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                ></path>
                            </svg>{" "}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="aggiungi-btn flex items-center gap-2 col-span-1 sm:col-span-2 bg-blue-600 px-4 py-2 rounded"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                color="#fff"
                                fill="none"
                            >
                                <path
                                    d="M20 13V10.6569C20 9.83935 20 9.4306 19.8478 9.06306C19.6955 8.69552 19.4065 8.40649 18.8284 7.82843L14.0919 3.09188C13.593 2.593 13.3436 2.34355 13.0345 2.19575C12.9702 2.165 12.9044 2.13772 12.8372 2.11401C12.5141 2 12.1614 2 11.4558 2C8.21082 2 6.58831 2 5.48933 2.88607C5.26731 3.06508 5.06508 3.26731 4.88607 3.48933C4 4.58831 4 6.21082 4 9.45584V13M13 2.5V3C13 5.82843 13 7.24264 13.8787 8.12132C14.7574 9 16.1716 9 19 9H19.5"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M19.75 16H17.25C16.6977 16 16.25 16.4477 16.25 17V19M16.25 19V22M16.25 19H19.25M4.25 22V19.5M4.25 19.5V16H6C6.9665 16 7.75 16.7835 7.75 17.75C7.75 18.7165 6.9665 19.5 6 19.5H4.25ZM10.25 16H11.75C12.8546 16 13.75 16.8954 13.75 18V20C13.75 21.1046 12.8546 22 11.75 22H10.25V16Z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                            <p className="text-white">Export PDF</p>
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
                <div
                    ref={tasksListRef}
                    className="tasks border p-4 rounded-xl bg-white mb-6 overflow-y-auto max-h-96 flex-1 max-w-xs"
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
                        </svg>
                        <p className="text-gray-600">
                            Task per il{" "}
                            {new Date(selectedDate).toLocaleDateString(
                                "it-IT",
                                {
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                }
                            )}
                        </p>
                    </div>

                    <div className="separator"></div>

                    {dailyTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            Nessun task per questa data
                        </div>
                    ) : (
                        dailyTasks.map((task) => (
                            <div
                                key={task.id}
                                className="display-task flex items-center justify-between dashboard-content p-3 rounded mt-3 bg-gray-100"
                                style={{
                                    border: `2px solid ${getBorderColor(
                                        task.status
                                    )}`,
                                }}
                            >
                                <div className="task-info">
                                    <p className="text-gray-600 max-w-md font-semibold text-sm">
                                        {task.title}
                                    </p>
                                    <div className=" text-xs text-gray-500 capitalize">
                                        {task.time} • {task.assignedTo} •{" "}
                                        {task.status}
                                    </div>
                                </div>
                                <div className="buttons flex flex-row gap-2">
                                    {canToggleTask(task) && (
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            title="Cambia stato"
                                        >
                                            <svg
                                                className="finito-icon"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                width="20"
                                                height="20"
                                                color={
                                                    task.status === "completato"
                                                        ? "#139d54"
                                                        : task.status ===
                                                          "in corso"
                                                        ? "#f6ad10"
                                                        : "#6b7280"
                                                }
                                                fill="none"
                                            >
                                                <path
                                                    d="M10.2892 21.9614H9.39111C6.14261 21.9614 4.51836 21.9614 3.50918 20.9363C2.5 19.9111 2.5 18.2612 2.5 14.9614V9.96139C2.5 6.66156 2.5 5.01165 3.50918 3.98653C4.51836 2.9614 6.14261 2.9614 9.39111 2.9614H12.3444C15.5929 2.9614 17.4907 3.01658 18.5 4.04171C19.5092 5.06683 19.5 6.66156 19.5 9.96139V11.1478"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M15.9453 2V4M10.9453 2V4M5.94531 2V4"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M7 15H11M7 10H15"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                                <path
                                                    opacity="0.93"
                                                    d="M20.7598 14.8785C19.8544 13.8641 19.3112 13.9245 18.7076 14.1056C18.2851 14.166 16.8365 15.8568 16.2329 16.3952C15.2419 17.3743 14.2464 18.3823 14.1807 18.5138C13.9931 18.8188 13.8186 19.3592 13.7341 19.963C13.5771 20.8688 13.3507 21.8885 13.6375 21.9759C13.9242 22.0632 14.7239 21.8954 15.6293 21.7625C16.2329 21.6538 16.6554 21.533 16.9572 21.3519C17.3797 21.0983 18.1644 20.2046 19.5164 18.8761C20.3644 17.9833 21.1823 17.3664 21.4238 16.7626C21.6652 15.8568 21.3031 15.3737 20.7598 14.8785Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                            </svg>
                                        </button>
                                    )}

                                    {canDeleteTasks() && (
                                        <button
                                            onClick={() => deleteTask(task.id)}
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
                </div>
                <Modal
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    title={modal.title}
                    message={modal.message}
                    type={modal.type}
                    onConfirm={modal.onConfirm}
                />
            </div>
        </>
    );
}
