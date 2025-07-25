import "../styles/dashboard.css";
import Logo from "../assets/logo.png";
import Modal from "../components/Modal";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Categories and troubleshooting details for task classification
const categories = {
    "routine task": ["PM", "MR", "Backup", "QTG"],
    troubleshooting: ["HW", "SW"],
    others: [
        "Part test",
        "Remote connection with support",
        "Remote connection without support",
    ],
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

export default function Dashboard() {
    const navigate = useNavigate();
    const today = new Date().toISOString().split("T")[0];
    const token = localStorage.getItem("authToken");
    let userEmail = localStorage.getItem("userEmail") || "Utente";
    userEmail = userEmail.charAt(0).toUpperCase();

    // Aggiorna il tempo corrente ogni secondo
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Prende le info dell'utente dal token JWT
    const getCurrentUser = () => {
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload;
        } catch (error) {
            console.error("Error parsing token:", error);
            return null;
        }
    };
    const currentUser = useMemo(() => getCurrentUser(), [token]);

    // Helper function to determine if task is day or night shift
    const getShiftType = (time) => {
        if (!time) return "D"; // Default to day shift if no time

        const [hours, minutes] = time.split(":").map(Number);
        const timeInMinutes = hours * 60 + minutes;

        // Night shift: 19:00 to 07:00 (>= 1140 OR <= 420)
        if (timeInMinutes >= 1140 || timeInMinutes <= 420) {
            return "N";
        }
        // Day shift: 07:01 to 18:59
        return "D";
    };

    // Fetcha le tasks dal server
    const API = process.env.REACT_APP_API_URL;
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`${API}/api/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (res.status === 401 || res.status === 403) {
                    // Token is invalid, redirect to login
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("userEmail");
                    navigate("/login");
                    return;
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    // Ensure data is an array before setting tasks
                    setTasks(Array.isArray(data) ? data : []);
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching tasks:", error);
                setTasks([]); // Set to empty array on error
                setLoading(false);
            });
    }, [navigate]); // Fetcha tutti i dipendenti
    const [users, setUsers] = useState([]);
    useEffect(() => {
        fetch(`${API}/api/users`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("userEmail");
                    navigate("/login");
                    return;
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setUsers(Array.isArray(data) ? data : []);
                }
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
            });
    }, [navigate]); // Update assignedTo in addTaskModal when currentUser is available
    useEffect(() => {
        if (currentUser?.name && addTaskModal.assignedTo === "") {
            setAddTaskModal((prev) => ({
                ...prev,
                assignedTo: currentUser.name,
            }));
        }
    }, [currentUser?.name]); // Fetcha tutti i turni del mese corrente
    const [shifts, setShifts] = useState({});
    useEffect(() => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");

        fetch(`${API}/api/shifts/${year}/${month}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("userEmail");
                    navigate("/login");
                    return;
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setShifts(data || {});
                }
            })
            .catch((error) => {
                console.error("Error fetching shifts:", error);
            });
    }, [navigate]);

    // Gestione dei modali
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
        confirmText: "Conferma",
    });
    const closeModal = () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
    };

    // Reassignment modal state
    const [reassignModal, setReassignModal] = useState({
        isOpen: false,
        task: null,
        date: "",
        time: "",
        assignedTo: "",
        availableEmployees: [],
        loading: false,
    });

    // Add task modal state
    const [addTaskModal, setAddTaskModal] = useState({
        isOpen: false,
        title: "",
        assignedTo: currentUser?.name || "",
        simulator: "",
        category: "",
        subcategory: "",
        extraDetail: "",
        date: null, // Will be null for "da definire" tasks
        time: null, // Will be null for "da definire" tasks
        availableEmployees: [],
        loading: false,
        employeesLoading: false,
    });

    // Search state for "Task da programmare" section
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredTasksToSchedule, setFilteredTasksToSchedule] = useState([]);

    const closeReassignModal = () => {
        setReassignModal({
            isOpen: false,
            task: null,
            date: "",
            time: "",
            assignedTo: "",
            availableEmployees: [],
            loading: false,
        });
    };

    // Close add task modal
    const closeAddTaskModal = () => {
        // Reset to current user when closing modal
        const currentUserName = currentUser?.name || "";

        setAddTaskModal({
            isOpen: false,
            title: "",
            assignedTo: currentUserName,
            simulator: "",
            category: "",
            subcategory: "",
            extraDetail: "",
            date: null, // Will be null for "da definire" tasks
            time: null, // Will be null for "da definire" tasks
            availableEmployees: [],
            loading: false,
            employeesLoading: false,
        });
    };

    // Open reassignment modal for "non completato" tasks
    const openReassignModal = (task) => {
        setReassignModal({
            isOpen: true,
            task: task,
            date: task.date,
            time: task.time,
            assignedTo: task.status === "da definire" ? "" : task.assignedTo, // Empty for "da definire" tasks
            availableEmployees: [],
            loading: false,
        });
        // Fetch available employees for the current date/time
        fetchAvailableEmployees(task.date, task.time);
    };

    // Fetch available employees for reassignment
    const fetchAvailableEmployees = async (date, time) => {
        try {
            const response = await fetch(
                `${API}/api/tasks/available-employees?date=${date}&time=${time}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setReassignModal((prev) => ({
                    ...prev,
                    availableEmployees: data.availableEmployees,
                }));
            }
        } catch (error) {
            console.error("Error fetching available employees:", error);
        }
    };

    // Handle task deletion
    const handleDeleteTask = async () => {
        setReassignModal((prev) => ({ ...prev, loading: true }));

        try {
            const response = await fetch(
                `${API}/api/tasks/${reassignModal.task.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                // Remove the task from the tasks state
                setTasks((prevTasks) =>
                    prevTasks.filter(
                        (task) => task.id !== reassignModal.task.id
                    )
                );
                closeReassignModal();
                setModal({
                    isOpen: true,
                    title: "Successo",
                    message: "Task eliminato con successo!",
                    type: "success",
                    onConfirm: null,
                    confirmText: "OK",
                });
            } else {
                const errorData = await response.json();
                setModal({
                    isOpen: true,
                    title: "Errore",
                    message:
                        errorData.message ||
                        "Errore durante l'eliminazione del task",
                    type: "error",
                    onConfirm: null,
                    confirmText: "OK",
                });
            }
        } catch (error) {
            console.error("Error deleting task:", error);
            setModal({
                isOpen: true,
                title: "Errore",
                message:
                    "Errore di connessione durante l'eliminazione del task",
                type: "error",
                onConfirm: null,
                confirmText: "OK",
            });
        } finally {
            setReassignModal((prev) => ({ ...prev, loading: false }));
        }
    };

    // Handle task completion
    const handleCompleteTask = async () => {
        setReassignModal((prev) => ({ ...prev, loading: true }));

        try {
            // Check if this is a "da definire" task with new assignment data
            const isDefiningTask = reassignModal.task.status === "da definire";
            const hasRequiredDate = reassignModal.date;

            // Validate that "da definire" tasks have at least a date before completion
            if (isDefiningTask && !hasRequiredDate) {
                setModal({
                    isOpen: true,
                    title: "Errore",
                    message:
                        "Per completare un task 'da definire', è necessario specificare almeno una nuova data.",
                    type: "error",
                    onConfirm: null,
                    confirmText: "OK",
                });
                setReassignModal((prev) => ({ ...prev, loading: false }));
                return;
            }

            if (isDefiningTask && hasRequiredDate) {
                // First, update the task with the new assignment data
                // Provide default values for required fields if not specified
                const updateData = {
                    date: reassignModal.date,
                    time: reassignModal.time || "08:00", // Default time if not provided
                    assignedTo: reassignModal.assignedTo || "Non assegnare", // Default assignee if not provided
                };

                const reassignResponse = await fetch(
                    `${API}/api/tasks/${reassignModal.task.id}/reassign`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(updateData),
                    }
                );

                if (!reassignResponse.ok) {
                    const errorData = await reassignResponse.json();
                    setModal({
                        isOpen: true,
                        title: "Errore",
                        message:
                            errorData.message ||
                            "Errore durante l'assegnazione del task",
                        type: "error",
                        onConfirm: null,
                        confirmText: "OK",
                    });
                    return;
                }
            }

            // Then update the status to "completato"
            const response = await fetch(
                `${API}/api/tasks/${reassignModal.task.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        status: "completato",
                    }),
                }
            );

            if (response.ok) {
                const updatedTask = await response.json();
                // Update the task in the tasks state
                setTasks((prevTasks) =>
                    prevTasks.map((task) =>
                        task.id === updatedTask.id ? updatedTask : task
                    )
                );
                closeReassignModal();
                setModal({
                    isOpen: true,
                    title: "Successo",
                    message: "Task completato con successo!",
                    type: "success",
                    onConfirm: null,
                    confirmText: "OK",
                });
            } else {
                const errorData = await response.json();
                setModal({
                    isOpen: true,
                    title: "Errore",
                    message:
                        errorData.message ||
                        "Errore durante il completamento del task",
                    type: "error",
                    onConfirm: null,
                    confirmText: "OK",
                });
            }
        } catch (error) {
            console.error("Error completing task:", error);
            setModal({
                isOpen: true,
                title: "Errore",
                message:
                    "Errore di connessione durante il completamento del task",
                type: "error",
                onConfirm: null,
                confirmText: "OK",
            });
        } finally {
            setReassignModal((prev) => ({ ...prev, loading: false }));
        }
    };

    // Handle reassignment form submission
    const handleReassignTask = async () => {
        if (
            !reassignModal.date ||
            !reassignModal.time ||
            !reassignModal.assignedTo
        ) {
            setModal({
                isOpen: true,
                title: "Errore",
                message:
                    "Tutti i campi sono obbligatori per la riassegnazione.",
                type: "error",
                onConfirm: null,
                confirmText: "OK",
            });
            return;
        }

        setReassignModal((prev) => ({ ...prev, loading: true }));

        console.log("Reassigning task:", {
            taskId: reassignModal.task.id,
            date: reassignModal.date,
            time: reassignModal.time,
            assignedTo: reassignModal.assignedTo,
            apiUrl: `${API}/api/tasks/${reassignModal.task.id}/reassign`,
        });

        try {
            const response = await fetch(
                `${API}/api/tasks/${reassignModal.task.id}/reassign`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        date: reassignModal.date,
                        time: reassignModal.time,
                        assignedTo: reassignModal.assignedTo,
                    }),
                }
            );

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            if (response.ok) {
                const updatedTask = await response.json();
                console.log("Task updated successfully:", updatedTask);
                // Update the tasks state
                setTasks((prevTasks) =>
                    prevTasks.map((task) =>
                        task.id === updatedTask.id ? updatedTask : task
                    )
                );
                closeReassignModal();
                setModal({
                    isOpen: true,
                    title: "Successo",
                    message: "Task riassegnato con successo!",
                    type: "success",
                    onConfirm: null,
                    confirmText: "OK",
                });
            } else {
                // Try to get error response as text first, then parse as JSON if possible
                const responseText = await response.text();
                console.log("Error response text:", responseText);

                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    // If it's not JSON, it's likely an HTML error page
                    errorData = {
                        message: `Server error (${
                            response.status
                        }): ${responseText.substring(0, 200)}...`,
                    };
                }

                console.log("Error response:", errorData);
                setModal({
                    isOpen: true,
                    title: "Errore",
                    message:
                        errorData.message ||
                        "Errore durante la riassegnazione del task.",
                    type: "error",
                    onConfirm: null,
                    confirmText: "OK",
                });
            }
        } catch (error) {
            console.error("Error reassigning task:", error);
            console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
            setModal({
                isOpen: true,
                title: "Errore",
                message: `Errore di connessione durante la riassegnazione del task: ${error.message}`,
                type: "error",
                onConfirm: null,
                confirmText: "OK",
            });
        } finally {
            setReassignModal((prev) => ({ ...prev, loading: false }));
        }
    };

    // Handle date/time change in reassignment modal
    const handleReassignFormChange = async (field, value) => {
        setReassignModal((prev) => ({ ...prev, [field]: value }));

        // If date or time changes, refetch available employees
        if (field === "date" || field === "time") {
            const date = field === "date" ? value : reassignModal.date;
            const time = field === "time" ? value : reassignModal.time;
            if (date && time) {
                await fetchAvailableEmployees(date, time);
            }
        }
    };

    // Open add task modal
    const openAddTaskModal = () => {
        // Close any existing modal first
        setModal((prev) => ({ ...prev, isOpen: false }));

        // For "da definire" tasks, we show all users from the system
        // since we don't care about availability for a specific time
        const allEmployeeNames = users.map((user) => user.name).filter(Boolean);

        // Automatically assign to current logged-in user
        const currentUserName = currentUser?.name || "";

        setAddTaskModal((prev) => ({
            ...prev,
            isOpen: true,
            assignedTo: currentUserName,
            availableEmployees: allEmployeeNames,
        }));
    };

    // Fetch available employees for add task modal
    const fetchAvailableEmployeesForAddTask = async (
        selectedDate,
        selectedTime
    ) => {
        if (!selectedDate || !selectedTime) {
            setAddTaskModal((prev) => ({ ...prev, availableEmployees: [] }));
            return;
        }

        setAddTaskModal((prev) => ({ ...prev, employeesLoading: true }));

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
                setAddTaskModal((prev) => ({
                    ...prev,
                    availableEmployees: data.availableEmployees,
                }));
            } else {
                console.error(
                    "Error fetching available employees:",
                    await response.text()
                );
                setAddTaskModal((prev) => ({
                    ...prev,
                    availableEmployees: [],
                }));
            }
        } catch (error) {
            console.error("Error fetching available employees:", error);
            setAddTaskModal((prev) => ({ ...prev, availableEmployees: [] }));
        } finally {
            setAddTaskModal((prev) => ({ ...prev, employeesLoading: false }));
        }
    };

    // Handle add task form change
    const handleAddTaskFormChange = async (field, value) => {
        setAddTaskModal((prev) => ({ ...prev, [field]: value }));

        // Reset dependent fields when category changes
        if (field === "category") {
            setAddTaskModal((prev) => ({
                ...prev,
                subcategory: "",
                extraDetail: "",
            }));
        }
    };

    // Handle add task form submission
    const handleAddTask = async (e) => {
        e.preventDefault();

        if (!addTaskModal.title || !addTaskModal.assignedTo) {
            setModal({
                isOpen: true,
                title: "Errore",
                message: "Tutti i campi obbligatori devono essere compilati.",
                type: "error",
                onConfirm: null,
                confirmText: "OK",
            });
            return;
        }

        setAddTaskModal((prev) => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`${API}/api/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: addTaskModal.title,
                    assignedTo: addTaskModal.assignedTo,
                    simulator: addTaskModal.simulator,
                    category: addTaskModal.category,
                    subcategory: addTaskModal.subcategory,
                    extraDetail: addTaskModal.extraDetail,
                    date: null, // Set to null for "da definire" tasks
                    time: null, // Set to null for "da definire" tasks
                    status: "da definire", // Set status to "da definire"
                }),
            });

            if (response.ok) {
                const newTask = await response.json();
                // Update the tasks state
                setTasks((prevTasks) => [...prevTasks, newTask]);
                closeAddTaskModal();
                setModal({
                    isOpen: true,
                    title: "Successo",
                    message: "Task aggiunto con successo!",
                    type: "success",
                    onConfirm: null,
                    confirmText: "OK",
                });
            } else {
                const errorData = await response.json();
                setModal({
                    isOpen: true,
                    title: "Errore",
                    message:
                        errorData.message ||
                        "Errore durante l'aggiunta del task.",
                    type: "error",
                    onConfirm: null,
                    confirmText: "OK",
                });
            }
        } catch (error) {
            console.error("Error adding task:", error);
            setModal({
                isOpen: true,
                title: "Errore",
                message: `Errore di connessione durante l'aggiunta del task: ${error.message}`,
                type: "error",
                onConfirm: null,
                confirmText: "OK",
            });
        } finally {
            setAddTaskModal((prev) => ({ ...prev, loading: false }));
        }
    };

    // Imposta il colore del bordo in base allo stato del task
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
            case "da definire":
                return "#6366f120";
            default:
                return "#e5e7eb";
        }
    }; // Filtra le task (prende le task di oggi)
    const dailyTasks = Array.isArray(tasks)
        ? tasks.filter((t) => t.date === today)
        : [];

    // Filtra i task incompleti
    const incompleteTasks = Array.isArray(tasks)
        ? tasks.filter((task) => task.status === "non completato")
        : [];

    // Filtra i task da definire
    const tasksToSchedule = Array.isArray(tasks)
        ? tasks.filter((task) => task.status === "da definire")
        : [];

    // Search functionality for tasks to schedule
    const handleSearchChange = (e) => {
        const newValue = e.target.value;
        setSearchQuery(newValue);
        // Clear search results when input is empty
        if (!newValue.trim()) {
            setFilteredTasksToSchedule([]);
        }
    };

    const handleSearch = () => {
        // Search is handled automatically by useEffect when searchQuery changes
        // This function is kept for explicit search button clicks if needed
    };

    const clearSearch = () => {
        setSearchQuery("");
        setFilteredTasksToSchedule([]);
    };

    // Update filtered tasks when search query changes or when pressing Enter
    useEffect(() => {
        if (searchQuery.trim()) {
            const filtered = tasksToSchedule.filter((task) => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    task.title?.toLowerCase().includes(searchLower) ||
                    task.assignedTo?.toLowerCase().includes(searchLower) ||
                    task.simulator?.toLowerCase().includes(searchLower) ||
                    task.category?.toLowerCase().includes(searchLower) ||
                    task.subcategory?.toLowerCase().includes(searchLower)
                );
            });
            setFilteredTasksToSchedule(filtered);
        } else {
            setFilteredTasksToSchedule([]);
        }
    }, [searchQuery, tasksToSchedule]);

    // Function to get tasks to display (filtered or all)
    const getTasksToScheduleDisplay = () => {
        return searchQuery.trim() ? filteredTasksToSchedule : tasksToSchedule;
    };

    // Prende le task del turno diurno
    const dayTasks = dailyTasks.filter((task) => {
        if (!task.time) return false;
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 7 && hour < 19;
    });
    const incompleteDayTasks = incompleteTasks.filter((task) => {
        if (!task.time) return false;
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 7 && hour < 19;
    });

    // Prende le task del turno notturno
    const nightTasks = dailyTasks.filter((task) => {
        if (!task.time) return false;
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 19 || hour < 7;
    });
    const incompleteNightTasks = incompleteTasks.filter((task) => {
        if (!task.time) return false;
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 19 || hour < 7;
    });

    // Filtra i turni in base all'orario
    const getCurrentShift = () => {
        const currentHour = currentTime.getHours();
        if (currentHour >= 7 && currentHour < 14) {
            return "O";
        } else if (currentHour >= 14 && currentHour < 23) {
            return "OP";
        } else {
            return "ON";
        }
    };
    const getShiftName = () => {
        const shift = getCurrentShift();

        const shiftNames = {
            O: "Mattino",
            OP: "Pomeriggio",
            ON: "Notte",
        };

        return shiftNames[shift];
    };

    const getCurrentShiftEmployees = () => {
        const shift = getCurrentShift();
        const today = new Date().toISOString().split("T")[0];

        if (shifts[today]) {
            const todayShifts = shifts[today];
            const employeesInShift = [];

            users.forEach((user) => {
                const userShiftData = todayShifts[user.name];
                if (userShiftData && userShiftData.shift) {
                    const userShift = userShiftData.shift;

                    // Check if user's shift matches current time period
                    if (
                        userShift === shift ||
                        (userShift === "D" &&
                            (shift === "O" || shift === "OP")) ||
                        (userShift === "N" && shift === "ON")
                    ) {
                        employeesInShift.push(user.name);
                    }
                }
            });

            return employeesInShift;
        }

        return [];
    };

    const getAllShiftEmployees = () => {
        const today = new Date().toISOString().split("T")[0];
        const shiftGroups = {
            Giorno: [],
            Notte: [],
        };

        if (shifts[today]) {
            const todayShifts = shifts[today];

            users.forEach((user) => {
                // Skip admin users since they are displayed in the Shift Leader section
                if (user.role === "admin") {
                    return;
                }

                const userShiftData = todayShifts[user.name];
                if (userShiftData) {
                    switch (userShiftData.shift) {
                        case "O":
                        case "OP":
                            // O (Mattino) and OP (Pomeriggio) both go to Giorno
                            if (!shiftGroups.Giorno.includes(user.name)) {
                                shiftGroups.Giorno.push(user.name);
                            }
                            break;
                        case "ON":
                            shiftGroups.Notte.push(user.name);
                            break;
                        case "D":
                            // D (Day) shift goes to Giorno
                            if (!shiftGroups.Giorno.includes(user.name)) {
                                shiftGroups.Giorno.push(user.name);
                            }
                            break;
                        case "N":
                            // N (Night) shift appears in Notte
                            shiftGroups.Notte.push(user.name);
                            break;
                    }
                }
            });
        }

        return shiftGroups;
    };

    const getAdminUsers = () => {
        const today = new Date().toISOString().split("T")[0];

        if (!shifts[today]) {
            return [];
        }

        const todayShifts = shifts[today];

        return users
            .filter((user) => {
                // Check if user is admin and has a shift today
                const hasShiftToday =
                    todayShifts[user.name] && todayShifts[user.name].shift;
                return user.role === "admin" && hasShiftToday;
            })
            .map((user) => ({
                name: user.name,
                shift: todayShifts[user.name].shift,
            }));
    };
    const renderTaskList = (
        taskList,
        showDates = false,
        isIncompleteSection = false
    ) => {
        if (taskList.length === 0) {
            return (
                <div className="text-center py-2 text-gray-400 text-xs">
                    Nessun task per il turno
                </div>
            );
        }

        // Group tasks by simulator
        const tasksBySimulator = taskList.reduce((acc, task) => {
            const simulator = task.simulator || "Others";
            if (!acc[simulator]) {
                acc[simulator] = [];
            }
            acc[simulator].push(task);
            return acc;
        }, {});

        const simulators = Object.keys(tasksBySimulator).sort();

        return (
            <div className="space-y-4">
                {simulators.map((simulator) => (
                    <div key={simulator} className="simulator-section">
                        <h5 className="text-xs text-blue-600 mb-4">
                            {simulator}
                        </h5>
                        <div className="space-y-2">
                            {tasksBySimulator[simulator].map((task) => (
                                <div
                                    key={task.id}
                                    className={`display-task flex items-center justify-between dashboard-content p-2 rounded bg-gray-100 ${
                                        isIncompleteSection &&
                                        (task.status === "non completato" ||
                                            task.status === "da definire") &&
                                        (currentUser?.role === "admin" ||
                                            currentUser?.role === "superuser")
                                            ? "cursor-pointer hover:bg-gray-200 transition-colors"
                                            : ""
                                    }`}
                                    style={{
                                        border: `2px solid ${getBorderColor(
                                            task.status
                                        )}`,
                                    }}
                                    onClick={() => {
                                        if (
                                            isIncompleteSection &&
                                            (task.status === "non completato" ||
                                                task.status ===
                                                    "da definire") &&
                                            (currentUser?.role === "admin" ||
                                                currentUser?.role ===
                                                    "superuser")
                                        ) {
                                            openReassignModal(task);
                                        }
                                    }}
                                >
                                    <div className="task-info flex-1 min-w-0">
                                        <p className="text-gray-600 font-semibold text-sm">
                                            {task.title}
                                        </p>
                                        <div className="text-xs text-gray-500 capitalize">
                                            {showDates &&
                                                task.date !== today &&
                                                task.date && (
                                                    <span>
                                                        {new Date(
                                                            task.date
                                                        ).toLocaleDateString(
                                                            "it-IT"
                                                        )}{" "}
                                                        •{" "}
                                                    </span>
                                                )}
                                            Turno: {getShiftType(task.time)} •{" "}
                                            {task.assignedTo === "Non assegnare"
                                                ? "Non assegnato"
                                                : task.assignedTo}{" "}
                                            • {task.status}
                                        </div>
                                    </div>
                                    {isIncompleteSection &&
                                        (task.status === "non completato" ||
                                            task.status === "da definire") &&
                                        (currentUser?.role === "admin" ||
                                            currentUser?.role ===
                                                "superuser") && (
                                            <div className="text-xs text-blue-600 font-medium flex-shrink-0 ml-2">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="16"
                                                    height="16"
                                                    color="oklch(44.6% 0.03 256.802)"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M16.4249 4.60509L17.4149 3.6151C18.2351 2.79497 19.5648 2.79497 20.3849 3.6151C21.205 4.43524 21.205 5.76493 20.3849 6.58507L19.3949 7.57506M16.4249 4.60509L9.76558 11.2644C9.25807 11.772 8.89804 12.4078 8.72397 13.1041L8 16L10.8959 15.276C11.5922 15.102 12.228 14.7419 12.7356 14.2344L19.3949 7.57506M16.4249 4.60509L19.3949 7.57506"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M18.9999 13.5C18.9999 16.7875 18.9999 18.4312 18.092 19.5376C17.9258 19.7401 17.7401 19.9258 17.5375 20.092C16.4312 21 14.7874 21 11.4999 21H11C7.22876 21 5.34316 21 4.17159 19.8284C3.00003 18.6569 3 16.7712 3 13V12.5C3 9.21252 3 7.56879 3.90794 6.46244C4.07417 6.2599 4.2599 6.07417 4.46244 5.90794C5.56879 5 7.21252 5 10.5 5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="top-dashboard flex justify-between items-center px-4 text-gray-800">
                <div>
                    <h1 className="text-2xl font-bold">
                        Ciao {currentUser?.name}
                    </h1>
                </div>
                <div className="flex justify-center">
                    <img
                        src={Logo}
                        alt="Company Logo"
                        className="h-16 w-auto"
                    />
                </div>
                <div className="date-time-display px-4 py-2">
                    <div className="flex flex-col justify-center items-center gap-1">
                        <div className="text-xl text-[#3b82f6] bg-[#3b82f620] py-2 px-4 rounded-md">
                            {currentTime.toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                            {currentTime.toLocaleDateString("it-IT", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="dashboard-content flex justify-between gap-4 p-4 mt-16 h-full max-h-[70vh]">
                <div className="tasks border p-4 rounded-xl bg-white w-1/2 max-w-[30vw] max-h-full overflow-y-auto pb-4">
                    <div className="title flex flex-row items-center justify-between mb-4">
                        <div className="left-row title flex flex-row items-center gap-2 ">
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
                                ></path>
                                <path
                                    d="M13 21.998C12.031 20.8176 10.5 18 8.5 18C7.20975 18.1059 6.53573 19.3611 5.84827 20.3287M5.84827 20.3287C5.45174 19.961 5.30251 19.4126 5.00406 18.3158L3.26022 11.9074C2.5584 9.32827 2.20749 8.0387 2.80316 7.02278C3.39882 6.00686 4.70843 5.66132 7.32766 4.97025L9.5 4.39708M5.84827 20.3287C6.2448 20.6965 6.80966 20.8103 7.9394 21.0379L12.0813 21.8725C12.9642 22.0504 12.9721 22.0502 13.8426 21.8205L16.6723 21.0739C19.2916 20.3828 20.6012 20.0373 21.1968 19.0214C21.7925 18.0055 21.4416 16.7159 20.7398 14.1368L19.0029 7.75375C18.301 5.17462 17.9501 3.88506 16.9184 3.29851C16.0196 2.78752 14.9098 2.98396 12.907 3.5"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                ></path>
                            </svg>
                            <p className="text-gray-600">Task di oggi</p>
                        </div>
                    </div>

                    <div className="separator"></div>

                    {loading ? (
                        <div className="text-center py-4">
                            Caricamento task...
                        </div>
                    ) : dailyTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            Nessun task per oggi
                        </div>
                    ) : (
                        <div>
                            <div className="mb-6 mt-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        color="oklch(44.6% 0.03 256.802)"
                                        fill="none"
                                    >
                                        <path
                                            d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                        ></path>
                                        <path
                                            d="M12 2V3.5M12 20.5V22M19.0708 19.0713L18.0101 18.0106M5.98926 5.98926L4.9286 4.9286M22 12H20.5M3.5 12H2M19.0713 4.92871L18.0106 5.98937M5.98975 18.0107L4.92909 19.0714"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        ></path>
                                    </svg>
                                    <h4 className="text-gray-600">Giorno</h4>
                                    <span className="span">
                                        {dayTasks.length} task
                                    </span>
                                </div>
                                {renderTaskList(dayTasks, "Day")}
                            </div>

                            <div className="separator"></div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        color="oklch(44.6% 0.03 256.802)"
                                        fill="none"
                                    >
                                        <path
                                            d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91792 11.2509 8.91792 6.52485C8.91792 5.06986 9.28105 3.69968 9.92163 2.5C5.66765 3.49698 2.5 7.31513 2.5 11.8731C2.5 17.1899 6.8101 21.5 12.1269 21.5C16.6849 21.5 20.503 18.3324 21.5 14.0784Z"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        ></path>
                                    </svg>
                                    <h4 className="text-gray-600">Notte</h4>
                                    <span className="span">
                                        {nightTasks.length} task
                                    </span>
                                </div>
                                {renderTaskList(nightTasks, "Night")}
                            </div>
                        </div>
                    )}
                </div>{" "}
                <div className="tasks border p-4 rounded-xl bg-white w-1/2 max-w-[30vw] max-h-full overflow-y-auto pb-4">
                    <div className="title flex flex-row items-center justify-between mb-4">
                        <div className="left-row title flex flex-row items-center gap-2 ">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <path
                                    d="M12 2.00012C17.5228 2.00012 22 6.47727 22 12.0001C22 17.523 17.5228 22.0001 12 22.0001C6.47715 22.0001 2 17.523 2 12.0001M8.909 2.48699C7.9 2.8146 6.96135 3.29828 6.12153 3.90953M3.90943 6.12162C3.29806 6.9616 2.81432 7.90044 2.4867 8.90964"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M14.9994 15.0001L9 9.00012M9.00064 15.0001L15 9.00012"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>{" "}
                            <p className="text-gray-600">Task da programmare</p>
                            {(currentUser?.role === "admin" ||
                                currentUser?.role === "superuser") && (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="20"
                                    height="20"
                                    color="#3b82f6"
                                    fill="none"
                                    className="cursor-pointer hover:scale-110 transition-transform"
                                    onClick={openAddTaskModal}
                                >
                                    <path
                                        d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M12 8V16M16 12H8"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                        </div>
                    </div>

                    <div className="separator"></div>

                    {loading ? (
                        <div className="text-center py-4">
                            Caricamento task...
                        </div>
                    ) : incompleteTasks.length === 0 &&
                      tasksToSchedule.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            Nessun task da programmare o incompleto
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-row gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Cerca per testo, titolo, nome..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearch();
                                        }
                                    }}
                                    className="flex w-full border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="flex items-center px-3 py-2 rounded text-sm transition-colors bg-red-500 text-white hover:bg-red-600"
                                        title="Cancella ricerca"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Tasks to schedule section */}
                            {(searchQuery.trim()
                                ? filteredTasksToSchedule.length > 0
                                : tasksToSchedule.length > 0) && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            width="20"
                                            height="20"
                                            color="oklch(44.6% 0.03 256.802)"
                                            fill="none"
                                        >
                                            <path
                                                d="M5.04798 8.60657L2.53784 8.45376C4.33712 3.70477 9.503 0.999914 14.5396 2.34474C19.904 3.77711 23.0904 9.26107 21.6565 14.5935C20.2227 19.926 14.7116 23.0876 9.3472 21.6553C5.36419 20.5917 2.58192 17.2946 2 13.4844"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            ></path>
                                            <path
                                                d="M12 8V12L14 14"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            ></path>
                                        </svg>
                                        <h4 className="text-gray-600">
                                            {searchQuery.trim()
                                                ? "Risultati ricerca"
                                                : "Da Definire"}
                                        </h4>
                                        <span className="span">
                                            {getTasksToScheduleDisplay().length}{" "}
                                            task
                                        </span>
                                    </div>
                                    {renderTaskList(
                                        getTasksToScheduleDisplay(),
                                        false,
                                        true
                                    )}
                                </div>
                            )}

                            {/* No search results message */}
                            {searchQuery.trim() &&
                                filteredTasksToSchedule.length === 0 && (
                                    <div className="text-center py-4 text-gray-400">
                                        Nessun task trovato per "{searchQuery}"
                                    </div>
                                )}

                            <div className="separator"></div>

                            {/* Incomplete tasks section */}
                            {incompleteTasks.length > 0 && (
                                <div className="mb-6 mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            width="20"
                                            height="20"
                                            color="oklch(44.6% 0.03 256.802)"
                                            fill="none"
                                        >
                                            <path
                                                d="M12 2.00012C17.5228 2.00012 22 6.47727 22 12.0001C22 17.523 17.5228 22.0001 12 22.0001C6.47715 22.0001 2 17.523 2 12.0001M8.909 2.48699C7.9 2.8146 6.96135 3.29828 6.12153 3.90953M3.90943 6.12162C3.29806 6.9616 2.81432 7.90044 2.4867 8.90964"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M14.9994 15.0001L9 9.00012M9.00064 15.0001L15 9.00012"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        <h4 className="text-gray-600">
                                            Non Completati
                                        </h4>
                                        <span className="span">
                                            {incompleteTasks.length} task
                                        </span>
                                    </div>
                                    {renderTaskList(
                                        incompleteTasks,
                                        true,
                                        true
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>{" "}
                <div className="employees border p-4 rounded-xl bg-white w-1/4 max-h-full overflow-y-auto">
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
                                d="M7.5 19.5C7.5 18.5344 7.82853 17.5576 8.63092 17.0204C9.59321 16.3761 10.7524 16 12 16C13.2476 16 14.4068 16.3761 15.3691 17.0204C16.1715 17.5576 16.5 18.5344 16.5 19.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <circle
                                cx="12"
                                cy="11"
                                r="2.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></circle>
                            <path
                                d="M17.5 11C18.6101 11 19.6415 11.3769 20.4974 12.0224C21.2229 12.5696 21.5 13.4951 21.5 14.4038V14.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <circle
                                cx="17.5"
                                cy="6.5"
                                r="2"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></circle>
                            <path
                                d="M6.5 11C5.38987 11 4.35846 11.3769 3.50256 12.0224C2.77706 12.5696 2.5 13.4951 2.5 14.4038V14.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <circle
                                cx="6.5"
                                cy="6.5"
                                r="2"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></circle>
                        </svg>
                        <p className="text-gray-600">Turni di oggi</p>
                    </div>

                    <div className="separator"></div>

                    {/* Shift Leader Section */}
                    <div className="shift-column mb-6">
                        <h5 className="flex gap-2 items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                ></circle>
                                <path
                                    d="M12 8V12L14 14"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                ></path>
                            </svg>
                            <p className="text-gray-600">Shift Leader</p>
                        </h5>
                        {(() => {
                            const adminUsers = getAdminUsers();
                            return adminUsers.length > 0 ? (
                                adminUsers.map((admin, index) => (
                                    <div
                                        key={index}
                                        className="display-task flex justify-center items-center dashboard-content gap-2 p-3 border border-gray-200 rounded my-4 bg-blue-50"
                                    >
                                        <p className="text-gray-600 text-sm text-center font-medium">
                                            {admin.name}
                                        </p>
                                        <p className="text-gray-400 text-sm text-center">
                                            |
                                        </p>
                                        <p className="text-blue-500 font-bold text-xs text-center">
                                            {admin.shift}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-2 text-gray-400 text-xs">
                                    Nessun shift leader
                                </div>
                            );
                        })()}
                    </div>

                    <div className="separator"></div>

                    <div className="flex flex-col">
                        {Object.entries(getAllShiftEmployees()).map(
                            ([shiftName, employees]) => (
                                <div key={shiftName} className="shift-column">
                                    <h5 className="flex gap-2 items-center">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            width="20"
                                            height="20"
                                            color="oklch(44.6% 0.03 256.802)"
                                            fill="none"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="oklch(44.6% 0.03 256.802)"
                                                strokeWidth="1.5"
                                            ></circle>
                                            <path
                                                d="M12 8V12L14 14"
                                                stroke="oklch(44.6% 0.03 256.802)"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            ></path>
                                        </svg>
                                        <p className="text-gray-600">
                                            {shiftName}
                                        </p>
                                    </h5>
                                    {employees.length > 0 ? (
                                        employees.map((employee, index) => (
                                            <div
                                                key={index}
                                                className="display-task dashboard-content p-3 border border-gray-200 rounded my-4 bg-gray-100"
                                            >
                                                <p className="text-gray-600 text-sm text-center">
                                                    {employee}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-2 text-gray-400 text-xs">
                                            Nessun dipendente
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>{" "}
            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onConfirm={modal.onConfirm}
                confirmText={modal.confirmText}
            />{" "}
            {/* Reassignment Modal */}
            {reassignModal.isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={closeReassignModal}
                >
                    <div
                        className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold mb-2 text-gray-800">
                            {reassignModal.task?.title}
                        </h2>

                        <div className="mb-2">
                            <p className="text-sm text-gray-600">
                                Task attualmente assegnato a{" "}
                                {reassignModal.task?.assignedTo}
                            </p>
                        </div>

                        <div className="separator"></div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nuova Data*
                                </label>
                                <input
                                    type="date"
                                    value={reassignModal.date}
                                    onChange={(e) =>
                                        handleReassignFormChange(
                                            "date",
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nuovo Orario
                                </label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="shiftTime"
                                            value="08:00"
                                            checked={
                                                reassignModal.time === "08:00"
                                            }
                                            onChange={(e) =>
                                                handleReassignFormChange(
                                                    "time",
                                                    e.target.value
                                                )
                                            }
                                            className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                                            style={{
                                                accentColor: "#3b82f6",
                                                cursor: "pointer",
                                            }}
                                        />
                                        <span className="text-gray-700 font-medium">
                                            D
                                        </span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="shiftTime"
                                            value="23:00"
                                            checked={
                                                reassignModal.time === "23:00"
                                            }
                                            onChange={(e) =>
                                                handleReassignFormChange(
                                                    "time",
                                                    e.target.value
                                                )
                                            }
                                            className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                                            style={{
                                                accentColor: "#3b82f6",
                                                cursor: "pointer",
                                            }}
                                        />
                                        <span className="text-gray-700 font-medium">
                                            N
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nuovo Dipendente
                                </label>
                                <select
                                    value={reassignModal.assignedTo}
                                    onChange={(e) =>
                                        handleReassignFormChange(
                                            "assignedTo",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        Seleziona dipendente...
                                    </option>
                                    {reassignModal.availableEmployees.map(
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
                                {reassignModal.availableEmployees.length ===
                                    0 && (
                                    <p className="text-xs text-orange-600 mt-1">
                                        Nessun dipendente disponibile per questa
                                        data/ora
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDeleteTask}
                                    disabled={reassignModal.loading}
                                    className="px-4 py-2 text-red-600 border bg-red-50 border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50"
                                >
                                    Elimina
                                </button>
                                <button
                                    onClick={handleCompleteTask}
                                    disabled={
                                        reassignModal.loading ||
                                        (reassignModal.task.status ===
                                            "da definire" &&
                                            !reassignModal.date)
                                    }
                                    className="px-4 py-2 text-green-600 border bg-green-50 border-green-300 rounded-md hover:bg-green-100 disabled:opacity-50"
                                >
                                    Completato
                                </button>
                            </div>
                        </div>

                        <div className="separator"></div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={closeReassignModal}
                                disabled={reassignModal.loading}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleReassignTask}
                                disabled={
                                    reassignModal.loading ||
                                    !reassignModal.date ||
                                    !reassignModal.time ||
                                    !reassignModal.assignedTo
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {reassignModal.loading
                                    ? "Riassegnando..."
                                    : "Riassegna"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Task Modal */}
            {addTaskModal.isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
                    onClick={closeAddTaskModal}
                >
                    <div
                        className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold mb-4 text-gray-800">
                            Task da programmare
                        </h2>

                        <form onSubmit={handleAddTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Titolo *
                                </label>
                                <input
                                    type="text"
                                    value={addTaskModal.title}
                                    onChange={(e) =>
                                        handleAddTaskFormChange(
                                            "title",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Inserisci un titolo"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Categoria
                                </label>
                                <select
                                    value={addTaskModal.category}
                                    onChange={(e) =>
                                        handleAddTaskFormChange(
                                            "category",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        Seleziona categoria
                                    </option>
                                    {Object.keys(categories).map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {addTaskModal.category && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sotto-categoria
                                    </label>
                                    <select
                                        value={addTaskModal.subcategory}
                                        onChange={(e) =>
                                            handleAddTaskFormChange(
                                                "subcategory",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">
                                            Seleziona sotto-categoria
                                        </option>
                                        {(
                                            categories[addTaskModal.category] ||
                                            []
                                        ).map((sc) => (
                                            <option key={sc} value={sc}>
                                                {sc}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {addTaskModal.category === "troubleshooting" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dettaglio extra
                                    </label>
                                    <select
                                        value={addTaskModal.extraDetail}
                                        onChange={(e) =>
                                            handleAddTaskFormChange(
                                                "extraDetail",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">
                                            Seleziona dettaglio
                                        </option>
                                        {troubleshootingDetails.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Simulatore
                                </label>
                                <select
                                    value={addTaskModal.simulator}
                                    onChange={(e) =>
                                        handleAddTaskFormChange(
                                            "simulator",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        Seleziona simulatore...
                                    </option>
                                    <option value="FTD">FTD</option>
                                    <option value="109FFS">109FFS</option>
                                    <option value="139#1">139#1</option>
                                    <option value="139#3">139#3</option>
                                    <option value="169">169</option>
                                    <option value="189">189</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            {/* Assigned user is automatically set to current user */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Assegnato a
                                </label>
                                <input
                                    type="text"
                                    value={addTaskModal.assignedTo}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeAddTaskModal}
                                    disabled={addTaskModal.loading}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        addTaskModal.loading ||
                                        !addTaskModal.title ||
                                        !addTaskModal.assignedTo
                                    }
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {addTaskModal.loading
                                        ? "Aggiungendo..."
                                        : "Aggiungi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
