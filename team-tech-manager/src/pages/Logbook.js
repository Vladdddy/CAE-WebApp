import { useEffect, useState, useCallback } from "react";
import "../styles/tasks.css";
import TaskDetailsModal from "../components/TaskDetailsModal";
import Modal from "../components/Modal";
import DescriptionModal from "../components/DescriptionModal";
import Calendar from "../components/Calendar";
import LogbookTable from "../components/LogbookTable";
import html2pdf from "html2pdf.js";
import {
    notesService,
    migrateNotesFromLocalStorage,
    generateLogbookNoteKey,
    generateLegacyLogbookNoteKey,
    migrateNoteFromLegacyKey,
} from "../utils/notesService";

const API = process.env.REACT_APP_API_URL;
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

export default function Logbook() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [entries, setEntries] = useState([]);
    const [filteredEntries, setFilteredEntries] = useState([]);
    // Add calendar entries state to hold entries for the entire month
    const [calendarEntries, setCalendarEntries] = useState([]);
    const [calendarEntriesLoading, setCalendarEntriesLoading] = useState(false);
    const [name, setName] = useState("");
    const [text, setText] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [extraDetail, setExtraDetail] = useState("");
    const [simulator, setSimulator] = useState("");
    const [formDate, setFormDate] = useState(date);
    const [formTime, setFormTime] = useState("08:00");
    const [duration, setDuration] = useState("");
    const [editIndex, setEditIndex] = useState(null);

    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterSubcategory, setFilterSubcategory] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    // Add a separate state for the current month to ensure proper calendar refresh
    const [currentMonth, setCurrentMonth] = useState(
        new Date().toISOString().substring(0, 7)
    );
    const [isSearching, setIsSearching] = useState(false);
    const [showFilterResults, setShowFilterResults] = useState(false);
    const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);
    const [isAddTaskAccordionOpen, setIsAddTaskAccordionOpen] = useState(false);
    const [isTaskAccordionOpen, setIsTaskAccordionOpen] = useState(false);

    // Calendar and view state
    const [showCalendar, setShowCalendar] = useState(true);
    const [showTable, setShowTable] = useState(false);

    const [taskDetailsModal, setTaskDetailsModal] = useState({
        isOpen: false,
        task: null,
    });
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
    });

    const [descriptionModal, setDescriptionModal] = useState({
        isOpen: false,
        entry: null,
        entryIndex: null,
    });

    // Available employees state for description modal
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);

    const currentUserName =
        localStorage.getItem("userName") || "Utente Sconosciuto";

    // Get current user with role information
    const getCurrentUser = () => {
        const token = localStorage.getItem("authToken");
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return {
                name: payload.name,
                role: payload.role,
                email: payload.email,
                department: payload.department,
                id: payload.id,
            };
        } catch (error) {
            console.error("Error parsing token:", error);
            return null;
        }
    };

    const currentUser = getCurrentUser();

    // Fetch available employees when date or time changes
    const fetchAvailableEmployees = useCallback(
        async (selectedDate, selectedTime) => {
            console.log(
                "fetchAvailableEmployees called with:",
                selectedDate,
                selectedTime
            );

            if (!selectedDate || !selectedTime) {
                setAvailableEmployees([]);
                console.log("No date/time provided, clearing employees");
                return;
            }

            setEmployeesLoading(true);
            console.log("Setting employeesLoading to true");
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
                    console.log("Fetched employees:", data.availableEmployees);
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
                console.log("Setting employeesLoading to false");
                setEmployeesLoading(false);
            }
        },
        [API]
    );

    // Handle date/time change in description modal
    const handleDescriptionModalDateTimeChange = useCallback(
        async (newDate, newTime) => {
            console.log(
                "Date/time changed in description modal:",
                newDate,
                newTime
            );
            if (newDate && newTime) {
                await fetchAvailableEmployees(newDate, newTime);
            }
        },
        [fetchAvailableEmployees]
    );

    // Authorization functions for notes
    const canModifyNote = (note) => {
        if (!currentUser || !note) return false;
        // Admins and superusers can modify any note, users can only modify their own notes
        return (
            currentUser.role === "admin" ||
            currentUser.role === "superuser" ||
            note.author === currentUser.name
        );
    };

    const canDeleteNote = (note) => {
        if (!currentUser || !note) return false;
        // Admins and superusers can delete any note, users can only delete their own notes
        return (
            currentUser.role === "admin" ||
            currentUser.role === "superuser" ||
            note.author === currentUser.name
        );
    };

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

    useEffect(() => {
        setAuthor(currentUserName);
    }, [currentUserName]);

    useEffect(() => {
        setSelectedDate(date);
        // Update current month when date changes
        const newMonth = date.substring(0, 7);
        if (newMonth !== currentMonth) {
            setCurrentMonth(newMonth);
        }
    }, [date]); // Remove currentMonth from dependencies to prevent loops
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        fetch(`${API}/api/logbook/${date}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                // Apply the same date override logic as in loadCalendarEntries
                // to ensure entries have the correct date field matching the filename
                const correctedEntries = data.map((e) => ({
                    ...e,
                    date: date,
                }));
                setEntries(correctedEntries);
                if (!showFilterResults) {
                    setFilteredEntries(correctedEntries);
                }
                // Clear filter states when loading a new date (unless actively filtering)
                if (!showFilterResults) {
                    setSearch("");
                    setFilterCategory("");
                    setFilterSubcategory("");
                    setStartDate("");
                    setEndDate("");
                }
            })
            .catch((error) => {
                console.error("Error fetching entries:", error);
            });
    }, [date, showFilterResults]); // Add showFilterResults as dependency

    // Fetch calendar entries when component mounts or when month changes
    useEffect(() => {
        const fetchCalendarEntries = async () => {
            if (!currentMonth) return;

            setCalendarEntriesLoading(true);
            try {
                const entries = await loadCalendarEntries(selectedDate);
                setCalendarEntries(entries);
            } catch (error) {
                console.error("Error fetching calendar entries:", error);
            } finally {
                setCalendarEntriesLoading(false);
            }
        };

        fetchCalendarEntries();
    }, [currentMonth]);
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (
                search ||
                filterCategory ||
                filterSubcategory ||
                startDate ||
                endDate
            ) {
                handleSearch();
            } else if (
                !search &&
                !filterCategory &&
                !filterSubcategory &&
                !startDate &&
                !endDate &&
                !showFilterResults // Add this check to prevent unnecessary updates
            ) {
                setFilteredEntries(entries);
                setShowFilterResults(false);
            }
        }, 300); // Reduce timeout for better responsiveness

        return () => clearTimeout(timeoutId);
    }, [
        search,
        filterCategory,
        filterSubcategory,
        startDate,
        endDate,
        // Remove entries from dependencies to prevent unnecessary re-runs
    ]);

    // Separate effect to handle entries changes when no filters are active
    useEffect(() => {
        if (
            !search &&
            !filterCategory &&
            !filterSubcategory &&
            !startDate &&
            !endDate &&
            !showFilterResults
        ) {
            setFilteredEntries(entries);
        }
    }, [
        entries,
        search,
        filterCategory,
        filterSubcategory,
        startDate,
        endDate,
        showFilterResults,
    ]);

    const getDateRange = (start, end) => {
        const dates = [];
        let d = new Date(start);
        while (d <= new Date(end)) {
            dates.push(new Date(d).toISOString().split("T")[0]);
            d.setDate(d.getDate() + 1);
        }
        return dates;
    };

    // Function to fetch entries for the entire month (for calendar display)
    const loadCalendarEntries = async (currentDate) => {
        const date = new Date(currentDate);
        const year = date.getFullYear();
        const month = date.getMonth();

        // Get first and last day of the month
        const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
        const lastDay = new Date(year, month + 1, 0)
            .toISOString()
            .split("T")[0];

        const dates = getDateRange(firstDay, lastDay);
        let allEntries = [];
        const token = localStorage.getItem("authToken");

        for (const d of dates) {
            try {
                const res = await fetch(`${API}/api/logbook/${d}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                allEntries.push(...data.map((e) => ({ ...e, date: d })));
            } catch (error) {
                console.error(`Error fetching entries for ${d}:`, error);
            }
        }

        return allEntries;
    };

    const loadEntriesFromRange = async () => {
        const dates = getDateRange(startDate, endDate);
        let all = [];
        const token = localStorage.getItem("authToken");
        for (const d of dates) {
            const res = await fetch(`${API}/api/logbook/${d}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            all.push(...data.map((e) => ({ ...e, date: d })));
        }
        return all;
    };
    const handleExportPDF = () => {
        try {
            const formattedDate = new Date(selectedDate).toLocaleDateString(
                "it-IT",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                }
            );

            const dailyTasks = tasks.filter(
                (task) => task.date === selectedDate
            );
            const dailyEntries = entries.filter(
                (entry) => entry.date === selectedDate
            );

            const pdfContent = document.createElement("div");
            pdfContent.style.padding = "20px";
            pdfContent.style.fontFamily = "Arial, sans-serif";
            pdfContent.style.backgroundColor = "white";

            const title = document.createElement("h2");
            title.textContent = `Task e Logbook per il ${formattedDate}`;
            title.style.marginBottom = "20px";
            title.style.color = "#333";
            title.style.borderBottom = "2px solid #d1d5db";
            title.style.paddingBottom = "10px";
            pdfContent.appendChild(title);

            if (dailyTasks.length === 0 && dailyEntries.length === 0) {
                const noContent = document.createElement("p");
                noContent.textContent = "Nessun task o entry per questa data";
                noContent.style.color = "#666";
                noContent.style.fontStyle = "italic";
                pdfContent.appendChild(noContent);
            } else {
                const tasksBySimulator = {};
                dailyTasks.forEach((task) => {
                    const simulator = task.simulator || "Nessun Simulatore";
                    if (!tasksBySimulator[simulator]) {
                        tasksBySimulator[simulator] = [];
                    }
                    tasksBySimulator[simulator].push(task);
                });
                if (dailyEntries.length > 0) {
                    dailyEntries.forEach((entry) => {
                        const entrySimulator = entry.simulator || "Others";
                        if (!tasksBySimulator[entrySimulator]) {
                            tasksBySimulator[entrySimulator] = [];
                        }
                        const logbookNoteKey = generateLogbookNoteKey(entry);
                        let entryNotes = logbookNotes[logbookNoteKey] || [];
                        if (entryNotes.length === 0) {
                            const legacyKeys1 = generateLegacyLogbookNoteKey(
                                entry,
                                entry.text
                            );
                            entryNotes =
                                (legacyKeys1.simpleKey
                                    ? logbookNotes[legacyKeys1.simpleKey]
                                    : []) ||
                                logbookNotes[legacyKeys1.textBasedKey] ||
                                [];

                            if (entryNotes.length === 0 && entry.originalText) {
                                const legacyKeys2 =
                                    generateLegacyLogbookNoteKey(
                                        entry,
                                        entry.originalText
                                    );
                                entryNotes =
                                    (legacyKeys2.simpleKey
                                        ? logbookNotes[legacyKeys2.simpleKey]
                                        : []) ||
                                    logbookNotes[legacyKeys2.textBasedKey] ||
                                    [];
                            }
                        }

                        tasksBySimulator[entrySimulator].push({
                            id: `entry-${entry.id || Math.random()}`,
                            title:
                                entry.title ||
                                entry.text.substring(0, 50) +
                                    (entry.text.length > 50 ? "..." : ""),
                            time: entry.time,
                            date: entry.date,
                            assignedTo: entry.author,
                            status: entry.category,
                            type: "logbook-entry",
                            fullText: entry.text,
                            description: entry.text,
                            category: entry.category,
                            subcategory: entry.subcategory,
                            extraDetail: entry.extraDetail,
                            duration: entry.duration,
                            simulator: entry.simulator || entrySimulator,
                            originalEntry: entry,
                            originalText: entry.text,
                            notes: entryNotes,
                        });
                    });
                }
                Object.keys(tasksBySimulator).forEach((simulator) => {
                    const simulatorHeader = document.createElement("h4");
                    simulatorHeader.textContent = simulator;
                    simulatorHeader.style.margin = "20px 0 10px 0";
                    simulatorHeader.style.color = "#1f2937";
                    simulatorHeader.style.fontSize = "18px";
                    simulatorHeader.style.fontWeight = "bold";
                    simulatorHeader.style.borderBottom = "1px solid #d1d5db";
                    simulatorHeader.style.paddingBottom = "20px";
                    pdfContent.appendChild(simulatorHeader);
                    tasksBySimulator[simulator].forEach((task, index) => {
                        if (task.type !== "logbook-entry" && !task.notes) {
                            task.notes = taskNotes[task.id] || [];
                        }

                        const taskDiv = document.createElement("div");
                        taskDiv.style.marginBottom = "15px";
                        taskDiv.style.padding = "15px";
                        if (task.type === "logbook-entry") {
                            taskDiv.style.border = "1px solid #e5e7eb";
                            taskDiv.style.borderRadius = "8px";
                            taskDiv.style.backgroundColor = "#fafafa";
                        } else {
                            taskDiv.style.border = "1px solid #e5e7eb";
                            taskDiv.style.borderRadius = "8px";
                            taskDiv.style.backgroundColor = "#f9f9f9";
                        }

                        const taskTitle = document.createElement("h5");
                        taskTitle.textContent = `${index + 1}. ${task.title}`;
                        taskTitle.style.margin = "0 0 8px 0";
                        taskTitle.style.color = "#333";
                        taskTitle.style.fontSize = "16px";
                        taskDiv.appendChild(taskTitle);
                        const taskDetails = document.createElement("p");
                        if (task.type === "logbook-entry") {
                            taskDetails.textContent = `Orario: ${
                                task.time
                            } • Autore: ${task.assignedTo} • Categoria: ${
                                task.category
                            }${task.subcategory ? "/" + task.subcategory : ""}${
                                task.extraDetail ? "/" + task.extraDetail : ""
                            } • Durata: ${task.duration || "N/A"}`;

                            if (task.fullText && task.fullText !== task.title) {
                                const fullTextP = document.createElement("p");
                                fullTextP.textContent = task.fullText;
                                fullTextP.style.margin = "8px 0 0 0";
                                fullTextP.style.color = "#444";
                                fullTextP.style.fontSize = "14px";
                                fullTextP.style.fontStyle = "italic";
                                taskDiv.appendChild(fullTextP);
                            }

                            if (task.notes && task.notes.length > 0) {
                                const notesHeader = document.createElement("p");
                                notesHeader.textContent = "Note:";
                                notesHeader.style.margin = "12px 0 4px 0";
                                notesHeader.style.color = "#333";
                                notesHeader.style.fontSize = "14px";
                                notesHeader.style.fontWeight = "bold";
                                taskDiv.appendChild(notesHeader);

                                task.notes.forEach((note, noteIndex) => {
                                    const noteP = document.createElement("p");
                                    noteP.textContent = `${noteIndex + 1}. ${
                                        note.text
                                    }`;
                                    noteP.style.margin = "4px 0 0 16px";
                                    noteP.style.color = "#555";
                                    noteP.style.fontSize = "13px";
                                    noteP.style.borderLeft =
                                        "3px solid #d1d5db";
                                    noteP.style.paddingLeft = "8px";
                                    taskDiv.appendChild(noteP);
                                });
                            }
                        } else {
                            taskDetails.textContent = `Orario: ${
                                task.time || "Nessun orario"
                            } • Assegnato a: ${
                                task.assignedTo === "Non assegnare"
                                    ? "Non assegnato"
                                    : task.assignedTo
                            } • Status: ${task.status}`;

                            if (task.notes && task.notes.length > 0) {
                                const notesHeader = document.createElement("p");
                                notesHeader.textContent = "Note:";
                                notesHeader.style.margin = "12px 0 4px 0";
                                notesHeader.style.color = "#333";
                                notesHeader.style.fontSize = "14px";
                                notesHeader.style.fontWeight = "bold";
                                taskDiv.appendChild(notesHeader);

                                task.notes.forEach((note, noteIndex) => {
                                    const noteP = document.createElement("p");
                                    noteP.textContent = `${noteIndex + 1}. ${
                                        note.text
                                    }`;
                                    noteP.style.margin = "4px 0 0 16px";
                                    noteP.style.color = "#555";
                                    noteP.style.fontSize = "13px";
                                    noteP.style.borderLeft =
                                        "3px solid #d1d5db";
                                    noteP.style.paddingLeft = "8px";
                                    taskDiv.appendChild(noteP);
                                });
                            }
                        }
                        taskDetails.style.margin = "0";
                        taskDetails.style.color = "#666";
                        taskDetails.style.fontSize = "14px";
                        taskDiv.appendChild(taskDetails);

                        pdfContent.appendChild(taskDiv);
                    });
                });
            }

            document.body.appendChild(pdfContent);
            const opt = {
                margin: 0.5,
                filename: `tasks-logbook-${formattedDate.replace(
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

    const handleExportFilteredEntries = () => {
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
            title.textContent = `Risultati Ricerca Logbook - ${currentDate}`;
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

            if (search) {
                const searchFilter = document.createElement("p");
                searchFilter.textContent = `• Testo: "${search}"`;
                searchFilter.style.margin = "4px 0";
                searchFilter.style.color = "#666";
                filterInfo.appendChild(searchFilter);
                hasFilters = true;
            }

            if (filterCategory) {
                const categoryFilter = document.createElement("p");
                categoryFilter.textContent = `• Categoria: ${filterCategory}`;
                categoryFilter.style.margin = "4px 0";
                categoryFilter.style.color = "#666";
                filterInfo.appendChild(categoryFilter);
                hasFilters = true;
            }

            if (filterSubcategory) {
                const subcategoryFilter = document.createElement("p");
                subcategoryFilter.textContent = `• Sottocategoria: ${filterSubcategory}`;
                subcategoryFilter.style.margin = "4px 0";
                subcategoryFilter.style.color = "#666";
                filterInfo.appendChild(subcategoryFilter);
                hasFilters = true;
            }

            if (startDate) {
                const startDateFilter = document.createElement("p");
                startDateFilter.textContent = `• Dal: ${new Date(
                    startDate
                ).toLocaleDateString("it-IT")}`;
                startDateFilter.style.margin = "4px 0";
                startDateFilter.style.color = "#666";
                filterInfo.appendChild(startDateFilter);
                hasFilters = true;
            }

            if (endDate) {
                const endDateFilter = document.createElement("p");
                endDateFilter.textContent = `• Al: ${new Date(
                    endDate
                ).toLocaleDateString("it-IT")}`;
                endDateFilter.style.margin = "4px 0";
                endDateFilter.style.color = "#666";
                filterInfo.appendChild(endDateFilter);
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

            // Add entry count
            const entryCount = document.createElement("p");
            entryCount.textContent = `Totale entries: ${filteredEntries.length}`;
            entryCount.style.margin = "0 0 20px 0";
            entryCount.style.color = "#333";
            entryCount.style.fontSize = "16px";
            entryCount.style.fontWeight = "bold";
            pdfContent.appendChild(entryCount);

            if (filteredEntries.length === 0) {
                const noEntries = document.createElement("p");
                noEntries.textContent =
                    "Nessuna entry trovata con i filtri applicati";
                noEntries.style.color = "#d6d6d6";
                noEntries.style.fontStyle = "italic";
                pdfContent.appendChild(noEntries);
            } else {
                // Group entries by date
                const entriesByDate = {};
                filteredEntries.forEach((entry) => {
                    const entryDate = entry.date;
                    if (!entriesByDate[entryDate]) {
                        entriesByDate[entryDate] = [];
                    }
                    entriesByDate[entryDate].push(entry);
                });

                // Sort dates
                const sortedDates = Object.keys(entriesByDate).sort();

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

                    // Add entries for this date
                    entriesByDate[date].forEach((entry, index) => {
                        const entryDiv = document.createElement("div");
                        entryDiv.style.marginBottom = "15px";
                        entryDiv.style.padding = "15px";
                        entryDiv.style.border = "1px solid #e5e7eb";
                        entryDiv.style.borderRadius = "8px";
                        entryDiv.style.backgroundColor = "#fafafa";

                        const entryTitle = document.createElement("h5");
                        entryTitle.textContent = `${index + 1}. ${
                            entry.name ||
                            entry.text.substring(0, 50) +
                                (entry.text.length > 50 ? "..." : "")
                        }`;
                        entryTitle.style.margin = "0 0 8px 0";
                        entryTitle.style.color = "#333";
                        entryTitle.style.fontSize = "16px";
                        entryDiv.appendChild(entryTitle);

                        const entryDetails = document.createElement("p");
                        entryDetails.textContent = `Simulatore: ${
                            entry.simulator || "N/A"
                        } • Orario: ${entry.time} • Autore: ${
                            entry.author
                        } • Categoria: ${entry.category}${
                            entry.subcategory ? "/" + entry.subcategory : ""
                        }${
                            entry.extraDetail ? "/" + entry.extraDetail : ""
                        } • Durata: ${entry.duration || "N/A"}`;
                        entryDetails.style.margin = "0";
                        entryDetails.style.color = "#666";
                        entryDetails.style.fontSize = "14px";
                        entryDiv.appendChild(entryDetails);

                        // Add entry text if available
                        if (entry.text) {
                            const entryText = document.createElement("p");
                            entryText.textContent = `Testo: ${entry.text}`;
                            entryText.style.margin = "8px 0 0 0";
                            entryText.style.color = "#666";
                            entryText.style.fontSize = "14px";
                            entryText.style.fontStyle = "italic";
                            entryDiv.appendChild(entryText);
                        }

                        // Add notes if available
                        const logbookNoteKey = generateLogbookNoteKey(entry);
                        let entryNotes = logbookNotes[logbookNoteKey] || [];

                        // Try legacy keys if no notes found
                        if (entryNotes.length === 0) {
                            const legacyKeys = generateLegacyLogbookNoteKey(
                                entry,
                                entry.text
                            );
                            entryNotes =
                                (legacyKeys.simpleKey
                                    ? logbookNotes[legacyKeys.simpleKey]
                                    : []) ||
                                logbookNotes[legacyKeys.textBasedKey] ||
                                [];

                            if (entryNotes.length === 0 && entry.originalText) {
                                const legacyKeys2 =
                                    generateLegacyLogbookNoteKey(
                                        entry,
                                        entry.originalText
                                    );
                                entryNotes =
                                    (legacyKeys2.simpleKey
                                        ? logbookNotes[legacyKeys2.simpleKey]
                                        : []) ||
                                    logbookNotes[legacyKeys2.textBasedKey] ||
                                    [];
                            }
                        }

                        if (entryNotes && entryNotes.length > 0) {
                            const notesHeader = document.createElement("p");
                            notesHeader.textContent = "Note:";
                            notesHeader.style.margin = "8px 0 4px 0";
                            notesHeader.style.color = "#333";
                            notesHeader.style.fontSize = "14px";
                            notesHeader.style.fontWeight = "bold";
                            entryDiv.appendChild(notesHeader);

                            entryNotes.forEach((note) => {
                                const noteDiv = document.createElement("div");
                                noteDiv.style.margin = "4px 0 4px 16px";
                                noteDiv.style.padding = "8px";
                                noteDiv.style.backgroundColor = "#f3f4f6";
                                noteDiv.style.borderLeft = "3px solid #d1d5db";
                                noteDiv.style.borderRadius = "4px";

                                const noteText = document.createElement("p");
                                noteText.textContent = note.text;
                                noteText.style.margin = "0";
                                noteText.style.color = "#333";
                                noteText.style.fontSize = "13px";
                                noteDiv.appendChild(noteText);

                                entryDiv.appendChild(noteDiv);
                            });
                        }

                        pdfContent.appendChild(entryDiv);
                    });
                });
            }

            // Temporarily add to body
            document.body.appendChild(pdfContent);

            const opt = {
                margin: 0.5,
                filename: `ricerca-logbook-${currentDate.replace(
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
    const applyFilters = (
        entriesToFilter,
        searchTerm,
        categoryFilter,
        subcategoryFilter
    ) => {
        let filtered = [...entriesToFilter];

        console.log("=== APPLY FILTERS DEBUG ===");
        console.log("Input entries:", entriesToFilter);
        console.log("Search term:", searchTerm);

        if (searchTerm && searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            console.log("Searching for:", searchLower);

            filtered = filtered.filter((entry) => {
                // For logbook entries
                const textMatch =
                    entry.text &&
                    entry.text.toLowerCase().includes(searchLower);
                const titleMatch =
                    entry.title &&
                    entry.title.toLowerCase().includes(searchLower);
                const authorMatch =
                    entry.author &&
                    entry.author.toLowerCase().includes(searchLower);
                const categoryMatch =
                    entry.category &&
                    entry.category.toLowerCase().includes(searchLower);
                const subcategoryMatch =
                    entry.subcategory &&
                    entry.subcategory.toLowerCase().includes(searchLower);
                const extraDetailMatch =
                    entry.extraDetail &&
                    entry.extraDetail.toLowerCase().includes(searchLower);

                // For tasks (additional fields to search)
                const descriptionMatch =
                    entry.description &&
                    entry.description.toLowerCase().includes(searchLower);
                const simulatorMatch =
                    entry.simulator &&
                    entry.simulator.toLowerCase().includes(searchLower);
                const assignedToMatch =
                    entry.assignedTo &&
                    entry.assignedTo.toLowerCase().includes(searchLower);
                const statusMatch =
                    entry.status &&
                    entry.status.toLowerCase().includes(searchLower);

                const matches =
                    textMatch ||
                    titleMatch ||
                    authorMatch ||
                    categoryMatch ||
                    subcategoryMatch ||
                    extraDetailMatch ||
                    descriptionMatch ||
                    simulatorMatch ||
                    assignedToMatch ||
                    statusMatch;

                if (matches) {
                    console.log("MATCH found in entry:", entry);
                    console.log(
                        "Text match:",
                        textMatch,
                        "- searching in:",
                        entry.text
                    );
                    console.log(
                        "Title match:",
                        titleMatch,
                        "- searching in:",
                        entry.title
                    );
                    console.log(
                        "Author match:",
                        authorMatch,
                        "- searching in:",
                        entry.author
                    );
                    console.log(
                        "Description match:",
                        descriptionMatch,
                        "- searching in:",
                        entry.description
                    );
                    console.log(
                        "Simulator match:",
                        simulatorMatch,
                        "- searching in:",
                        entry.simulator
                    );
                    console.log(
                        "AssignedTo match:",
                        assignedToMatch,
                        "- searching in:",
                        entry.assignedTo
                    );
                }

                return matches;
            });
            console.log("After text filter:", filtered);
        }

        if (categoryFilter) {
            filtered = filtered.filter(
                (entry) => entry.category === categoryFilter
            );
        }

        if (subcategoryFilter) {
            filtered = filtered.filter(
                (entry) =>
                    entry.subcategory === subcategoryFilter ||
                    entry.extraDetail === subcategoryFilter
            );
        }

        console.log("Final filtered results:", filtered);
        console.log("=== APPLY FILTERS DEBUG END ===");

        return filtered;
    };
    const handleSearch = async () => {
        setIsSearching(true);
        setShowFilterResults(true);
        let filtered = [];

        console.log("=== DEBUG: Search started ===");
        console.log("Search term:", search);
        console.log("Filter category:", filterCategory);
        console.log("Filter subcategory:", filterSubcategory);
        console.log("Start date:", startDate);
        console.log("End date:", endDate);

        if (startDate && endDate) {
            const allEntries = await loadEntriesFromRange();
            console.log("Loaded entries from range:", allEntries);

            // Add tasks to the search results
            const filteredTasks = tasks.filter((task) => {
                if (!task.date) return false;
                const taskDate = new Date(task.date)
                    .toISOString()
                    .split("T")[0];
                return taskDate >= startDate && taskDate <= endDate;
            });

            // Mark tasks with a type to distinguish them from logbook entries
            const tasksAsEntries = filteredTasks.map((task) => ({
                ...task,
                type: "task",
                text: task.description || task.title, // Map description to text for search compatibility
                author: task.assignedTo || "Unknown", // Map assignedTo to author for search compatibility
            }));

            const combinedData = [...allEntries, ...tasksAsEntries];
            console.log("Combined entries and tasks:", combinedData);

            filtered = applyFilters(
                combinedData,
                search,
                filterCategory,
                filterSubcategory
            );
        } else if (search || filterCategory || filterSubcategory) {
            const today = new Date();
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);

            const searchStartDate = threeMonthsAgo.toISOString().split("T")[0];
            const searchEndDate = today.toISOString().split("T")[0];

            console.log("Searching from", searchStartDate, "to", searchEndDate);

            const dates = getDateRange(searchStartDate, searchEndDate);
            let allEntries = [];
            const token = localStorage.getItem("authToken");

            for (const d of dates) {
                try {
                    const res = await fetch(`${API}/api/logbook/${d}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        allEntries.push(
                            ...data.map((e) => ({ ...e, date: d }))
                        );
                    }
                } catch (error) {
                    console.log(`No data for ${d}`);
                }
            }

            const todayDate = new Date().toISOString().split("T")[0];
            const currentDateEntries = entries.filter(
                (entry) => entry.date === todayDate || !entry.date
            );

            currentDateEntries.forEach((entry) => {
                const entryWithDate = { ...entry, date: entry.date || date };
                const exists = allEntries.find(
                    (e) =>
                        e.text === entry.text &&
                        e.time === entry.time &&
                        e.author === entry.author &&
                        e.date === entryWithDate.date
                );
                if (!exists) {
                    allEntries.push(entryWithDate);
                }
            });

            // Add tasks within the search date range
            const filteredTasks = tasks.filter((task) => {
                if (!task.date) return false;
                const taskDate = new Date(task.date)
                    .toISOString()
                    .split("T")[0];
                return taskDate >= searchStartDate && taskDate <= searchEndDate;
            });

            // Mark tasks with a type to distinguish them from logbook entries
            const tasksAsEntries = filteredTasks.map((task) => ({
                ...task,
                type: "task",
                text: task.description || task.title, // Map description to text for search compatibility
                author: task.assignedTo || "Unknown", // Map assignedTo to author for search compatibility
            }));

            const combinedData = [...allEntries, ...tasksAsEntries];
            console.log("All loaded entries and tasks:", combinedData);
            console.log("Sample entry structure:", combinedData[0]);

            filtered = applyFilters(
                combinedData,
                search,
                filterCategory,
                filterSubcategory
            );
        } else {
            filtered = [...entries];
            setShowFilterResults(false);
        }

        console.log("Filtered results:", filtered);
        console.log("=== DEBUG: Search completed ===");

        setFilteredEntries(filtered);
        setIsSearching(false);
    };
    const handleClearFilters = () => {
        setSearch("");
        setFilterCategory("");
        setFilterSubcategory("");
        setStartDate("");
        setEndDate("");
        setIsSearching(false);
        setShowFilterResults(false);
        setFilteredEntries(entries);
    };
    const saveEntries = async (newEntries, isNewEntry = false) => {
        const token = localStorage.getItem("authToken");
        await fetch(`${API}/api/logbook/${date}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newEntries),
        });
        // Apply the same date override logic as in other places
        // to ensure entries have the correct date field matching the filename
        const correctedEntries = newEntries.map((e) => ({ ...e, date: date }));
        setEntries(correctedEntries);
        if (!showFilterResults) {
            setFilteredEntries(correctedEntries);
        }
        resetForm();

        // Refresh calendar entries after saving
        try {
            // Only refresh calendar entries if we're viewing the same month as the saved entry
            const savedMonth = (formDate || date).substring(0, 7);
            const currentDisplayMonth = selectedDate.substring(0, 7);

            if (savedMonth === currentDisplayMonth) {
                // We're viewing the same month where the entry was saved, refresh immediately
                const updatedCalendarEntries = await loadCalendarEntries(
                    selectedDate
                );
                setCalendarEntries(updatedCalendarEntries);
            }
            // If different month, the useEffect will handle it when user navigates there
        } catch (error) {
            console.error("Error refreshing calendar entries:", error);
        }

        // Show success popup only for new entries
        if (isNewEntry) {
            showModal(
                "Successo",
                "Nuova entry del logbook aggiunta con successo!",
                "success"
            );
        }
    };
    const resetForm = () => {
        setName("");
        setText("");
        setAuthor(currentUserName);
        setCategory("");
        setSubcategory("");
        setExtraDetail("");
        setSimulator("");
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
            simulator: simulator || "Others",
            date: formDate,
            time: formTime,
            duration,
            title:
                name || text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        };

        const newEntries = [...entries];
        const isNewEntry = editIndex === null;

        if (editIndex !== null) {
            newEntries[editIndex] = {
                ...entry,
                title:
                    name ||
                    text.substring(0, 50) + (text.length > 50 ? "..." : ""),
            };
        } else {
            newEntries.push(entry);
        }

        await saveEntries(newEntries, isNewEntry);
    };

    const handleDelete = async (index) => {
        if (!window.confirm("Vuoi eliminare questa entry?")) return;
        const newEntries = entries.filter((_, i) => i !== index);
        await saveEntries(newEntries);
    };
    const handleEdit = (index) => {
        const entry = entries[index];
        setName(entry.title || "");
        setText(entry.text);
        setAuthor(entry.author);
        setCategory(entry.category);
        setSubcategory(entry.subcategory);
        setExtraDetail(entry.extraDetail || "");
        setSimulator(entry.simulator || "");
        setFormDate(entry.date);
        setFormTime(entry.time);
        setDuration(entry.duration || "");
        setEditIndex(index);
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

    const openDescriptionModal = (task) => {
        let entryIndex = -1;

        console.log("Opening description modal for task:", task);
        console.log("Current entries:", entries);

        if (task.originalEntry) {
            console.log(
                "Using originalEntry to find index:",
                task.originalEntry
            );
            entryIndex = entries.findIndex(
                (entry) =>
                    entry.text === task.originalEntry.text &&
                    entry.date === task.originalEntry.date &&
                    entry.time === task.originalEntry.time &&
                    entry.author === task.originalEntry.author
            );
        } else {
            console.log("Using fallback method to find index");
            entryIndex = entries.findIndex(
                (entry) =>
                    entry.text === task.fullText &&
                    entry.date === task.date &&
                    entry.time === task.time &&
                    entry.author === task.assignedTo
            );
        }

        console.log("Found entryIndex:", entryIndex);

        if (entryIndex === -1) {
            console.log(
                "Entry not found with strict matching, trying flexible matching"
            );
            entryIndex = entries.findIndex((entry) => {
                const textMatch = task.originalEntry
                    ? entry.text === task.originalEntry.text
                    : entry.text === task.fullText ||
                      entry.text === task.description;
                const dateMatch = task.originalEntry
                    ? entry.date === task.originalEntry.date
                    : entry.date === task.date;
                const timeMatch = task.originalEntry
                    ? entry.time === task.originalEntry.time
                    : entry.time === task.time;

                console.log("Checking entry:", entry);
                console.log(
                    "Text match:",
                    textMatch,
                    "Date match:",
                    dateMatch,
                    "Time match:",
                    timeMatch
                );

                return textMatch && dateMatch && timeMatch;
            });
            console.log("Flexible matching result:", entryIndex);
        }

        setDescriptionModal({
            isOpen: true,
            entry: task,
            entryIndex: entryIndex,
        });

        // Fetch available employees for the task's date and time
        if (task.date && task.time) {
            console.log(
                "Fetching available employees for:",
                task.date,
                task.time
            );
            fetchAvailableEmployees(task.date, task.time);
        } else {
            // If no date/time, clear available employees and reset loading state
            setAvailableEmployees([]);
            setEmployeesLoading(false);
        }
    };

    const closeDescriptionModal = () => {
        setDescriptionModal({
            isOpen: false,
            entry: null,
            entryIndex: null,
        });
        // Reset available employees and loading state when closing modal
        setAvailableEmployees([]);
        setEmployeesLoading(false);
    };
    const handleSaveDescriptionForLogbook = async (updatedData) => {
        const { description, simulator, employee, date, time } = updatedData;
        const { entryIndex } = descriptionModal;

        console.log("Saving description with entryIndex:", entryIndex);
        console.log("Current entries state:", entries);
        console.log("Description modal entry:", descriptionModal.entry);

        if (entryIndex === -1) {
            const task = descriptionModal.entry;
            if (task && task.originalEntry) {
                console.log("Trying to save using originalEntry data");
                const foundIndex = entries.findIndex(
                    (entry) =>
                        entry.text === task.originalEntry.text &&
                        entry.date === task.originalEntry.date &&
                        entry.time === task.originalEntry.time &&
                        entry.author === task.originalEntry.author
                );

                if (foundIndex !== -1) {
                    console.log("Found entry at index:", foundIndex);
                    const updatedEntries = [...entries];
                    const originalEntry = updatedEntries[foundIndex];

                    updatedEntries[foundIndex] = {
                        ...originalEntry,
                        text: description,
                        simulator: simulator || "Others",
                        author: employee || originalEntry.author,
                        date: date || originalEntry.date,
                        time: time || originalEntry.time,
                        title:
                            originalEntry.title ||
                            originalEntry.text.substring(0, 50) +
                                (originalEntry.text.length > 50 ? "..." : ""),
                    };

                    try {
                        await saveEntries(updatedEntries);
                        closeDescriptionModal();
                        showModal(
                            "Successo",
                            "Entry aggiornata con successo!",
                            "success"
                        );
                        return;
                    } catch (error) {
                        console.error("Error saving entry:", error);
                        showModal(
                            "Errore",
                            "Errore durante l'aggiornamento dell'entry",
                            "error"
                        );
                        return;
                    }
                } else {
                    console.log(
                        "Could not find entry even with originalEntry data"
                    );
                }
            }

            showModal(
                "Errore",
                "Impossibile trovare l'entry da modificare",
                "error"
            );
            return;
        }

        try {
            const updatedEntries = [...entries];
            const originalEntry = updatedEntries[entryIndex];

            updatedEntries[entryIndex] = {
                ...originalEntry,
                text: description,
                simulator: simulator || "Others",
                author: employee || originalEntry.author,
                date: date || originalEntry.date,
                time: time || originalEntry.time,
                title:
                    originalEntry.title ||
                    originalEntry.text.substring(0, 50) +
                        (originalEntry.text.length > 50 ? "..." : ""),
            };

            await saveEntries(updatedEntries);

            if (
                taskDetailsModal.isOpen &&
                taskDetailsModal.task &&
                taskDetailsModal.task.type === "logbook-entry"
            ) {
                const updatedTask = {
                    ...taskDetailsModal.task,
                    description: description,
                    fullText: description,
                    simulator: simulator || "Others",
                    title: taskDetailsModal.task.title,
                };
                setTaskDetailsModal({
                    ...taskDetailsModal,
                    task: updatedTask,
                });
            }

            closeDescriptionModal();
            showModal("Successo", "Entry aggiornata con successo!", "success");
        } catch (error) {
            console.error("Error updating logbook entry:", error);
            showModal(
                "Errore",
                "Errore durante l'aggiornamento dell'entry",
                "error"
            );
        }
    };
    const canToggleTask = (task) => false;
    const canDeleteTasks = (task) => task && task.type === "logbook-entry";
    const canEditDescription = (task) => task.type === "logbook-entry";
    const handleDeleteTask = async (taskOrId) => {
        let task = taskOrId;

        if (typeof taskOrId === "string" || typeof taskOrId === "number") {
            task = taskDetailsModal.task;
        }

        if (!task || task.type !== "logbook-entry") {
            showModal(
                "Errore",
                "Impossibile eliminare questo elemento",
                "error"
            );
            return;
        }

        let entryIndex = -1;

        if (task.originalEntry) {
            entryIndex = entries.findIndex(
                (entry) =>
                    entry.text === task.originalEntry.text &&
                    entry.date === task.originalEntry.date &&
                    entry.time === task.originalEntry.time &&
                    entry.author === task.originalEntry.author
            );
        } else {
            entryIndex = entries.findIndex(
                (entry) =>
                    entry.text === task.fullText &&
                    entry.date === task.date &&
                    entry.time === task.time &&
                    entry.author === task.assignedTo
            );
        }

        if (entryIndex === -1) {
            showModal(
                "Errore",
                "Impossibile trovare l'entry da eliminare",
                "error"
            );
            return;
        }
        showModal(
            "Conferma Eliminazione",
            "Sei sicuro di voler eliminare questa entry?",
            "confirm",
            async () => {
                try {
                    const newEntries = entries.filter(
                        (_, i) => i !== entryIndex
                    );
                    await saveEntries(newEntries);

                    closeTaskDetails();

                    showModal(
                        "Successo",
                        "Entry eliminata con successo!",
                        "success"
                    );
                } catch (error) {
                    console.error("Error deleting entry:", error);
                    showModal(
                        "Errore",
                        "Errore durante l'eliminazione dell'entry",
                        "error"
                    );
                }
            }
        );
    };

    const handleSaveNote = async (taskId, noteText) => {
        try {
            const currentTask = taskDetailsModal.task;
            if (currentTask && currentTask.type === "logbook-entry") {
                console.log("Saving note for logbook entry:", currentTask);

                const originalEntry = currentTask.originalEntry || {
                    id:
                        currentTask.id && currentTask.id.startsWith("entry-")
                            ? currentTask.id.replace("entry-", "")
                            : null,
                    date: currentTask.date,
                    time: currentTask.time,
                    author: currentTask.assignedTo,
                    title: currentTask.title,
                    simulator: currentTask.simulator,
                    category: currentTask.category,
                    text: currentTask.originalText || currentTask.description,
                };

                const logbookNoteKey = generateLogbookNoteKey(originalEntry);

                let existingNotes = logbookNotes[logbookNoteKey] || [];
                if (existingNotes.length === 0 && currentTask.originalEntry) {
                    const legacyKeys1 = generateLegacyLogbookNoteKey(
                        currentTask.originalEntry,
                        currentTask.originalEntry.text
                    );
                    const legacyNotes1 =
                        (legacyKeys1.simpleKey
                            ? logbookNotes[legacyKeys1.simpleKey]
                            : []) ||
                        logbookNotes[legacyKeys1.textBasedKey] ||
                        [];

                    if (legacyNotes1.length > 0) {
                        existingNotes = legacyNotes1;
                        console.log(
                            `Migrating notes from legacy keys to new key: ${logbookNoteKey}`
                        );
                    } else {
                        const legacyKeys2 = generateLegacyLogbookNoteKey(
                            currentTask.originalEntry,
                            currentTask.description
                        );
                        const legacyNotes2 =
                            (legacyKeys2.simpleKey
                                ? logbookNotes[legacyKeys2.simpleKey]
                                : []) ||
                            logbookNotes[legacyKeys2.textBasedKey] ||
                            [];
                        if (legacyNotes2.length > 0) {
                            existingNotes = legacyNotes2;
                            console.log(
                                `Migrating notes from legacy keys to new key: ${logbookNoteKey}`
                            );
                        }
                    }
                }
                await notesService.addLogbookNote(
                    logbookNoteKey,
                    noteText,
                    currentUserName
                );

                const updatedLogbookNotes = {
                    ...logbookNotes,
                    [logbookNoteKey]: [
                        ...existingNotes,
                        {
                            text: noteText,
                            author: currentUserName,
                            timestamp: new Date().toISOString(),
                        },
                    ],
                };
                setLogbookNotes(updatedLogbookNotes);

                const updatedTask = {
                    ...currentTask,
                    notes: updatedLogbookNotes[logbookNoteKey],
                };

                setTaskDetailsModal({
                    ...taskDetailsModal,
                    task: updatedTask,
                });

                console.log("Nota aggiunta alla logbook entry con successo");
                showModal("Successo", "Nota aggiunta con successo!", "success");
                return;
            } else {
                await notesService.addTaskNote(
                    taskId,
                    noteText,
                    currentUserName
                );

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

                if (
                    taskDetailsModal.task &&
                    taskDetailsModal.task.id === taskId
                ) {
                    const updatedTask = updatedTasks.find(
                        (t) => t.id === taskId
                    );
                    setTaskDetailsModal({
                        ...taskDetailsModal,
                        task: updatedTask,
                    });
                }
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

    const handleEditNote = async (taskId, noteIndex, newText) => {
        try {
            const currentTask = taskDetailsModal.task;
            if (currentTask && currentTask.type === "logbook-entry") {
                const originalEntry = currentTask.originalEntry || {
                    id:
                        currentTask.id && currentTask.id.startsWith("entry-")
                            ? currentTask.id.replace("entry-", "")
                            : null,
                    date: currentTask.date,
                    time: currentTask.time,
                    author: currentTask.assignedTo,
                    title: currentTask.title,
                    simulator: currentTask.simulator,
                    category: currentTask.category,
                    text: currentTask.originalText || currentTask.description,
                };

                const logbookNoteKey = generateLogbookNoteKey(originalEntry);

                await notesService.updateNote(
                    "logbook",
                    encodeURIComponent(logbookNoteKey),
                    noteIndex,
                    newText
                );

                const updatedNotes = [...(logbookNotes[logbookNoteKey] || [])];
                updatedNotes[noteIndex] = {
                    ...updatedNotes[noteIndex],
                    text: newText,
                };

                const updatedLogbookNotes = {
                    ...logbookNotes,
                    [logbookNoteKey]: updatedNotes,
                };
                setLogbookNotes(updatedLogbookNotes);

                const updatedTask = {
                    ...currentTask,
                    notes: updatedNotes,
                };

                setTaskDetailsModal({
                    ...taskDetailsModal,
                    task: updatedTask,
                });

                showModal(
                    "Successo",
                    "Nota modificata con successo!",
                    "success"
                );
            } else {
                await notesService.updateNote(
                    "tasks",
                    taskId,
                    noteIndex,
                    newText
                );

                const updatedNotes = [...(taskNotes[taskId] || [])];
                updatedNotes[noteIndex] = {
                    ...updatedNotes[noteIndex],
                    text: newText,
                };

                const updatedTaskNotes = {
                    ...taskNotes,
                    [taskId]: updatedNotes,
                };
                setTaskNotes(updatedTaskNotes);

                const updatedTasks = tasks.map((task) => {
                    if (task.id === taskId) {
                        return {
                            ...task,
                            notes: updatedNotes,
                        };
                    }
                    return task;
                });
                setTasks(updatedTasks);

                if (
                    taskDetailsModal.task &&
                    taskDetailsModal.task.id === taskId
                ) {
                    const updatedTask = updatedTasks.find(
                        (t) => t.id === taskId
                    );
                    setTaskDetailsModal({
                        ...taskDetailsModal,
                        task: updatedTask,
                    });
                }

                showModal(
                    "Successo",
                    "Nota modificata con successo!",
                    "success"
                );
            }
        } catch (error) {
            console.error("Errore nel modificare la nota:", error);
            showModal(
                "Errore",
                "Errore nel modificare la nota: " + error.message,
                "error"
            );
        }
    };

    const handleDeleteNote = async (taskId, noteIndex) => {
        try {
            const currentTask = taskDetailsModal.task;
            if (currentTask && currentTask.type === "logbook-entry") {
                const originalEntry = currentTask.originalEntry || {
                    id:
                        currentTask.id && currentTask.id.startsWith("entry-")
                            ? currentTask.id.replace("entry-", "")
                            : null,
                    date: currentTask.date,
                    time: currentTask.time,
                    author: currentTask.assignedTo,
                    title: currentTask.title,
                    simulator: currentTask.simulator,
                    category: currentTask.category,
                    text: currentTask.originalText || currentTask.description,
                };

                const logbookNoteKey = generateLogbookNoteKey(originalEntry);

                await notesService.deleteNote(
                    "logbook",
                    encodeURIComponent(logbookNoteKey),
                    noteIndex
                );

                const updatedNotes = [...(logbookNotes[logbookNoteKey] || [])];
                updatedNotes.splice(noteIndex, 1);

                const updatedLogbookNotes = {
                    ...logbookNotes,
                    [logbookNoteKey]: updatedNotes,
                };
                setLogbookNotes(updatedLogbookNotes);

                const updatedTask = {
                    ...currentTask,
                    notes: updatedNotes,
                };

                setTaskDetailsModal({
                    ...taskDetailsModal,
                    task: updatedTask,
                });
            } else {
                await notesService.deleteNote("tasks", taskId, noteIndex);

                const updatedNotes = [...(taskNotes[taskId] || [])];
                updatedNotes.splice(noteIndex, 1);

                const updatedTaskNotes = {
                    ...taskNotes,
                    [taskId]: updatedNotes,
                };
                setTaskNotes(updatedTaskNotes);

                const updatedTasks = tasks.map((task) => {
                    if (task.id === taskId) {
                        return {
                            ...task,
                            notes: updatedNotes,
                        };
                    }
                    return task;
                });
                setTasks(updatedTasks);

                if (
                    taskDetailsModal.task &&
                    taskDetailsModal.task.id === taskId
                ) {
                    const updatedTask = updatedTasks.find(
                        (t) => t.id === taskId
                    );
                    setTaskDetailsModal({
                        ...taskDetailsModal,
                        task: updatedTask,
                    });
                }
            }
        } catch (error) {
            console.error("Errore nell'eliminare la nota:", error);
            showModal(
                "Errore",
                "Errore nell'eliminare la nota: " + error.message,
                "error"
            );
        }
    };

    const handleChangeDay = (offset) => {
        const d = new Date(date);
        d.setDate(d.getDate() + offset);
        const newDate = d.toISOString().split("T")[0];
        setDate(newDate);
        setSelectedDate(newDate);
        // Update current month if needed
        const newMonth = newDate.substring(0, 7);
        if (newMonth !== currentMonth) {
            setCurrentMonth(newMonth);
        }
    };

    const handleExport = () => {
        const lines = filteredEntries.map((e, i) => {
            return `#${i + 1}\n${e.date} ${e.time} (${e.duration || "?"}) - ${
                e.author
            }\n${e.category}${e.subcategory ? "/" + e.subcategory : ""}${
                e.extraDetail ? "/" + e.extraDetail : ""
            }\n\n${e.text}\n---\n`;
        });

        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `logbook-ricerca.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getCategoryBorderColor = (category) => {
        switch (category) {
            case "routine task":
                return "#3b82f620";
            case "troubleshooting":
                return "#dc262620";
            case "others":
                return "#f6ad1020";
            default:
                return "#e5e7eb";
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
            default:
                return "#e5e7eb";
        }
    };

    const [taskNotes, setTaskNotes] = useState({});
    const [logbookNotes, setLogbookNotes] = useState({});
    const [notesLoaded, setNotesLoaded] = useState(false);
    useEffect(() => {
        const loadNotesAndMigrate = async () => {
            try {
                await migrateNotesFromLocalStorage();

                const [taskNotesData, logbookNotesData] = await Promise.all([
                    notesService.getTaskNotes(),
                    notesService.getLogbookNotes(),
                ]);

                setTaskNotes(taskNotesData);
                setLogbookNotes(logbookNotesData);
                setNotesLoaded(true);
            } catch (error) {
                console.error("Error loading notes:", error);
                setTaskNotes({});
                setLogbookNotes({});
                setNotesLoaded(true);
                console.warn(
                    "Backend notes API not available. Notes will only work when backend is running."
                );
            }
        };

        loadNotesAndMigrate();
    }, []);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        fetch(`${API}/api/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
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
    }, [taskNotes, notesLoaded]);

    const getCardBorderColor = (item) => {
        if (item.type === "logbook-entry") {
            return getCategoryBorderColor(item.category);
        } else {
            return getBorderColor(item.status);
        }
    };
    const renderTaskCard = (task) => (
        <div
            key={task.id}
            className="task-card-small p-2 rounded-xl border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            style={{
                border:
                    task.type === "logbook-entry"
                        ? `1px solid ${getCategoryBorderColor(task.category)}`
                        : `1px solid ${getBorderColor(task.status)}`,
            }}
            onClick={() => openTaskDetails(task)}
        >
            <div className="task-info h-full flex flex-col justify-between">
                <p className="text-gray-900 font-bold text-xs leading-tight mb-1 overflow-hidden">
                    {task.title.length > 20
                        ? task.title.substring(0, 20) + "..."
                        : task.title}
                </p>{" "}
                <div className="task-details text-xs text-gray-500 space-y-2">
                    <div className="text-xs">{task.time}</div>
                    <div className="flex items-center justify-between">
                        {" "}
                        <div className="flex flex-col gap-1">
                            <span
                                className={
                                    task.type === "logbook-entry"
                                        ? "px-2 py-1 rounded text-xs bg-blue-100 text-blue-600"
                                        : `px-2 py-1 rounded text-xs ${
                                              task.status === "completato"
                                                  ? "bg-green-100 text-green-600"
                                                  : task.status === "in corso"
                                                  ? "bg-yellow-100 text-yellow-600"
                                                  : task.status ===
                                                    "non completato"
                                                  ? "bg-red-100 text-red-600"
                                                  : "bg-gray-100 text-gray-600"
                                          }`
                                }
                                style={{ fontSize: "10px" }}
                            >
                                {task.type === "logbook-entry"
                                    ? "logbook"
                                    : task.status}
                            </span>
                            <span className="text-xs text-gray-500 px-2">
                                {task.assignedTo === "Non assegnare"
                                    ? "Non assegnato"
                                    : task.assignedTo}
                            </span>
                        </div>
                        {task.notes && task.notes.length > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="12"
                                    height="12"
                                    fill="currentColor"
                                >
                                    <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H6L10 22L14 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H13.2L10 19.2L6.8 16H4V4H20V16Z" />
                                </svg>
                                <span className="text-xs">
                                    {task.notes.length}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Handle calendar day click
    const handleCalendarDayClick = (dateStr) => {
        setSelectedDate(dateStr);
        setDate(dateStr);
        // Update current month if needed
        const newMonth = dateStr.substring(0, 7);
        if (newMonth !== currentMonth) {
            setCurrentMonth(newMonth);
        }
        // Ensure filter results are cleared when clicking on a day
        setShowFilterResults(false);
        setShowCalendar(false);
        setShowTable(true);
    };

    // Handle back to calendar
    const handleBackToCalendar = () => {
        setShowCalendar(true);
        setShowTable(false);
    };

    // Handle month change from calendar navigation
    const handleMonthChange = async (newDate) => {
        setSelectedDate(newDate);
        const newMonth = newDate.substring(0, 7);
        if (newMonth !== currentMonth) {
            setCurrentMonth(newMonth);
            // The useEffect will handle the calendar entries refresh automatically
        }
    };

    return (
        <>
            <div className="flex gap-4 flex-col lg:flex-row justify-between max-w-full p-4">
                <div className="flex flex-col w-full min-w-0 justify-start gap-8">
                    {/* Conditional rendering: Calendar or Logbook Table */}
                    {showCalendar ? (
                        calendarEntriesLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="text-gray-500">
                                    Caricamento calendario...
                                </div>
                            </div>
                        ) : (
                            <Calendar
                                onDayClick={handleCalendarDayClick}
                                onMonthChange={handleMonthChange}
                                entriesData={calendarEntries}
                                tasksData={tasks}
                                currentDate={selectedDate}
                                type="logbook"
                            />
                        )
                    ) : (
                        <>
                            <div className="date-selector flex items-center justify-start gap-8 flex-wrap mb-4">
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
                                        const newDate = e.target.value;
                                        setSelectedDate(newDate);
                                        setDate(newDate);
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
                                className="entries flex flex-col w-full border p-4 rounded-xl bg-white my-2 overflow-y-auto max-h-[80vh] flex-1 max-w-full"
                                style={{ boxShadow: "4px 4px 10px #00000010" }}
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
                                            d="M20.1069 20.1088C18.7156 21.5001 16.4765 21.5001 11.9981 21.5001C7.51976 21.5001 5.28059 21.5001 3.88935 20.1088C2.49811 18.7176 2.49811 16.4784 2.49811 12.0001C2.49811 7.52172 2.49811 5.28255 3.88935 3.89131C5.28059 2.50006 7.51976 2.50006 11.9981 2.50006C16.4764 2.50006 18.7156 2.50006 20.1069 3.8913C21.4981 5.28255 21.4981 7.52172 21.4981 12.0001C21.4981 16.4784 21.4981 18.7176 20.1069 20.1088Z"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                        <path
                                            d="M8.99811 21.5001L8.99811 2.50006"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                        />
                                        <path
                                            d="M21.4981 8.00006L2.49811 8.00006"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                        />
                                        <path
                                            d="M21.4981 16.0001H2.49811"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                        />
                                    </svg>{" "}
                                    <p className="text-gray-600">
                                        {showFilterResults ? (
                                            <>
                                                Risultato{" "}
                                                <span className="span ml-1">
                                                    {filteredEntries.length}{" "}
                                                    entr
                                                    {filteredEntries.length ===
                                                    1
                                                        ? "y"
                                                        : "ies"}
                                                </span>
                                            </>
                                        ) : (
                                            <>Tabella delle task</>
                                        )}
                                    </p>
                                </div>
                                {!showFilterResults && (
                                    <>
                                        <div className="separator w-full border-b border-gray-200"></div>
                                        <div className="flex flex-row items-center gap-16 mb-2"></div>
                                    </>
                                )}
                                {showFilterResults ? (
                                    <>
                                        <div className="separator w-full border-b border-gray-200 mb-4"></div>
                                        {/* Show filtered results */}
                                        {filteredEntries.length === 0 ? (
                                            <div className="text-center py-4 text-gray-500">
                                                Nessuna entry trovata con i
                                                filtri applicati
                                            </div>
                                        ) : (
                                            filteredEntries.map(
                                                (entry, index) => (
                                                    <div
                                                        key={index}
                                                        className="display-entry flex items-center gap-4 justify-between dashboard-content p-3 rounded mt-3 bg-gray-100"
                                                        style={{
                                                            border: `2px solid ${getCategoryBorderColor(
                                                                entry.category
                                                            )}`,
                                                        }}
                                                    >
                                                        {" "}
                                                        <div className="entry-info">
                                                            <p className="text-gray-600 max-w-md font-bold text-sm">
                                                                {entry.title ||
                                                                    entry.text}
                                                            </p>{" "}
                                                            <div className="text-xs text-gray-500 capitalize">
                                                                {entry.date} •{" "}
                                                                {entry.time} •{" "}
                                                                {entry.duration ||
                                                                    "Nessuna durata"}{" "}
                                                                •{" "}
                                                                {entry.author ||
                                                                    entry.assignedTo}{" "}
                                                                {entry.assignedTo &&
                                                                    entry.status && (
                                                                        <>
                                                                            •{" "}
                                                                            {
                                                                                entry.status
                                                                            }{" "}
                                                                        </>
                                                                    )}
                                                                •{" "}
                                                                {entry.category ||
                                                                    "Nessuna categoria"}
                                                                {(entry.subcategory ||
                                                                    entry.extraDetail) &&
                                                                    ` / ${
                                                                        entry.subcategory ||
                                                                        entry.extraDetail
                                                                    }`}
                                                                {!entry.subcategory &&
                                                                    !entry.extraDetail &&
                                                                    " / Nessuna sotto-categoria"}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            {" "}
                                                            <button
                                                                onClick={() => {
                                                                    const taskEntry =
                                                                        entry.type ===
                                                                        "task"
                                                                            ? {
                                                                                  // For actual tasks, preserve the original structure
                                                                                  id: entry.id,
                                                                                  title: entry.title,
                                                                                  description:
                                                                                      entry.description,
                                                                                  assignedTo:
                                                                                      entry.assignedTo,
                                                                                  date: entry.date,
                                                                                  time: entry.time,
                                                                                  status: entry.status, // Preserve original task status
                                                                                  category:
                                                                                      entry.category,
                                                                                  subcategory:
                                                                                      entry.subcategory,
                                                                                  extraDetail:
                                                                                      entry.extraDetail,
                                                                                  simulator:
                                                                                      entry.simulator,
                                                                                  type: "task",
                                                                                  notes:
                                                                                      entry.notes ||
                                                                                      [],
                                                                              }
                                                                            : {
                                                                                  // For logbook entries, use the existing logic
                                                                                  id: `logbook-${entry.date}-${entry.time}`,
                                                                                  title:
                                                                                      entry.title ||
                                                                                      entry.text.substring(
                                                                                          0,
                                                                                          50
                                                                                      ) +
                                                                                          (entry
                                                                                              .text
                                                                                              .length >
                                                                                          50
                                                                                              ? "..."
                                                                                              : ""),
                                                                                  description:
                                                                                      entry.text,
                                                                                  fullText:
                                                                                      entry.text,
                                                                                  assignedTo:
                                                                                      entry.author,
                                                                                  date: entry.date,
                                                                                  time: entry.time,
                                                                                  status: entry.category,
                                                                                  category:
                                                                                      entry.category,
                                                                                  subcategory:
                                                                                      entry.subcategory,
                                                                                  extraDetail:
                                                                                      entry.extraDetail,
                                                                                  simulator:
                                                                                      entry.simulator ||
                                                                                      "Others",
                                                                                  type: "logbook-entry",
                                                                                  originalEntry:
                                                                                      entry,
                                                                              };

                                                                    if (
                                                                        entry.type !==
                                                                        "task"
                                                                    ) {
                                                                        const logbookNoteKey =
                                                                            generateLogbookNoteKey(
                                                                                entry
                                                                            );
                                                                        taskEntry.notes =
                                                                            logbookNotes[
                                                                                logbookNoteKey
                                                                            ] ||
                                                                            [];
                                                                    }

                                                                    openTaskDetails(
                                                                        taskEntry
                                                                    );
                                                                }}
                                                                className="text-blue-600 hover:underline"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 24 24"
                                                                    width="24"
                                                                    height="24"
                                                                    color="currentColor"
                                                                    fill="none"
                                                                >
                                                                    <path
                                                                        d="M16.2141 4.98239L17.6158 3.58063C18.39 2.80646 19.6452 2.80646 20.4194 3.58063C21.1935 4.3548 21.1935 5.60998 20.4194 6.38415L19.0176 7.78591M16.2141 4.98239L10.9802 10.2163C9.93493 11.2616 9.41226 11.7842 9.05637 12.4211C8.70047 13.058 8.3424 14.5619 8 16C9.43809 15.6576 10.942 15.2995 11.5789 14.9436C12.2158 14.5877 12.7384 14.0651 13.7837 13.0198L19.0176 7.78591M16.2141 4.98239L19.0176 7.78591"
                                                                        stroke="currentColor"
                                                                        strokeWidth="1.5"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                    <path
                                                                        d="M21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3"
                                                                        stroke="currentColor"
                                                                        strokeWidth="1.5"
                                                                        strokeLinecap="round"
                                                                    />
                                                                </svg>{" "}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        )}
                                    </>
                                ) : (
                                    (() => {
                                        const dateEntries = entries.filter(
                                            (e) => e.date === selectedDate
                                        );
                                        const dateTasks = tasks.filter(
                                            (task) => task.date === selectedDate
                                        );

                                        const dayShiftTasks = dateTasks.filter(
                                            (task) => {
                                                const taskTime = task.time;
                                                if (!taskTime) return true;

                                                const [hours, minutes] =
                                                    taskTime
                                                        .split(":")
                                                        .map(Number);
                                                const timeInMinutes =
                                                    hours * 60 + minutes;

                                                return (
                                                    timeInMinutes > 420 &&
                                                    timeInMinutes < 1140
                                                );
                                            }
                                        );

                                        const nightShiftTasks =
                                            dateTasks.filter((task) => {
                                                const taskTime = task.time;
                                                if (!taskTime) return false;

                                                const [hours, minutes] =
                                                    taskTime
                                                        .split(":")
                                                        .map(Number);
                                                const timeInMinutes =
                                                    hours * 60 + minutes;

                                                return (
                                                    timeInMinutes >= 1140 ||
                                                    timeInMinutes <= 420
                                                );
                                            });

                                        const entriesByCategory = {};
                                        const categoryList =
                                            Object.keys(categories);

                                        categoryList.forEach((cat) => {
                                            entriesByCategory[cat] = [];
                                        });

                                        dateEntries.forEach((entry) => {
                                            const category =
                                                entry.category || "";
                                            if (
                                                categoryList.includes(category)
                                            ) {
                                                entriesByCategory[
                                                    category
                                                ].push(entry);
                                            } else {
                                                if (
                                                    !entriesByCategory["others"]
                                                ) {
                                                    entriesByCategory[
                                                        "others"
                                                    ] = [];
                                                }
                                                entriesByCategory[
                                                    "others"
                                                ].push(entry);
                                            }
                                        });
                                        const groupTasksBySimulator = (
                                            taskList,
                                            shiftType = null
                                        ) => {
                                            const tasksBySimulator = {};
                                            const simulators = [
                                                "FTD",
                                                "109FFS",
                                                "139#1",
                                                "139#3",
                                                "169",
                                                "189",
                                                "Others",
                                            ];

                                            simulators.forEach((sim) => {
                                                tasksBySimulator[sim] = [];
                                            });

                                            taskList.forEach((task) => {
                                                const simulator =
                                                    task.simulator || "";
                                                if (
                                                    simulators
                                                        .slice(0, -1)
                                                        .includes(simulator)
                                                ) {
                                                    tasksBySimulator[
                                                        simulator
                                                    ].push(task);
                                                } else {
                                                    tasksBySimulator[
                                                        "Others"
                                                    ].push(task);
                                                }
                                            });
                                            dateEntries.forEach((entry) => {
                                                if (shiftType && entry.time) {
                                                    const [hours, minutes] =
                                                        entry.time
                                                            .split(":")
                                                            .map(Number);
                                                    const timeInMinutes =
                                                        hours * 60 + minutes;

                                                    if (shiftType === "day") {
                                                        if (
                                                            timeInMinutes <=
                                                                420 ||
                                                            timeInMinutes >=
                                                                1140
                                                        ) {
                                                            return;
                                                        }
                                                    } else if (
                                                        shiftType === "night"
                                                    ) {
                                                        if (
                                                            timeInMinutes >
                                                                420 &&
                                                            timeInMinutes < 1140
                                                        ) {
                                                            return;
                                                        }
                                                    }
                                                }
                                                const entrySimulator =
                                                    entry.simulator || "Others";
                                                if (
                                                    !tasksBySimulator[
                                                        entrySimulator
                                                    ]
                                                ) {
                                                    tasksBySimulator[
                                                        entrySimulator
                                                    ] = [];
                                                }
                                                if (
                                                    !simulators.includes(
                                                        entrySimulator
                                                    )
                                                ) {
                                                    simulators.push(
                                                        entrySimulator
                                                    );
                                                }
                                                const logbookNoteKey =
                                                    generateLogbookNoteKey(
                                                        entry
                                                    );
                                                let entryNotes =
                                                    logbookNotes[
                                                        logbookNoteKey
                                                    ] || [];
                                                if (entryNotes.length === 0) {
                                                    const legacyKeys1 =
                                                        generateLegacyLogbookNoteKey(
                                                            entry,
                                                            entry.text
                                                        );
                                                    entryNotes =
                                                        (legacyKeys1.simpleKey
                                                            ? logbookNotes[
                                                                  legacyKeys1
                                                                      .simpleKey
                                                              ]
                                                            : []) ||
                                                        logbookNotes[
                                                            legacyKeys1
                                                                .textBasedKey
                                                        ] ||
                                                        [];

                                                    if (
                                                        entryNotes.length ===
                                                            0 &&
                                                        entry.originalText
                                                    ) {
                                                        const legacyKeys2 =
                                                            generateLegacyLogbookNoteKey(
                                                                entry,
                                                                entry.originalText
                                                            );
                                                        entryNotes =
                                                            (legacyKeys2.simpleKey
                                                                ? logbookNotes[
                                                                      legacyKeys2
                                                                          .simpleKey
                                                                  ]
                                                                : []) ||
                                                            logbookNotes[
                                                                legacyKeys2
                                                                    .textBasedKey
                                                            ] ||
                                                            [];
                                                    }
                                                }

                                                tasksBySimulator[
                                                    entrySimulator
                                                ].push({
                                                    id: `entry-${
                                                        entry.id ||
                                                        Math.random()
                                                    }`,
                                                    title:
                                                        entry.title ||
                                                        entry.text.substring(
                                                            0,
                                                            50
                                                        ) +
                                                            (entry.text.length >
                                                            50
                                                                ? "..."
                                                                : ""),
                                                    time: entry.time,
                                                    date: entry.date,
                                                    assignedTo: entry.author,
                                                    status: entry.category,
                                                    type: "logbook-entry",
                                                    fullText: entry.text,
                                                    description: entry.text,
                                                    category: entry.category,
                                                    subcategory:
                                                        entry.subcategory,
                                                    extraDetail:
                                                        entry.extraDetail,
                                                    duration: entry.duration,
                                                    simulator:
                                                        entry.simulator ||
                                                        entrySimulator,
                                                    originalEntry: entry,
                                                    notes: entryNotes,
                                                });
                                            });

                                            return {
                                                tasksBySimulator,
                                                simulators,
                                            };
                                        };
                                        return (
                                            <div className="combined-container space-y-6">
                                                {/* Day Shift Tasks Section */}
                                                <div className="day-tasks-section">
                                                    <div className="flex flex-row items-center gap-16 mb-2">
                                                        <div className="flex items-center gap-2">
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
                                                                    strokeLinejoin="round"
                                                                ></path>
                                                            </svg>{" "}
                                                            <h4 className="text-gray-600">
                                                                Giorno
                                                            </h4>
                                                            <span className="span">
                                                                {
                                                                    dayShiftTasks.length
                                                                }{" "}
                                                                task
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {(() => {
                                                        const {
                                                            tasksBySimulator,
                                                            simulators,
                                                        } =
                                                            groupTasksBySimulator(
                                                                dayShiftTasks,
                                                                "day"
                                                            );
                                                        return (
                                                            <div className="simulators-row flex flex-wrap justify-between gap-4 mb-4">
                                                                {simulators.map(
                                                                    (
                                                                        simulator
                                                                    ) => {
                                                                        const simulatorTasks =
                                                                            tasksBySimulator[
                                                                                simulator
                                                                            ];

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    simulator
                                                                                }
                                                                                className="simulator-column flex-1 min-w-[120px]"
                                                                            >
                                                                                <div className="simulator-header flex flex-row items-center justify-center gap-2 mb-4">
                                                                                    <p className="text-xs font-medium text-gray-600">
                                                                                        {
                                                                                            simulator
                                                                                        }
                                                                                    </p>
                                                                                </div>
                                                                                <div className="simulator-tasks space-y-2">
                                                                                    {simulatorTasks.length ===
                                                                                    0 ? (
                                                                                        <div className="text-center py-2">
                                                                                            <span className="text-xs text-gray-400 italic"></span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        simulatorTasks.map(
                                                                                            renderTaskCard
                                                                                        )
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>{" "}
                                                <div className="separator"></div>
                                                {/* Night Shift Tasks Section */}
                                                <div className="night-tasks-section">
                                                    <div className="flex flex-row items-center gap-16 mb-2">
                                                        <div className="flex items-center gap-2">
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
                                                                />
                                                            </svg>{" "}
                                                            <h4 className="text-gray-600">
                                                                Notte
                                                            </h4>
                                                            <span className="span">
                                                                {
                                                                    nightShiftTasks.length
                                                                }{" "}
                                                                task
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {(() => {
                                                        const {
                                                            tasksBySimulator,
                                                            simulators,
                                                        } =
                                                            groupTasksBySimulator(
                                                                nightShiftTasks,
                                                                "night"
                                                            );
                                                        return (
                                                            <div className="simulators-row flex flex-wrap justify-between gap-4 mb-4">
                                                                {simulators.map(
                                                                    (
                                                                        simulator
                                                                    ) => {
                                                                        const simulatorTasks =
                                                                            tasksBySimulator[
                                                                                simulator
                                                                            ];

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    simulator
                                                                                }
                                                                                className="simulator-column flex-1 min-w-[120px]"
                                                                            >
                                                                                <div className="simulator-header flex flex-row items-center justify-center gap-2 mb-4">
                                                                                    <p className="text-xs font-medium text-gray-600">
                                                                                        {
                                                                                            simulator
                                                                                        }
                                                                                    </p>
                                                                                </div>
                                                                                <div className="simulator-tasks space-y-2">
                                                                                    {simulatorTasks.length ===
                                                                                    0 ? (
                                                                                        <div className="text-center py-2">
                                                                                            <span className="text-xs text-gray-400 italic"></span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        simulatorTasks.map(
                                                                                            renderTaskCard
                                                                                        )
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                            <div className="flex flex-row justify-between items-start gap-8">
                                <div
                                    className="flex flex-col w-full h-auto border p-4 rounded-xl bg-white mb-8 overflow-y-auto max-h-full max-w-full"
                                    style={{
                                        boxShadow: "4px 4px 10px #00000010",
                                    }}
                                >
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
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M12 5.99954H4M8 1.99954V9.99954"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        <p className="text-gray-600">
                                            {editIndex !== null
                                                ? "Modifica logbook"
                                                : "Nuova logbook"}
                                        </p>
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
                                    <div
                                        className={`accordion-content overflow-hidden transition-all duration-300 ease-in-out ${
                                            isAddTaskAccordionOpen
                                                ? "max-h-full opacity-100"
                                                : "max-h-0 opacity-0"
                                        }`}
                                    >
                                        <div className="separator"></div>

                                        <form
                                            onSubmit={handleSubmit}
                                            className="flex flex-col gap-2"
                                        >
                                            <label
                                                htmlFor="text"
                                                className="text-xs text-gray-500"
                                            >
                                                Nome task
                                            </label>{" "}
                                            <input
                                                type="text"
                                                id="name"
                                                value={name}
                                                onChange={(e) =>
                                                    setName(e.target.value)
                                                }
                                                placeholder="Nome entry "
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                            />
                                            <label
                                                htmlFor="text"
                                                className="text-xs text-gray-500"
                                            >
                                                Descrizione
                                            </label>
                                            <textarea
                                                id="text"
                                                value={text}
                                                onChange={(e) =>
                                                    setText(e.target.value)
                                                }
                                                placeholder="Aggiungi descrizione"
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                                rows="3"
                                                required
                                            />{" "}
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
                                                    setCategory(e.target.value);
                                                    setSubcategory("");
                                                    setExtraDetail("");
                                                }}
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                                required
                                            >
                                                <option value="">
                                                    Seleziona categoria
                                                </option>
                                                {Object.keys(categories).map(
                                                    (c) => (
                                                        <option
                                                            key={c}
                                                            value={c}
                                                        >
                                                            {c}
                                                        </option>
                                                    )
                                                )}
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
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
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
                                            {category === "troubleshooting" && (
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
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                                    >
                                                        <option value="">
                                                            Seleziona dettaglio
                                                        </option>
                                                        {troubleshootingDetails.map(
                                                            (d) => (
                                                                <option
                                                                    key={d}
                                                                    value={d}
                                                                >
                                                                    {d}
                                                                </option>
                                                            )
                                                        )}{" "}
                                                    </select>
                                                </>
                                            )}{" "}
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
                                                    setSimulator(e.target.value)
                                                }
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                            >
                                                <option value="">
                                                    Seleziona simulatore...
                                                </option>
                                                <option value="FTD">FTD</option>
                                                <option value="109FFS">
                                                    109FFS
                                                </option>
                                                <option value="139#1">
                                                    139#1
                                                </option>
                                                <option value="139#3">
                                                    139#3
                                                </option>
                                                <option value="169">169</option>
                                                <option value="189">189</option>
                                                <option value="Others">
                                                    Others
                                                </option>
                                            </select>
                                            <div className="flex gap-2">
                                                <div className="flex flex-col flex-1">
                                                    <label
                                                        htmlFor="formDate"
                                                        className="text-xs text-gray-500 mb-2"
                                                    >
                                                        Data
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id="formDate"
                                                        value={formDate}
                                                        onChange={(e) =>
                                                            setFormDate(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex flex-col flex-1">
                                                    <label
                                                        htmlFor="formTime"
                                                        className="text-xs text-gray-500 mb-2"
                                                    >
                                                        Orario
                                                    </label>
                                                    <input
                                                        type="time"
                                                        id="formTime"
                                                        value={formTime}
                                                        onChange={(e) =>
                                                            setFormTime(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <label
                                                htmlFor="duration"
                                                className="text-xs text-gray-500 mt-4"
                                            >
                                                Durata
                                            </label>
                                            <input
                                                type="text"
                                                id="duration"
                                                value={duration}
                                                onChange={(e) =>
                                                    setDuration(e.target.value)
                                                }
                                                placeholder="Durata (es. 1h30)"
                                                className="border px-3 py-2 rounded mb-8 text-gray-600 text-sm focus:outline-none"
                                            />
                                            <button
                                                type="submit"
                                                className="aggiungi-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                                            >
                                                {editIndex !== null
                                                    ? "Salva modifica"
                                                    : "Aggiungi voce"}
                                            </button>
                                            {editIndex !== null && (
                                                <button
                                                    type="button"
                                                    onClick={resetForm}
                                                    className="mt-2 text-red-600 hover:text-red-800 transition-colors"
                                                >
                                                    Annulla modifica
                                                </button>
                                            )}
                                        </form>
                                    </div>{" "}
                                </div>
                                <div
                                    className="flex flex-col w-full h-auto border p-4 rounded-xl bg-white mb-8 overflow-y-auto max-h-full max-w-full"
                                    style={{
                                        boxShadow: "4px 4px 10px #00000010",
                                    }}
                                >
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
                                            />
                                        </svg>

                                        <p className="text-gray-600">
                                            Filtro logbook
                                        </p>

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
                                    <div
                                        className={`accordion-content overflow-hidden transition-all duration-300 ease-in-out ${
                                            isFilterAccordionOpen
                                                ? "max-h-[600px] opacity-100"
                                                : "max-h-0 opacity-0"
                                        }`}
                                    >
                                        <div className="separator"></div>
                                        <div className="filter-form flex flex-col gap-2 mt-4">
                                            <label
                                                htmlFor="searchText"
                                                className="text-xs text-gray-500"
                                            >
                                                Cerca
                                            </label>{" "}
                                            <div className="flex flex-row gap-2 mb-4">
                                                <input
                                                    type="text"
                                                    id="searchText"
                                                    placeholder="Cerca per testo, titolo, nome..."
                                                    value={search}
                                                    onChange={(e) =>
                                                        setSearch(
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyPress={(e) =>
                                                        e.key === "Enter" &&
                                                        handleSearch()
                                                    }
                                                    className="flex w-full border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                                />{" "}
                                                <button
                                                    onClick={handleSearch}
                                                    disabled={isSearching}
                                                    className={`flex items-center px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2 ${
                                                        isSearching
                                                            ? "bg-gray-400 text-white cursor-not-allowed"
                                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                                    }`}
                                                >
                                                    <>
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
                                                        <p className="p-0 m-0">
                                                            Cerca
                                                        </p>
                                                    </>{" "}
                                                </button>
                                                {showFilterResults && (
                                                    <>
                                                        <button
                                                            onClick={
                                                                handleClearFilters
                                                            }
                                                            className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
                                                        >
                                                            Cancella
                                                        </button>
                                                        <button
                                                            onClick={
                                                                handleExportFilteredEntries
                                                            }
                                                            className="flex items-center bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors gap-2"
                                                            disabled={
                                                                filteredEntries.length ===
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
                                            </div>
                                            <label
                                                htmlFor="category"
                                                className="text-xs text-gray-500"
                                            >
                                                Categoria
                                            </label>
                                            <select
                                                id="category"
                                                value={filterCategory}
                                                onChange={(e) =>
                                                    setFilterCategory(
                                                        e.target.value
                                                    )
                                                }
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                            >
                                                <option value="">
                                                    Tutte le categorie
                                                </option>
                                                {Object.keys(categories).map(
                                                    (c) => (
                                                        <option key={c}>
                                                            {c}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                            <label
                                                htmlFor="subcategory"
                                                className="text-xs text-gray-500"
                                            >
                                                Sottocategoria
                                            </label>
                                            <select
                                                id="subcategory"
                                                value={filterSubcategory}
                                                onChange={(e) =>
                                                    setFilterSubcategory(
                                                        e.target.value
                                                    )
                                                }
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                            >
                                                <option value="">
                                                    Tutte le sottocategorie
                                                </option>
                                                {[
                                                    ...new Set(
                                                        Object.values(
                                                            categories
                                                        )
                                                            .flat()
                                                            .concat(
                                                                troubleshootingDetails
                                                            )
                                                    ),
                                                ].map((s) => (
                                                    <option key={s}>{s}</option>
                                                ))}
                                            </select>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex flex-col flex-1">
                                                        <label
                                                            htmlFor="startDate"
                                                            className="text-xs text-gray-500 mb-2"
                                                        >
                                                            Da
                                                        </label>
                                                        <input
                                                            type="date"
                                                            id="startDate"
                                                            value={startDate}
                                                            onChange={(e) =>
                                                                setStartDate(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col flex-1">
                                                        <label
                                                            htmlFor="endDate"
                                                            className="text-xs text-gray-500 mb-2"
                                                        >
                                                            A
                                                        </label>
                                                        <input
                                                            type="date"
                                                            id="endDate"
                                                            value={endDate}
                                                            onChange={(e) =>
                                                                setEndDate(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>{" "}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>{" "}
            </div>{" "}
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
                onToggleTask={() => {}}
                onDeleteTask={handleDeleteTask}
                canToggleTask={canToggleTask}
                canDeleteTasks={canDeleteTasks}
                canEditDescription={canEditDescription}
                onEditDescription={openDescriptionModal}
                onSaveNote={handleSaveNote}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                canModifyNote={canModifyNote}
                canDeleteNote={canDeleteNote}
            />
            <DescriptionModal
                isOpen={descriptionModal.isOpen}
                onClose={closeDescriptionModal}
                onSave={handleSaveDescriptionForLogbook}
                currentDescription={descriptionModal.entry?.fullText || ""}
                currentSimulator={descriptionModal.entry?.simulator || ""}
                currentEmployee={
                    descriptionModal.entry?.assignedTo ||
                    descriptionModal.entry?.author ||
                    ""
                }
                currentDate={descriptionModal.entry?.date || ""}
                currentTime={descriptionModal.entry?.time || ""}
                availableEmployees={availableEmployees}
                employeesLoading={employeesLoading}
                onDateTimeChange={handleDescriptionModalDateTimeChange}
                isEditing={true}
                isEmployee={currentUser?.role === "employee"}
            />
        </>
    );
}
