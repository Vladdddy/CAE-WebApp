import { useEffect, useState, useRef, useMemo } from "react";
import Modal from "../components/Modal";
import TaskDetailsModal from "../components/TaskDetailsModal";
import DescriptionModal from "../components/DescriptionModal";
import Calendar from "../components/Calendar";
import TaskTable from "../components/TaskTable";
import html2pdf from "html2pdf.js";
import "../styles/tasks.css";
import {
    notesService,
    migrateNotesFromLocalStorage,
} from "../utils/notesService";

// Categories and troubleshooting details for task classification
const categories = {
    "routine task": ["PM", "MR"],
    troubleshooting: ["HW", "SW"],
    others: [],
};

const troubleshootingDetails = [
    "VISUAL",
    "COMPUTER",
    "AVIONIC",
    "ENV",
    "BUILDING",
    "POWER LOSS",
    "MOTION",
    "INTERFACE",
    "CONTROLS",
    "VIBRATION",
    "SOUND",
    "COMMS",
    "IOS",
    "OTHERS",
];

export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [simulator, setSimulator] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [extraDetail, setExtraDetail] = useState("");
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
        currentEmployee: "",
    }); // Simulator schedule states - now date-specific
    const [simulatorSchedules, setSimulatorSchedules] = useState(() => {
        const saved = localStorage.getItem("simulatorSchedules");
        const allSchedules = saved ? JSON.parse(saved) : {};
        // Return schedules for the selected date, or empty object if none exist
        return allSchedules[selectedDate] || {};
    });
    const [scheduleModal, setScheduleModal] = useState({
        isOpen: false,
        simulator: "",
        startTime: "",
        endTime: "",
        selectedEmployee: "",
    });

    // State for night shift employees
    const [nightShiftEmployees, setNightShiftEmployees] = useState([]);
    const [nightShiftEmployeesLoading, setNightShiftEmployeesLoading] =
        useState(false); // Filter states
    const [filters, setFilters] = useState({
        searchText: "",
        fromDate: "",
        toDate: "",
        status: "",
    });
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [showFilterResults, setShowFilterResults] = useState(false);
    const [isAddTaskAccordionOpen, setIsAddTaskAccordionOpen] = useState(false);
    const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);

    // Calendar and view state
    const [showCalendar, setShowCalendar] = useState(true);
    const [showTable, setShowTable] = useState(false);

    // Notes state
    const [taskNotes, setTaskNotes] = useState({});
    const [notesLoaded, setNotesLoaded] = useState(false);

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

    const canAddTasks = () => {
        return currentUser && ["admin"].includes(currentUser.role);
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
            currentEmployee: task.assignedTo || "",
        });

        // Fetch available employees for this specific task's date and time
        if (task.date && task.time) {
            fetchAvailableEmployees(task.date, task.time);
        }
    };
    const closeDescriptionModal = () => {
        setDescriptionModal({
            isOpen: false,
            taskId: null,
            currentDescription: "",
            currentSimulator: "",
            currentEmployee: "",
        });
    }; // Schedule modal functions
    const openScheduleModal = (simulator) => {
        // Check if the selected date is today
        const today = new Date().toISOString().split("T")[0];
        if (selectedDate !== today) {
            showModal(
                "Accesso negato",
                "Puoi modificare gli orari solo per la data di oggi",
                "error"
            );
            return;
        }
        const existingSchedule = simulatorSchedules[simulator] || {};
        setScheduleModal({
            isOpen: true,
            simulator: simulator,
            startTime: existingSchedule.startTime || "",
            endTime: existingSchedule.endTime || "",
            selectedEmployee: existingSchedule.selectedEmployee || "",
        });

        // Fetch night shift employees for the selected date
        fetchNightShiftEmployees(selectedDate);
    };

    const closeScheduleModal = () => {
        setScheduleModal({
            isOpen: false,
            simulator: "",
            startTime: "",
            endTime: "",
            selectedEmployee: "",
        });
        setNightShiftEmployees([]);
    };
    const saveSimulatorSchedule = () => {
        const { simulator, startTime, endTime, selectedEmployee } =
            scheduleModal;
        if (startTime && endTime) {
            // Get all existing schedules from localStorage
            const allSchedules = JSON.parse(
                localStorage.getItem("simulatorSchedules") || "{}"
            );

            // Update schedules for the selected date
            const newSchedules = {
                ...simulatorSchedules,
                [simulator]: {
                    startTime,
                    endTime,
                    selectedEmployee: selectedEmployee || "",
                },
            };

            // Save to the date-specific entry
            allSchedules[selectedDate] = newSchedules;

            // Update both local state and localStorage
            setSimulatorSchedules(newSchedules);
            localStorage.setItem(
                "simulatorSchedules",
                JSON.stringify(allSchedules)
            );
        }
        closeScheduleModal();
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

                // Load notes from state and merge with the updated task
                const updatedWithNotes = {
                    ...updated,
                    notes: taskNotes[updated.id] || [],
                };

                setTasks(
                    tasks.map((t) =>
                        t.id === descriptionModal.taskId ? updatedWithNotes : t
                    )
                );

                // Update the modal if it's open and showing the same task
                if (
                    taskDetailsModal.isOpen &&
                    taskDetailsModal.task &&
                    taskDetailsModal.task.id === descriptionModal.taskId
                ) {
                    setTaskDetailsModal((prev) => ({
                        ...prev,
                        task: updatedWithNotes,
                    }));
                }

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
    // Load notes from backend and migrate from localStorage if needed
    useEffect(() => {
        const loadNotesAndMigrate = async () => {
            try {
                // First, migrate any existing localStorage notes
                await migrateNotesFromLocalStorage();

                // Then load all notes from backend
                const taskNotesData = await notesService.getTaskNotes();

                setTaskNotes(taskNotesData);
                setNotesLoaded(true);
            } catch (error) {
                console.error("Error loading notes:", error);
                // Don't fall back to localStorage - require backend for notes
                setTaskNotes({});
                setNotesLoaded(true);
                console.warn(
                    "Backend notes API not available. Notes will only work when backend is running."
                );
            }
        };

        loadNotesAndMigrate();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        fetch(`${API}/api/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                // Load notes from state and merge with tasks
                const tasksWithNotes = data.map((task) => ({
                    ...task,
                    notes: taskNotes[task.id] || [],
                }));

                setTasks(tasksWithNotes);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching tasks:", error);
                setLoading(false);
            });
    }, [taskNotes, notesLoaded]); // Re-run when notes are loaded// Update simulator schedules when selected date changes
    useEffect(() => {
        const allSchedules = JSON.parse(
            localStorage.getItem("simulatorSchedules") || "{}"
        );
        const dateSchedules = allSchedules[selectedDate] || {};
        setSimulatorSchedules(dateSchedules);
    }, [selectedDate]);

    // Update filtered tasks when tasks change
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
                body: JSON.stringify({
                    title,
                    description,
                    assignedTo,
                    simulator,
                    category,
                    subcategory,
                    extraDetail,
                    date,
                    time,
                }),
            });

            if (res.ok) {
                const newTask = await res.json();
                setTasks([...tasks, newTask]);
                setTitle("");
                setDescription("");
                setAssignedTo("");
                setSimulator("");
                setCategory("");
                setSubcategory("");
                setExtraDetail("");
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

                // Load notes from state and merge with the updated task
                const updatedWithNotes = {
                    ...updated,
                    notes: taskNotes[updated.id] || [],
                };

                setTasks(
                    tasks.map((t) => (t.id === id ? updatedWithNotes : t))
                );

                // Update the modal if it's open and showing the same task
                if (
                    taskDetailsModal.isOpen &&
                    taskDetailsModal.task &&
                    taskDetailsModal.task.id === id
                ) {
                    setTaskDetailsModal((prev) => ({
                        ...prev,
                        task: updatedWithNotes,
                    }));
                }
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
                        // Clean up notes for the deleted task from local state
                        const updatedTaskNotes = { ...taskNotes };
                        delete updatedTaskNotes[id];
                        setTaskNotes(updatedTaskNotes);

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
    const handleSaveNote = async (taskId, noteText) => {
        try {
            const currentUserName =
                localStorage.getItem("userName") || "Utente Sconosciuto";

            // Save note to backend
            await notesService.addTaskNote(taskId, noteText, currentUserName);

            // Update local state
            const updatedTaskNotes = {
                ...taskNotes,
                [taskId]: [
                    ...(taskNotes[taskId] || []),
                    {
                        text: noteText,
                        author: currentUserName,
                        timestamp: new Date().toISOString(),
                    },
                ],
            };
            setTaskNotes(updatedTaskNotes);

            // Update the task in local state
            const updatedTasks = tasks.map((task) => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        notes: updatedTaskNotes[taskId],
                    };
                }
                return task;
            });
            setTasks(updatedTasks);

            console.log("Nota salvata con successo:", noteText);

            // Update the task in the modal if it's the same task
            if (taskDetailsModal.task && taskDetailsModal.task.id === taskId) {
                const updatedTask = updatedTasks.find((t) => t.id === taskId);
                setTaskDetailsModal({
                    ...taskDetailsModal,
                    task: updatedTask,
                });
            }
        } catch (error) {
            console.error("Errore nel salvare la nota:", error);
            showModal(
                "Errore",
                "Errore nel salvare la nota: " + error.message,
                "error"
            );
        }
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
            title.style.borderBottom = "2px solid #d1d5db";
            title.style.paddingBottom = "10px";
            pdfContent.appendChild(title);
            if (dailyTasks.length === 0) {
                const noTasks = document.createElement("p");
                noTasks.textContent = "Nessun task per questa data";
                noTasks.style.color = "#d6d6d6";
                noTasks.style.fontStyle = "italic";
                pdfContent.appendChild(noTasks);
            } else {
                // Group tasks by simulator
                const tasksBySimulator = {};
                const simulators = [
                    "FTD",
                    "109FFS",
                    "139#1",
                    "139#3",
                    "169",
                    "189",
                ];

                dailyTasks.forEach((task) => {
                    const simulator = task.simulator || "";
                    let simulatorGroup;

                    if (simulators.includes(simulator)) {
                        simulatorGroup = simulator;
                    } else {
                        simulatorGroup = "Others";
                    }

                    if (!tasksBySimulator[simulatorGroup]) {
                        tasksBySimulator[simulatorGroup] = [];
                    }
                    tasksBySimulator[simulatorGroup].push(task);
                }); // Render tasks grouped by simulator in specific order
                const simulatorOrder = [
                    "FTD",
                    "109FFS",
                    "139#1",
                    "139#3",
                    "169",
                    "189",
                    "Others",
                ];

                simulatorOrder.forEach((simulator) => {
                    if (!tasksBySimulator[simulator]) return;
                    // Add simulator header with schedule if available
                    const simulatorHeader = document.createElement("h4");
                    let headerText = simulator;
                    if (simulatorSchedules[simulator]) {
                        headerText += ` (Ora fine ${simulatorSchedules[simulator].endTime} - Ora inizio ${simulatorSchedules[simulator].startTime}`;
                        if (simulatorSchedules[simulator].selectedEmployee) {
                            headerText += ` - ${simulatorSchedules[simulator].selectedEmployee}`;
                        }
                        headerText += ")";
                    }
                    simulatorHeader.textContent = headerText;
                    simulatorHeader.style.margin = "20px 0 10px 0";
                    simulatorHeader.style.color = "#1f2937";
                    simulatorHeader.style.fontSize = "16px";
                    simulatorHeader.style.fontWeight = "bold";
                    simulatorHeader.style.borderBottom = "1px solid #d1d5db";
                    simulatorHeader.style.paddingBottom = "20px";
                    pdfContent.appendChild(simulatorHeader);

                    // Add tasks for this simulator
                    tasksBySimulator[simulator].forEach((task, index) => {
                        const taskDiv = document.createElement("div");
                        taskDiv.style.marginBottom = "15px";
                        taskDiv.style.padding = "15px";
                        taskDiv.style.border = "1px solid #e5e7eb";
                        taskDiv.style.borderRadius = "8px";
                        taskDiv.style.backgroundColor = "#f9f9f9";

                        const taskTitle = document.createElement("h5");
                        taskTitle.textContent = `${index + 1}. ${task.title}`;
                        taskTitle.style.margin = "0 0 8px 0";
                        taskTitle.style.color = "#333";
                        taskTitle.style.fontSize = "16px";
                        taskDiv.appendChild(taskTitle);
                        const taskDetails = document.createElement("p");
                        taskDetails.textContent = `Orario: ${task.time} • Assegnato a: ${task.assignedTo} • Status: ${task.status}`;
                        taskDetails.style.margin = "0";
                        taskDetails.style.color = "#666";
                        taskDetails.style.fontSize = "14px";
                        taskDiv.appendChild(taskDetails);

                        // Add task description if available
                        if (task.description) {
                            const taskDescription = document.createElement("p");
                            taskDescription.textContent = `Descrizione: ${task.description}`;
                            taskDescription.style.margin = "8px 0 0 0";
                            taskDescription.style.color = "#666";
                            taskDescription.style.fontSize = "14px";
                            taskDescription.style.fontStyle = "italic";
                            taskDiv.appendChild(taskDescription);
                        }

                        // Add notes if available
                        if (task.notes && task.notes.length > 0) {
                            const notesHeader = document.createElement("p");
                            notesHeader.textContent = "Note:";
                            notesHeader.style.margin = "8px 0 16px 0";
                            notesHeader.style.color = "#333";
                            notesHeader.style.fontSize = "14px";
                            notesHeader.style.fontWeight = "bold";
                            taskDiv.appendChild(notesHeader);

                            task.notes.forEach((note, noteIndex) => {
                                const noteDiv = document.createElement("div");
                                noteDiv.style.margin = "4px 0 4px 16px";
                                noteDiv.style.padding = "8px";
                                noteDiv.style.backgroundColor = "#f3f4f6";
                                noteDiv.style.borderLeft = "3px solid #d1d5db";
                                noteDiv.style.borderRadius = "4px";

                                const noteText = document.createElement("p");
                                noteText.textContent = note.text;
                                noteText.style.margin = "0 0 4px 0";
                                noteText.style.color = "#333";
                                noteText.style.fontSize = "13px";
                                noteDiv.appendChild(noteText);

                                const noteAuthor = document.createElement("p");
                                const noteDate = new Date(
                                    note.timestamp
                                ).toLocaleString("it-IT");
                                noteAuthor.textContent = `${note.author} - ${noteDate}`;
                                noteAuthor.style.margin = "0";
                                noteAuthor.style.color = "#666";
                                noteAuthor.style.fontSize = "11px";
                                noteAuthor.style.fontStyle = "italic";
                                noteDiv.appendChild(noteAuthor);

                                taskDiv.appendChild(noteDiv);
                            });
                        }

                        pdfContent.appendChild(taskDiv);
                    });
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

    const handleExportFilteredTasks = () => {
        try {
            // Create a clean version of the content for PDF
            const currentDate = new Date().toLocaleDateString("it-IT", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });

            // Create a temporary div with clean styling for PDF
            const pdfContent = document.createElement("div");
            pdfContent.style.padding = "20px";
            pdfContent.style.fontFamily = "Arial, sans-serif";
            pdfContent.style.backgroundColor = "white";

            // Add title
            const title = document.createElement("h2");
            title.textContent = `Risultati Ricerca Task - ${currentDate}`;
            title.style.marginBottom = "20px";
            title.style.color = "#333";
            title.style.borderBottom = "2px solid #d1d5db";
            title.style.paddingBottom = "10px";
            pdfContent.appendChild(title);

            // Add filter information
            const filterInfo = document.createElement("div");
            filterInfo.style.marginBottom = "20px";
            filterInfo.style.padding = "15px";
            filterInfo.style.backgroundColor = "#f9f9f9";
            filterInfo.style.border = "1px solid #e5e7eb";
            filterInfo.style.borderRadius = "8px";

            let hasFilters = false;

            if (filters.searchText) {
                const searchFilter = document.createElement("p");
                searchFilter.textContent = `• Testo: "${filters.searchText}"`;
                searchFilter.style.margin = "4px 0";
                searchFilter.style.color = "#666";
                filterInfo.appendChild(searchFilter);
                hasFilters = true;
            }

            if (filters.status) {
                const statusFilter = document.createElement("p");
                statusFilter.textContent = `• Stato: ${filters.status}`;
                statusFilter.style.margin = "4px 0";
                statusFilter.style.color = "#666";
                filterInfo.appendChild(statusFilter);
                hasFilters = true;
            }

            if (filters.fromDate) {
                const fromDateFilter = document.createElement("p");
                fromDateFilter.textContent = `• Dal: ${new Date(
                    filters.fromDate
                ).toLocaleDateString("it-IT")}`;
                fromDateFilter.style.margin = "4px 0";
                fromDateFilter.style.color = "#666";
                filterInfo.appendChild(fromDateFilter);
                hasFilters = true;
            }

            if (filters.toDate) {
                const toDateFilter = document.createElement("p");
                toDateFilter.textContent = `• Al: ${new Date(
                    filters.toDate
                ).toLocaleDateString("it-IT")}`;
                toDateFilter.style.margin = "4px 0";
                toDateFilter.style.color = "#666";
                filterInfo.appendChild(toDateFilter);
                hasFilters = true;
            }

            if (!hasFilters) {
                const noFilters = document.createElement("p");
                noFilters.textContent = "Nessun filtro applicato";
                noFilters.style.margin = "4px 0";
                noFilters.style.color = "#666";
                noFilters.style.fontStyle = "italic";
                filterInfo.appendChild(noFilters);
            }

            pdfContent.appendChild(filterInfo);

            // Add task count
            const taskCount = document.createElement("p");
            taskCount.textContent = `Totale task: ${filteredTasks.length}`;
            taskCount.style.margin = "0 0 20px 0";
            taskCount.style.color = "#333";
            taskCount.style.fontSize = "16px";
            taskCount.style.fontWeight = "bold";
            pdfContent.appendChild(taskCount);

            if (filteredTasks.length === 0) {
                const noTasks = document.createElement("p");
                noTasks.textContent =
                    "Nessun task trovato con i filtri applicati";
                noTasks.style.color = "#d6d6d6";
                noTasks.style.fontStyle = "italic";
                pdfContent.appendChild(noTasks);
            } else {
                // Group tasks by date
                const tasksByDate = {};
                filteredTasks.forEach((task) => {
                    const taskDate = task.date;
                    if (!tasksByDate[taskDate]) {
                        tasksByDate[taskDate] = [];
                    }
                    tasksByDate[taskDate].push(task);
                });

                // Sort dates
                const sortedDates = Object.keys(tasksByDate).sort();

                sortedDates.forEach((date) => {
                    // Add date header
                    const dateHeader = document.createElement("h3");
                    dateHeader.textContent = new Date(date).toLocaleDateString(
                        "it-IT",
                        {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        }
                    );
                    dateHeader.style.margin = "30px 0 15px 0";
                    dateHeader.style.color = "#1f2937";
                    dateHeader.style.fontSize = "18px";
                    dateHeader.style.fontWeight = "bold";
                    dateHeader.style.borderBottom = "2px solid #d1d5db";
                    dateHeader.style.paddingBottom = "10px";
                    pdfContent.appendChild(dateHeader);

                    // Add tasks for this date
                    tasksByDate[date].forEach((task, index) => {
                        const taskDiv = document.createElement("div");
                        taskDiv.style.marginBottom = "15px";
                        taskDiv.style.padding = "15px";
                        taskDiv.style.border = "1px solid #e5e7eb";
                        taskDiv.style.borderRadius = "8px";
                        taskDiv.style.backgroundColor = "#f9f9f9";

                        const taskTitle = document.createElement("h5");
                        taskTitle.textContent = `${task.title}`;
                        taskTitle.style.margin = "0 0 8px 0";
                        taskTitle.style.color = "#333";
                        taskTitle.style.fontSize = "16px";
                        taskDiv.appendChild(taskTitle);

                        const taskDetails = document.createElement("p");
                        taskDetails.textContent = `Simulatore: ${
                            task.simulator || "N/A"
                        } • Orario: ${task.time} • Assegnato a: ${
                            task.assignedTo
                        } • Status: ${task.status}`;
                        taskDetails.style.margin = "0";
                        taskDetails.style.color = "#666";
                        taskDetails.style.fontSize = "14px";
                        taskDiv.appendChild(taskDetails);

                        // Add category and subcategory if available
                        if (task.category || task.subcategory) {
                            const categoryDetails = document.createElement("p");
                            categoryDetails.textContent = `Categoria: ${
                                task.category || "N/A"
                            }${
                                task.subcategory
                                    ? ` • Sottocategoria: ${task.subcategory}`
                                    : ""
                            }`;
                            categoryDetails.style.margin = "4px 0 0 0";
                            categoryDetails.style.color = "#666";
                            categoryDetails.style.fontSize = "14px";
                            taskDiv.appendChild(categoryDetails);
                        }

                        // Add task description if available
                        if (task.description) {
                            const taskDescription = document.createElement("p");
                            taskDescription.textContent = `Descrizione: ${task.description}`;
                            taskDescription.style.margin = "8px 0 0 0";
                            taskDescription.style.color = "#666";
                            taskDescription.style.fontSize = "14px";
                            taskDescription.style.fontStyle = "italic";
                            taskDiv.appendChild(taskDescription);
                        }

                        // Add notes if available
                        if (task.notes && task.notes.length > 0) {
                            const notesHeader = document.createElement("p");
                            notesHeader.textContent = "Note:";
                            notesHeader.style.margin = "8px 0 4px 0";
                            notesHeader.style.color = "#333";
                            notesHeader.style.fontSize = "14px";
                            notesHeader.style.fontWeight = "bold";
                            taskDiv.appendChild(notesHeader);

                            task.notes.forEach((note) => {
                                const noteDiv = document.createElement("div");
                                noteDiv.style.margin = "4px 0 4px 16px";
                                noteDiv.style.padding = "8px";
                                noteDiv.style.backgroundColor = "#f3f4f6";
                                noteDiv.style.borderLeft = "3px solid #d1d5db";
                                noteDiv.style.borderRadius = "4px";

                                const noteText = document.createElement("p");
                                noteText.textContent = note.text;
                                noteText.style.margin = "0 0 4px 0";
                                noteText.style.color = "#333";
                                noteText.style.fontSize = "13px";
                                noteDiv.appendChild(noteText);

                                const noteAuthor = document.createElement("p");
                                const noteDate = new Date(
                                    note.timestamp
                                ).toLocaleString("it-IT");
                                noteAuthor.textContent = `${note.author} - ${noteDate}`;
                                noteAuthor.style.margin = "0";
                                noteAuthor.style.color = "#666";
                                noteAuthor.style.fontSize = "11px";
                                noteAuthor.style.fontStyle = "italic";
                                noteDiv.appendChild(noteAuthor);

                                taskDiv.appendChild(noteDiv);
                            });
                        }

                        pdfContent.appendChild(taskDiv);
                    });
                });
            }

            // Temporarily add to body
            document.body.appendChild(pdfContent);

            const opt = {
                margin: 0.5,
                filename: `ricerca-tasks-${currentDate.replace(
                    /\//g,
                    "-"
                )}.pdf`,
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
                    showModal(
                        "Successo",
                        "PDF esportato con successo!",
                        "success"
                    );
                })
                .catch((error) => {
                    console.error("PDF Export Error:", error);
                    document.body.removeChild(pdfContent);
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
                return "#139d5420";
            case "in corso":
                return "#f6ad1020";
            case "non completato":
                return "#dc262620";
            case "riassegnato":
                return "#8b5cf620";
            default:
                return "#e5e7eb";
        }
    }; // Filter functions
    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };
    const applyFilters = (tasksToFilter, currentFilters) => {
        // First, filter out "da definire" tasks
        let filtered = tasksToFilter.filter(
            (task) => task.status !== "da definire"
        );

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

        // Status filter
        if (currentFilters.status) {
            filtered = filtered.filter((task) => {
                if (currentFilters.status === "non iniziato") {
                    // Non iniziato means no status or status is not one of the defined ones
                    return (
                        !task.status ||
                        !["completato", "in corso", "non completato"].includes(
                            task.status
                        )
                    );
                }
                return task.status === currentFilters.status;
            });
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
            status: "",
        });
        setFilteredTasks([]);
        setShowFilterResults(false);
    };

    const dailyTasks = tasks.filter(
        (t) => t.date === selectedDate && t.status !== "da definire"
    );

    // Separate day and night shift tasks
    const dayShiftTasks = dailyTasks.filter((task) => {
        const taskTime = task.time;
        if (!taskTime) return true; // Include tasks without time in day shift

        const [hours, minutes] = taskTime.split(":").map(Number);
        const timeInMinutes = hours * 60 + minutes;

        // Day shift: 07:01 to 18:59 (not night shift)
        return timeInMinutes > 420 && timeInMinutes < 1140;
    });

    const nightShiftTasks = dailyTasks.filter((task) => {
        const taskTime = task.time;
        if (!taskTime) return false; // Exclude tasks without time from night shift

        const [hours, minutes] = taskTime.split(":").map(Number);
        const timeInMinutes = hours * 60 + minutes;

        // Night shift: 19:00 to 07:00 (>= 1140 OR <= 420)
        return timeInMinutes >= 1140 || timeInMinutes <= 420;
    });

    // Handle calendar day click
    const handleCalendarDayClick = (dateStr) => {
        setSelectedDate(dateStr);
        setShowCalendar(false);
        setShowTable(true);
    };

    // Handle back to calendar
    const handleBackToCalendar = () => {
        setShowCalendar(true);
        setShowTable(false);
    };

    // Fetch employees with night shift for a specific date
    const fetchNightShiftEmployees = async (selectedDate) => {
        if (!selectedDate) {
            setNightShiftEmployees([]);
            return;
        }

        setNightShiftEmployeesLoading(true);
        const token = localStorage.getItem("authToken");

        try {
            // Use a night shift time (like 20:00) to get night shift employees
            const nightTime = "20:00";
            const response = await fetch(
                `${API}/api/tasks/available-employees?date=${selectedDate}&time=${nightTime}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setNightShiftEmployees(data.availableEmployees);
            } else {
                console.error(
                    "Error fetching night shift employees:",
                    await response.text()
                );
                setNightShiftEmployees([]);
            }
        } catch (error) {
            console.error("Error fetching night shift employees:", error);
            setNightShiftEmployees([]);
        } finally {
            setNightShiftEmployeesLoading(false);
        }
    }; // Update night shift employees when selected date changes
    useEffect(() => {
        fetchNightShiftEmployees(selectedDate);
    }, [selectedDate]);

    if (loading) return <div>Caricamento task...</div>;

    return (
        <>
            <div className="flex gap-4 flex-col lg:flex-col justify-between max-w-full p-4">
                <div className="flex flex-col min-w-0 justify-start">
                    {!showCalendar && (
                        <>
                            <div className="date-selector flex items-center justify-start gap-8 flex-wrap">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleBackToCalendar}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#3b82f620] hover:bg-[#3b82f640] rounded-md transition-colors"
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
                                                d="M16 2V6M8 2V6"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <path
                                                d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <path
                                                d="M3 10H21"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <path
                                                d="M11.9955 14H12.0045M11.9955 18H12.0045M15.991 14H16M8 14H8.00897M8 18H8.00897"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                        <p className="text-[#3b82f6] text-sm">
                                            Torna al Calendario
                                        </p>
                                    </button>
                                </div>
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
                                    </svg>
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
                        </>
                    )}

                    {/* Conditional rendering: Calendar or Task Table */}
                    {showCalendar ? (
                        <Calendar
                            onDayClick={handleCalendarDayClick}
                            tasksData={tasks}
                            currentDate={selectedDate}
                            type="tasks"
                        />
                    ) : (
                        <>
                            <TaskTable
                                tasks={tasks}
                                filteredTasks={filteredTasks}
                                showFilterResults={showFilterResults}
                                dayShiftTasks={dayShiftTasks}
                                nightShiftTasks={nightShiftTasks}
                                simulatorSchedules={simulatorSchedules}
                                selectedDate={selectedDate}
                                openTaskDetails={openTaskDetails}
                                openScheduleModal={openScheduleModal}
                                getBorderColor={getBorderColor}
                                tasksListRef={tasksListRef}
                            />
                        </>
                    )}

                    {!showCalendar && (
                        <div className="flex flex-row justify-between items-start gap-8">
                            {canAddTasks() && (
                                <>
                                    <div
                                        className=" border p-4 rounded-xl bg-white w-full max-w-xl"
                                        style={{
                                            boxShadow: "4px 4px 10px #00000010",
                                        }}
                                    >
                                        {" "}
                                        <div
                                            className="title flex flex-row items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                                            onClick={() =>
                                                setIsAddTaskAccordionOpen(
                                                    !isAddTaskAccordionOpen
                                                )
                                            }
                                        >
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

                                            <p className="text-gray-600">
                                                Aggiungi task
                                            </p>

                                            {/* Accordion arrow */}
                                            <svg
                                                className={`ml-auto transform transition-transform duration-200 ${
                                                    isAddTaskAccordionOpen
                                                        ? "rotate-180"
                                                        : ""
                                                }`}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                width="16"
                                                height="16"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>
                                        {/* Accordion content */}
                                        <div
                                            className={`accordion-content overflow-hidden transition-all duration-300 ease-in-out ${
                                                isAddTaskAccordionOpen
                                                    ? "max-h-full opacity-100"
                                                    : "max-h-0 opacity-0"
                                            }`}
                                        >
                                            <div className="separator"></div>
                                            <form
                                                onSubmit={handleAddTask}
                                                className="flex flex-col gap-2"
                                            >
                                                <label
                                                    htmlFor="title"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Titolo
                                                </label>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) =>
                                                        setTitle(e.target.value)
                                                    }
                                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                    placeholder="Inserisci un titolo"
                                                    required
                                                />
                                                <label
                                                    htmlFor="description"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Descrizione
                                                </label>
                                                <textarea
                                                    id="description"
                                                    value={description}
                                                    onChange={(e) =>
                                                        setDescription(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Aggiungi descrizione (opzionale)"
                                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                                    rows="3"
                                                />
                                                <label
                                                    htmlFor="category"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Categoria
                                                </label>
                                                <select
                                                    id="category"
                                                    value={category}
                                                    onChange={(e) => {
                                                        setCategory(
                                                            e.target.value
                                                        );
                                                        setSubcategory("");
                                                        setExtraDetail("");
                                                    }}
                                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                    required
                                                >
                                                    <option value="">
                                                        Seleziona categoria
                                                    </option>
                                                    {Object.keys(
                                                        categories
                                                    ).map((c) => (
                                                        <option
                                                            key={c}
                                                            value={c}
                                                        >
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                                {category && (
                                                    <>
                                                        <label
                                                            htmlFor="subcategory"
                                                            className="text-xs text-gray-500"
                                                        >
                                                            Sotto-categoria
                                                        </label>
                                                        <select
                                                            id="subcategory"
                                                            value={subcategory}
                                                            onChange={(e) =>
                                                                setSubcategory(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                        >
                                                            <option value="">
                                                                Seleziona
                                                                sotto-categoria
                                                            </option>
                                                            {(
                                                                categories[
                                                                    category
                                                                ] || []
                                                            ).map((sc) => (
                                                                <option
                                                                    key={sc}
                                                                    value={sc}
                                                                >
                                                                    {sc}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </>
                                                )}
                                                {category ===
                                                    "troubleshooting" && (
                                                    <>
                                                        <label
                                                            htmlFor="extraDetail"
                                                            className="text-xs text-gray-500"
                                                        >
                                                            Dettaglio extra
                                                        </label>
                                                        <select
                                                            id="extraDetail"
                                                            value={extraDetail}
                                                            onChange={(e) =>
                                                                setExtraDetail(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                        >
                                                            <option value="">
                                                                Seleziona
                                                                dettaglio
                                                            </option>
                                                            {troubleshootingDetails.map(
                                                                (d) => (
                                                                    <option
                                                                        key={d}
                                                                        value={
                                                                            d
                                                                        }
                                                                    >
                                                                        {d}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    </>
                                                )}
                                                <label
                                                    htmlFor="simulator"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Simulatore
                                                </label>
                                                <select
                                                    id="simulator"
                                                    value={simulator}
                                                    onChange={(e) =>
                                                        setSimulator(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                >
                                                    <option value="">
                                                        Seleziona simulatore...
                                                    </option>
                                                    <option value="FTD">
                                                        FTD
                                                    </option>
                                                    <option value="109FFS">
                                                        109FFS
                                                    </option>
                                                    <option value="139#1">
                                                        139#1
                                                    </option>
                                                    <option value="139#3">
                                                        139#3
                                                    </option>
                                                    <option value="169">
                                                        169
                                                    </option>
                                                    <option value="189">
                                                        189
                                                    </option>
                                                    <option value="Others">
                                                        Others
                                                    </option>
                                                </select>
                                                <label
                                                    htmlFor="assignedTo"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Assegna a
                                                </label>
                                                <select
                                                    value={assignedTo}
                                                    onChange={(e) =>
                                                        setAssignedTo(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                    required
                                                    disabled={employeesLoading}
                                                >
                                                    <option value="">
                                                        {employeesLoading
                                                            ? "Caricamento dipendenti..."
                                                            : availableEmployees.length ===
                                                              0
                                                            ? "Nessun dipendente disponibile"
                                                            : "Seleziona dipendente"}
                                                    </option>
                                                    {availableEmployees.map(
                                                        (employee) => (
                                                            <option
                                                                key={employee}
                                                                value={employee}
                                                            >
                                                                {employee}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                                <label
                                                    htmlFor="date"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Data
                                                </label>
                                                <input
                                                    type="date"
                                                    value={date}
                                                    onChange={(e) =>
                                                        setDate(e.target.value)
                                                    }
                                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm"
                                                    required
                                                />
                                                <label
                                                    htmlFor="time"
                                                    className="text-xs text-gray-500"
                                                >
                                                    Orario
                                                </label>
                                                <input
                                                    type="time"
                                                    value={time}
                                                    onChange={(e) =>
                                                        setTime(e.target.value)
                                                    }
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
                                        </div>
                                    </div>
                                </>
                            )}
                            <div
                                className="tasks flex flex-col w-1/2 h-auto border p-4 rounded-xl bg-white mb-8 overflow-y-auto max-h-full max-w-full"
                                style={{
                                    boxShadow: "4px 4px 10px #00000010",
                                }}
                            >
                                {" "}
                                <div
                                    className="title flex flex-row items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                    onClick={() =>
                                        setIsFilterAccordionOpen(
                                            !isFilterAccordionOpen
                                        )
                                    }
                                >
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
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>

                                    <p className="text-gray-600">Filtro task</p>

                                    {/* Accordion arrow */}
                                    <svg
                                        className={`ml-auto transform transition-transform duration-200 ${
                                            isFilterAccordionOpen
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                                {/* Accordion content */}
                                <div
                                    className={`accordion-content overflow-hidden transition-all duration-300 ease-in-out ${
                                        isFilterAccordionOpen
                                            ? "max-h-[600px] opacity-100"
                                            : "max-h-0 opacity-0"
                                    }`}
                                >
                                    <div className="separator"></div>{" "}
                                    <div className="filter-form flex flex-col gap-2 mt-0">
                                        <label
                                            htmlFor="searchText"
                                            className="text-xs text-gray-500"
                                        >
                                            Cerca
                                        </label>
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
                                                    e.key === "Enter" &&
                                                    executeFilters()
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
                                                <>
                                                    <button
                                                        onClick={clearFilters}
                                                        className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
                                                    >
                                                        Cancella
                                                    </button>
                                                    <button
                                                        onClick={
                                                            handleExportFilteredTasks
                                                        }
                                                        className="flex items-center bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors gap-2"
                                                        disabled={
                                                            filteredTasks.length ===
                                                            0
                                                        }
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="16"
                                                            height="16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M12 2v10m0 0l3-3m-3 3l-3-3"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M5 17a2 2 0 002 2h10a2 2 0 002-2v-2"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        Export
                                                    </button>
                                                </>
                                            )}
                                        </div>{" "}
                                        <label
                                            htmlFor="status"
                                            className="text-xs text-gray-500"
                                        >
                                            Stato
                                        </label>
                                        <select
                                            value={filters.status}
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    "status",
                                                    e.target.value
                                                )
                                            }
                                            className="border px-3 py-2 rounded w-1/2 text-gray-600 text-sm focus:outline-none"
                                        >
                                            <option value="">
                                                Seleziona stato
                                            </option>
                                            <option value="non iniziato">
                                                Non iniziato
                                            </option>
                                            <option value="in corso">
                                                In corso
                                            </option>
                                            <option value="completato">
                                                Completato
                                            </option>
                                            <option value="non completato">
                                                Non completato
                                            </option>
                                        </select>
                                        <div className="flex flex-col gap-2 mt-2">
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
                                                        className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
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
                                                        className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                                    />
                                                </div>{" "}
                                            </div>{" "}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>{" "}
                <Modal
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    title={modal.title}
                    message={modal.message}
                    type={modal.type}
                    onConfirm={modal.onConfirm}
                />
                <TaskDetailsModal
                    isOpen={taskDetailsModal.isOpen}
                    onClose={closeTaskDetails}
                    task={taskDetailsModal.task}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    canToggleTask={canToggleTask}
                    canDeleteTasks={canDeleteTasks}
                    canEditDescription={canEditDescription}
                    onEditDescription={openDescriptionModal}
                    onSaveNote={handleSaveNote}
                />
                <DescriptionModal
                    isOpen={descriptionModal.isOpen}
                    onClose={closeDescriptionModal}
                    onSave={updateTaskDescription}
                    currentDescription={descriptionModal.currentDescription}
                    currentSimulator={descriptionModal.currentSimulator}
                    currentEmployee={descriptionModal.currentEmployee || ""}
                    availableEmployees={availableEmployees}
                    employeesLoading={employeesLoading}
                />
                {/* Schedule Modal */}
                {scheduleModal.isOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                Orari per Simulatore {scheduleModal.simulator}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="endTime"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Orario fine
                                    </label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        value={scheduleModal.endTime}
                                        onChange={(e) =>
                                            setScheduleModal((prev) => ({
                                                ...prev,
                                                endTime: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="startTime"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Orario inizio
                                    </label>
                                    <input
                                        type="time"
                                        id="startTime"
                                        value={scheduleModal.startTime}
                                        onChange={(e) =>
                                            setScheduleModal((prev) => ({
                                                ...prev,
                                                startTime: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="nightShiftEmployee"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Seleziona dipendente
                                    </label>
                                    <select
                                        id="nightShiftEmployee"
                                        value={scheduleModal.selectedEmployee}
                                        onChange={(e) =>
                                            setScheduleModal((prev) => ({
                                                ...prev,
                                                selectedEmployee:
                                                    e.target.value,
                                            }))
                                        }
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={nightShiftEmployeesLoading}
                                    >
                                        <option value="">
                                            {nightShiftEmployeesLoading
                                                ? "Caricamento dipendenti..."
                                                : nightShiftEmployees.length ===
                                                  0
                                                ? "Nessun dipendente disponibile nel turno notturno"
                                                : "Seleziona dipendente"}
                                        </option>
                                        {nightShiftEmployees.map((employee) => (
                                            <option
                                                key={employee}
                                                value={employee}
                                            >
                                                {employee}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={closeScheduleModal}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={saveSimulatorSchedule}
                                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
