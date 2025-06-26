import { useEffect, useState } from "react";
import "../styles/tasks.css";
import TaskDetailsModal from "../components/TaskDetailsModal";
import Modal from "../components/Modal";
import DescriptionModal from "../components/DescriptionModal";
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

export default function Logbook() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [entries, setEntries] = useState([]);
    const [filteredEntries, setFilteredEntries] = useState([]);
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
    const [isSearching, setIsSearching] = useState(false);
    const [showFilterResults, setShowFilterResults] = useState(false); // Accordion states
    const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);
    const [isAddTaskAccordionOpen, setIsAddTaskAccordionOpen] = useState(false);
    const [isTaskAccordionOpen, setIsTaskAccordionOpen] = useState(false); // Task details modal state
    const [taskDetailsModal, setTaskDetailsModal] = useState({
        isOpen: false,
        task: null,
    }); // Modal state for success/error messages
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
    });

    // Description modal state for editing logbook entries
    const [descriptionModal, setDescriptionModal] = useState({
        isOpen: false,
        entry: null,
        entryIndex: null,
    }); // Get current user's name from localStorage
    const currentUserName =
        localStorage.getItem("userName") || "Utente Sconosciuto";

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

    // Set author to current user on component mount
    useEffect(() => {
        setAuthor(currentUserName);
    }, [currentUserName]);

    // Sync selectedDate with date whenever date changes
    useEffect(() => {
        setSelectedDate(date);
    }, [date]);
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        fetch(`${API}/api/logbook/${date}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setEntries(data);
                if (!showFilterResults) {
                    setFilteredEntries(data);
                }
                // Reset search filters when changing date if not actively filtering
                if (!showFilterResults) {
                    setSearch("");
                    setFilterCategory("");
                    setFilterSubcategory("");
                    setStartDate("");
                    setEndDate("");
                }
            });
    }, [date]); // Auto-search when search term, category, or subcategory changes
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
                !endDate
            ) {
                // Reset to show current day's entries when all filters are cleared
                setFilteredEntries(entries);
                setShowFilterResults(false);
            }
        }, 500); // 500ms debounce to avoid too many API calls

        return () => clearTimeout(timeoutId);
    }, [
        search,
        filterCategory,
        filterSubcategory,
        startDate,
        endDate,
        entries,
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
            // Create a clean version of the content for PDF
            const formattedDate = new Date(selectedDate).toLocaleDateString(
                "it-IT",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                }
            );

            // Get tasks and entries for the selected date
            const dailyTasks = tasks.filter(
                (task) => task.date === selectedDate
            );
            const dailyEntries = entries.filter(
                (entry) => entry.date === selectedDate
            );

            // Create a temporary div with clean styling for PDF
            const pdfContent = document.createElement("div");
            pdfContent.style.padding = "20px";
            pdfContent.style.fontFamily = "Arial, sans-serif";
            pdfContent.style.backgroundColor = "white";

            // Add title
            const title = document.createElement("h2");
            title.textContent = `Task e Logbook per il ${formattedDate}`;
            title.style.marginBottom = "20px";
            title.style.color = "#333";
            title.style.borderBottom = "2px solid #3b82f6";
            title.style.paddingBottom = "10px";
            pdfContent.appendChild(title);

            if (dailyTasks.length === 0 && dailyEntries.length === 0) {
                const noContent = document.createElement("p");
                noContent.textContent = "Nessun task o entry per questa data";
                noContent.style.color = "#666";
                noContent.style.fontStyle = "italic";
                pdfContent.appendChild(noContent);
            } else {
                // Group tasks by simulator
                const tasksBySimulator = {};
                dailyTasks.forEach((task) => {
                    const simulator = task.simulator || "Nessun Simulatore";
                    if (!tasksBySimulator[simulator]) {
                        tasksBySimulator[simulator] = [];
                    }
                    tasksBySimulator[simulator].push(task);
                }); // Add logbook entries to their specified simulator
                if (dailyEntries.length > 0) {
                    dailyEntries.forEach((entry) => {
                        const entrySimulator = entry.simulator || "Others";
                        if (!tasksBySimulator[entrySimulator]) {
                            tasksBySimulator[entrySimulator] = [];
                        } // Convert entries to task-like format for consistent rendering                        // Load notes for this logbook entry - try multiple key formats for compatibility
                        const logbookNoteKey = generateLogbookNoteKey(entry);
                        let entryNotes = logbookNotes[logbookNoteKey] || []; // Fallback: try old key formats if no notes found with new stable key
                        if (entryNotes.length === 0) {
                            // Try with current text
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

                            // Try with originalText if available
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
                            date: entry.date, // Add the date property
                            assignedTo: entry.author,
                            status: entry.category,
                            type: "logbook-entry",
                            fullText: entry.text,
                            description: entry.text, // Add description property for TaskDetailsModal
                            category: entry.category,
                            subcategory: entry.subcategory,
                            extraDetail: entry.extraDetail,
                            duration: entry.duration,
                            simulator: entry.simulator || entrySimulator,
                            originalEntry: entry, // Keep reference to original entry for editing
                            originalText: entry.text, // Preserve original text for stable note key generation
                            notes: entryNotes, // Add notes from localStorage
                        });
                    });
                } // Render tasks grouped by simulator
                Object.keys(tasksBySimulator).forEach((simulator) => {
                    // Add simulator header
                    const simulatorHeader = document.createElement("h4");
                    simulatorHeader.textContent = simulator;
                    simulatorHeader.style.margin = "20px 0 10px 0";
                    simulatorHeader.style.color = "#1f2937";
                    simulatorHeader.style.fontSize = "18px";
                    simulatorHeader.style.fontWeight = "bold";
                    simulatorHeader.style.borderBottom = "1px solid #d1d5db";
                    simulatorHeader.style.paddingBottom = "20px";
                    pdfContent.appendChild(simulatorHeader); // Add tasks for this simulator
                    tasksBySimulator[simulator].forEach((task, index) => {
                        // Load notes for regular tasks if they don't have notes already
                        if (task.type !== "logbook-entry" && !task.notes) {
                            task.notes = taskNotes[task.id] || [];
                        }

                        const taskDiv = document.createElement("div");
                        taskDiv.style.marginBottom = "15px";
                        taskDiv.style.padding = "15px";
                        // Different styling for logbook entries vs tasks
                        if (task.type === "logbook-entry") {
                            // Use solid colors for PDF borders
                            let borderColor = "#e5e7eb"; // default
                            switch (task.category) {
                                case "routine task":
                                    borderColor = "#3b82f6";
                                    break;
                                case "troubleshooting":
                                    borderColor = "#dc2626";
                                    break;
                                case "others":
                                    borderColor = "#f6ad10";
                                    break;
                            }
                            taskDiv.style.border = `2px solid ${borderColor}`;
                            taskDiv.style.borderRadius = "8px";
                            taskDiv.style.backgroundColor = "#fafafa";
                        } else {
                            // Use solid colors for PDF borders
                            let borderColor = "#e5e7eb"; // default
                            switch (task.status) {
                                case "completato":
                                    borderColor = "#139d54";
                                    break;
                                case "in corso":
                                    borderColor = "#f6ad10";
                                    break;
                                case "non completato":
                                    borderColor = "#dc2626";
                                    break;
                            }
                            taskDiv.style.border = `2px solid ${borderColor}`;
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

                            // Add full text for logbook entries
                            if (task.fullText && task.fullText !== task.title) {
                                const fullTextP = document.createElement("p");
                                fullTextP.textContent = task.fullText;
                                fullTextP.style.margin = "8px 0 0 0";
                                fullTextP.style.color = "#444";
                                fullTextP.style.fontSize = "14px";
                                fullTextP.style.fontStyle = "italic";
                                taskDiv.appendChild(fullTextP);
                            }

                            // Add notes for logbook entries if they exist
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
                                    const noteTimestamp = new Date(
                                        note.timestamp
                                    ).toLocaleDateString("it-IT", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    });
                                    noteP.textContent = `${
                                        noteIndex + 1
                                    }. [${noteTimestamp}] ${note.text}`;
                                    noteP.style.margin = "4px 0 0 16px";
                                    noteP.style.color = "#555";
                                    noteP.style.fontSize = "13px";
                                    noteP.style.borderLeft =
                                        "3px solid #3b82f6";
                                    noteP.style.paddingLeft = "8px";
                                    taskDiv.appendChild(noteP);
                                });
                            }
                        } else {
                            taskDetails.textContent = `Orario: ${task.time} • Assegnato a: ${task.assignedTo} • Status: ${task.status}`;

                            // Add notes for regular tasks if they exist
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
                                    const noteTimestamp = new Date(
                                        note.timestamp
                                    ).toLocaleDateString("it-IT", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    });
                                    noteP.textContent = `${
                                        noteIndex + 1
                                    }. [${noteTimestamp}] ${note.text}`;
                                    noteP.style.margin = "4px 0 0 16px";
                                    noteP.style.color = "#555";
                                    noteP.style.fontSize = "13px";
                                    noteP.style.borderLeft =
                                        "3px solid #3b82f6";
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

            // Temporarily add to body
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

        // Text search filter - comprehensive search like in Tasks.js
        if (searchTerm && searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            console.log("Searching for:", searchLower);

            filtered = filtered.filter((entry) => {
                const textMatch = entry.text
                    .toLowerCase()
                    .includes(searchLower);
                const titleMatch =
                    entry.title &&
                    entry.title.toLowerCase().includes(searchLower);
                const authorMatch = entry.author
                    .toLowerCase()
                    .includes(searchLower);
                const categoryMatch = entry.category
                    .toLowerCase()
                    .includes(searchLower);
                const subcategoryMatch =
                    entry.subcategory &&
                    entry.subcategory.toLowerCase().includes(searchLower);
                const extraDetailMatch =
                    entry.extraDetail &&
                    entry.extraDetail.toLowerCase().includes(searchLower);

                const matches =
                    textMatch ||
                    titleMatch ||
                    authorMatch ||
                    categoryMatch ||
                    subcategoryMatch ||
                    extraDetailMatch;

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
                }

                return matches;
            });
            console.log("After text filter:", filtered);
        }

        // Category filter
        if (categoryFilter) {
            filtered = filtered.filter(
                (entry) => entry.category === categoryFilter
            );
        }

        // Subcategory filter
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

        // If date range is specified, search across that range
        if (startDate && endDate) {
            const allEntries = await loadEntriesFromRange();
            console.log("Loaded entries from range:", allEntries);
            filtered = applyFilters(
                allEntries,
                search,
                filterCategory,
                filterSubcategory
            );
        } else if (search || filterCategory || filterSubcategory) {
            // If searching but no date range specified, search across last 3 months
            const today = new Date();
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);

            const searchStartDate = threeMonthsAgo.toISOString().split("T")[0];
            const searchEndDate = today.toISOString().split("T")[0];

            console.log("Searching from", searchStartDate, "to", searchEndDate);

            const dates = getDateRange(searchStartDate, searchEndDate);
            let allEntries = [];
            const token = localStorage.getItem("authToken");

            // Load entries from the last 3 months (reduced from 6 for performance)
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
                    // Skip dates that don't have data
                    console.log(`No data for ${d}`);
                }
            }

            // Ensure today's entries are included from current state
            const todayDate = new Date().toISOString().split("T")[0];
            const currentDateEntries = entries.filter(
                (entry) => entry.date === todayDate || !entry.date
            );

            // Add current entries if they're not already included
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

            console.log("All loaded entries:", allEntries);
            console.log("Sample entry structure:", allEntries[0]);
            filtered = applyFilters(
                allEntries,
                search,
                filterCategory,
                filterSubcategory
            );
        } else {
            // If no search criteria, show current day's entries
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
    const saveEntries = async (newEntries) => {
        const token = localStorage.getItem("authToken");
        await fetch(`${API}/api/logbook/${date}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newEntries),
        });
        setEntries(newEntries);
        // Update filtered entries if not actively filtering
        if (!showFilterResults) {
            setFilteredEntries(newEntries);
        }
        resetForm();
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
            // Use name as title, fallback to text snippet if name is empty
            title:
                name || text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        };

        const newEntries = [...entries];
        if (editIndex !== null) {
            // When editing, use the name field as title
            newEntries[editIndex] = {
                ...entry,
                title:
                    name ||
                    text.substring(0, 50) + (text.length > 50 ? "..." : ""),
            };
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

    // Task details modal functions
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

    // Description modal functions for editing logbook entries
    const openDescriptionModal = (task) => {
        // Find the original entry index in the entries array
        let entryIndex = -1;

        console.log("Opening description modal for task:", task);
        console.log("Current entries:", entries);

        if (task.originalEntry) {
            // Use the original entry reference if available
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
            // Fallback to the previous method
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

        // If we still can't find the entry, try with a more flexible approach
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
    };

    const closeDescriptionModal = () => {
        setDescriptionModal({
            isOpen: false,
            entry: null,
            entryIndex: null,
        });
    };
    const handleSaveDescriptionForLogbook = async (updatedData) => {
        const { description, simulator } = updatedData;
        const { entryIndex } = descriptionModal;

        console.log("Saving description with entryIndex:", entryIndex);
        console.log("Current entries state:", entries);
        console.log("Description modal entry:", descriptionModal.entry);

        if (entryIndex === -1) {
            // If we can't find by index, try to find by originalEntry data
            const task = descriptionModal.entry;
            if (task && task.originalEntry) {
                console.log("Trying to save using originalEntry data");
                // Find the entry by matching the original entry data
                const foundIndex = entries.findIndex(
                    (entry) =>
                        entry.text === task.originalEntry.text &&
                        entry.date === task.originalEntry.date &&
                        entry.time === task.originalEntry.time &&
                        entry.author === task.originalEntry.author
                );

                if (foundIndex !== -1) {
                    console.log("Found entry at index:", foundIndex);
                    // Update using the found index
                    const updatedEntries = [...entries];
                    const originalEntry = updatedEntries[foundIndex];

                    updatedEntries[foundIndex] = {
                        ...originalEntry,
                        text: description,
                        simulator: simulator || "Others",
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
            // Update the entry in the entries array
            const updatedEntries = [...entries];
            const originalEntry = updatedEntries[entryIndex];

            updatedEntries[entryIndex] = {
                ...originalEntry,
                text: description,
                simulator: simulator || "Others",
                // Keep the original title if it exists, otherwise create one from the original text
                title:
                    originalEntry.title ||
                    originalEntry.text.substring(0, 50) +
                        (originalEntry.text.length > 50 ? "..." : ""),
            };

            // Save to backend
            await saveEntries(updatedEntries);

            // Update the task details modal if it's showing the same entry
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
                    // Keep the original title, don't regenerate it from the new description
                    title: taskDetailsModal.task.title,
                };
                setTaskDetailsModal({
                    ...taskDetailsModal,
                    task: updatedTask,
                });
            }

            // Close modal and show success message
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
    }; // Permission functions for TaskDetailsModal (read-only in logbook)
    const canToggleTask = (task) => false; // No task editing in logbook
    const canDeleteTasks = (task) => task && task.type === "logbook-entry"; // Allow deletion for logbook entries
    const canEditDescription = (task) => task.type === "logbook-entry"; // Allow editing description for logbook entries    // Function to handle deleting a task/entry from the modal
    const handleDeleteTask = async (taskOrId) => {
        // Handle both task object and task ID
        let task = taskOrId;

        // If we received just an ID, get the task from the modal
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

        // Find the entry index in the entries array
        let entryIndex = -1;

        if (task.originalEntry) {
            // Use the original entry reference if available
            entryIndex = entries.findIndex(
                (entry) =>
                    entry.text === task.originalEntry.text &&
                    entry.date === task.originalEntry.date &&
                    entry.time === task.originalEntry.time &&
                    entry.author === task.originalEntry.author
            );
        } else {
            // Fallback to finding by task properties
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
        } // Show confirmation dialog
        showModal(
            "Conferma Eliminazione",
            "Sei sicuro di voler eliminare questa entry?",
            "confirm",
            async () => {
                try {
                    // Delete the entry directly without calling handleDelete to avoid double confirmation
                    const newEntries = entries.filter(
                        (_, i) => i !== entryIndex
                    );
                    await saveEntries(newEntries);

                    // Close the task details modal
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

    // Function to handle saving notes for tasks and logbook entries
    const handleSaveNote = async (taskId, noteText) => {
        try {
            // Check if this is a logbook entry
            const currentTask = taskDetailsModal.task;
            if (currentTask && currentTask.type === "logbook-entry") {
                console.log("Saving note for logbook entry:", currentTask);

                // Generate the logbook note key using the new stable format
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

                // Check for existing notes with old key formats and migrate them
                let existingNotes = logbookNotes[logbookNoteKey] || [];
                if (existingNotes.length === 0 && currentTask.originalEntry) {
                    // Try to find notes with legacy keys
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
                        // Try with current description
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
                } // Save note to backend
                await notesService.addLogbookNote(
                    logbookNoteKey,
                    noteText,
                    currentUserName
                );

                // Update local state with migrated notes
                const updatedLogbookNotes = {
                    ...logbookNotes,
                    [logbookNoteKey]: [
                        ...existingNotes, // Include any migrated notes
                        {
                            text: noteText,
                            author: currentUserName,
                            timestamp: new Date().toISOString(),
                        },
                    ],
                };
                setLogbookNotes(updatedLogbookNotes);

                // Update the task details modal to show the new note
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
                // For regular tasks, use the task notes API
                await notesService.addTaskNote(
                    taskId,
                    noteText,
                    currentUserName
                );

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

    const handleChangeDay = (offset) => {
        const d = new Date(date);
        d.setDate(d.getDate() + offset);
        const newDate = d.toISOString().split("T")[0];
        setDate(newDate);
        setSelectedDate(newDate);
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

    // Helper function to get border color based on category
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
    }; // Helper function to get border color based on task status
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

    // Notes state
    const [taskNotes, setTaskNotes] = useState({});
    const [logbookNotes, setLogbookNotes] = useState({});
    const [notesLoaded, setNotesLoaded] = useState(false); // Load notes from backend and migrate from localStorage if needed
    useEffect(() => {
        const loadNotesAndMigrate = async () => {
            try {
                // First, migrate any existing localStorage notes
                await migrateNotesFromLocalStorage();

                // Then load all notes from backend
                const [taskNotesData, logbookNotesData] = await Promise.all([
                    notesService.getTaskNotes(),
                    notesService.getLogbookNotes(),
                ]);

                setTaskNotes(taskNotesData);
                setLogbookNotes(logbookNotesData);
                setNotesLoaded(true);
            } catch (error) {
                console.error("Error loading notes:", error);
                // Don't fall back to localStorage - require backend for notes
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

    // Tasks state (from Tasks.js)
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
    }, [taskNotes, notesLoaded]); // Re-run when notes are loaded

    // Helper function to get border color for both tasks and logbook entries
    const getCardBorderColor = (item) => {
        if (item.type === "logbook-entry") {
            return getCategoryBorderColor(item.category);
        } else {
            return getBorderColor(item.status);
        }
    }; // Function to render task cards (handles both tasks and logbook entries)
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
                        <span
                            className={
                                task.type === "logbook-entry"
                                    ? "px-2 py-1 rounded text-xs bg-blue-100 text-blue-600"
                                    : `px-2 py-1 rounded text-xs ${
                                          task.status === "completato"
                                              ? "bg-green-100 text-green-600"
                                              : task.status === "in corso"
                                              ? "bg-yellow-100 text-yellow-600"
                                              : task.status === "non completato"
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

    return (
        <>
            <div className="flex gap-4 flex-col lg:flex-row justify-between max-w-full p-4">
                <div className="flex flex-col w-full min-w-0 justify-start gap-8">
                    <div className="date-selector flex items-center justify-start gap-8 flex-wrap">
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
                                            {filteredEntries.length} entr
                                            {filteredEntries.length === 1
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
                                        Nessuna entry trovata con i filtri
                                        applicati
                                    </div>
                                ) : (
                                    filteredEntries.map((entry, index) => (
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
                                                    {entry.title || entry.text}
                                                </p>{" "}
                                                <div className="text-xs text-gray-500 capitalize">
                                                    {entry.date} • {entry.time}{" "}
                                                    • {entry.duration} •{" "}
                                                    {entry.category}
                                                    {entry.subcategory &&
                                                        ` / ${entry.subcategory}`}
                                                    {entry.extraDetail &&
                                                        ` / ${entry.extraDetail}`}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                {" "}
                                                <button
                                                    onClick={() => {
                                                        // Convert entry to task format and open modal
                                                        const taskEntry = {
                                                            id: `logbook-${entry.date}-${entry.time}`,
                                                            title:
                                                                entry.title ||
                                                                entry.text.substring(
                                                                    0,
                                                                    50
                                                                ) +
                                                                    (entry.text
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
                                                        }; // Load existing notes for this logbook entry
                                                        const logbookNoteKey =
                                                            generateLogbookNoteKey(
                                                                entry
                                                            );
                                                        taskEntry.notes =
                                                            logbookNotes[
                                                                logbookNoteKey
                                                            ] || [];

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
                                    ))
                                )}
                            </>
                        ) : (
                            (() => {
                                // Get entries for the selected date
                                const dateEntries = entries.filter(
                                    (e) => e.date === date
                                ); // Get tasks for the selected date
                                const dateTasks = tasks.filter(
                                    (task) => task.date === date
                                );

                                // Separate day and night shift tasks
                                const dayShiftTasks = dateTasks.filter(
                                    (task) => {
                                        const taskTime = task.time;
                                        if (!taskTime) return true; // Include tasks without time in day shift

                                        const [hours, minutes] = taskTime
                                            .split(":")
                                            .map(Number);
                                        const timeInMinutes =
                                            hours * 60 + minutes;

                                        // Day shift: 07:01 to 18:59 (not night shift)
                                        return (
                                            timeInMinutes > 420 &&
                                            timeInMinutes < 1140
                                        );
                                    }
                                );

                                const nightShiftTasks = dateTasks.filter(
                                    (task) => {
                                        const taskTime = task.time;
                                        if (!taskTime) return false; // Exclude tasks without time from night shift

                                        const [hours, minutes] = taskTime
                                            .split(":")
                                            .map(Number);
                                        const timeInMinutes =
                                            hours * 60 + minutes;

                                        // Night shift: 19:00 to 07:00 (>= 1140 OR <= 420)
                                        return (
                                            timeInMinutes >= 1140 ||
                                            timeInMinutes <= 420
                                        );
                                    }
                                );

                                // Group entries by category
                                const entriesByCategory = {};
                                const categoryList = Object.keys(categories);

                                // Initialize each category group
                                categoryList.forEach((cat) => {
                                    entriesByCategory[cat] = [];
                                });

                                // Group entries by category
                                dateEntries.forEach((entry) => {
                                    const category = entry.category || "";
                                    if (categoryList.includes(category)) {
                                        entriesByCategory[category].push(entry);
                                    } else {
                                        // If category doesn't exist, add to "others"
                                        if (!entriesByCategory["others"]) {
                                            entriesByCategory["others"] = [];
                                        }
                                        entriesByCategory["others"].push(entry);
                                    }
                                }); // Function to group tasks by simulator
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

                                    // Initialize each simulator group
                                    simulators.forEach((sim) => {
                                        tasksBySimulator[sim] = [];
                                    });

                                    // Group tasks by simulator
                                    taskList.forEach((task) => {
                                        const simulator = task.simulator || "";
                                        if (
                                            simulators
                                                .slice(0, -1)
                                                .includes(simulator)
                                        ) {
                                            tasksBySimulator[simulator].push(
                                                task
                                            );
                                        } else {
                                            tasksBySimulator["Others"].push(
                                                task
                                            );
                                        }
                                    }); // Add logbook entries to their specified simulator only for the correct shift
                                    dateEntries.forEach((entry) => {
                                        // Check if entry time matches the shift type
                                        if (shiftType && entry.time) {
                                            const [hours, minutes] = entry.time
                                                .split(":")
                                                .map(Number);
                                            const timeInMinutes =
                                                hours * 60 + minutes;

                                            if (shiftType === "day") {
                                                // Day shift: 07:01 to 18:59
                                                if (
                                                    timeInMinutes <= 420 ||
                                                    timeInMinutes >= 1140
                                                ) {
                                                    return; // Skip this entry for day shift
                                                }
                                            } else if (shiftType === "night") {
                                                // Night shift: 19:00 to 07:00
                                                if (
                                                    timeInMinutes > 420 &&
                                                    timeInMinutes < 1140
                                                ) {
                                                    return; // Skip this entry for night shift
                                                }
                                            }
                                        }
                                        const entrySimulator =
                                            entry.simulator || "Others";
                                        // Make sure the simulator exists in the list
                                        if (!tasksBySimulator[entrySimulator]) {
                                            tasksBySimulator[entrySimulator] =
                                                [];
                                        }
                                        // Also add the simulator to the list if it's not there
                                        if (
                                            !simulators.includes(entrySimulator)
                                        ) {
                                            simulators.push(entrySimulator);
                                        } // Load notes for this logbook entry - try multiple key formats for compatibility
                                        const logbookNoteKey =
                                            generateLogbookNoteKey(entry);
                                        let entryNotes =
                                            logbookNotes[logbookNoteKey] || []; // Fallback: try old key formats if no notes found with new stable key
                                        if (entryNotes.length === 0) {
                                            // Try with current text
                                            const legacyKeys1 =
                                                generateLegacyLogbookNoteKey(
                                                    entry,
                                                    entry.text
                                                );
                                            entryNotes =
                                                (legacyKeys1.simpleKey
                                                    ? logbookNotes[
                                                          legacyKeys1.simpleKey
                                                      ]
                                                    : []) ||
                                                logbookNotes[
                                                    legacyKeys1.textBasedKey
                                                ] ||
                                                [];

                                            // Try with originalText if available
                                            if (
                                                entryNotes.length === 0 &&
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
                                                        legacyKeys2.textBasedKey
                                                    ] ||
                                                    [];
                                            }
                                        }

                                        tasksBySimulator[entrySimulator].push({
                                            id: `entry-${
                                                entry.id || Math.random()
                                            }`,
                                            title:
                                                entry.title ||
                                                entry.text.substring(0, 50) +
                                                    (entry.text.length > 50
                                                        ? "..."
                                                        : ""),
                                            time: entry.time,
                                            date: entry.date, // Add the date property
                                            assignedTo: entry.author,
                                            status: entry.category,
                                            type: "logbook-entry",
                                            fullText: entry.text,
                                            description: entry.text, // Add description property for TaskDetailsModal
                                            category: entry.category,
                                            subcategory: entry.subcategory,
                                            extraDetail: entry.extraDetail,
                                            duration: entry.duration,
                                            simulator:
                                                entry.simulator ||
                                                entrySimulator,
                                            originalEntry: entry, // Keep reference to original entry for editing
                                            notes: entryNotes, // Add notes from localStorage
                                        });
                                    });

                                    return { tasksBySimulator, simulators };
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
                                                        {dayShiftTasks.length}{" "}
                                                        task
                                                    </span>
                                                </div>
                                            </div>
                                            {(() => {
                                                const {
                                                    tasksBySimulator,
                                                    simulators,
                                                } = groupTasksBySimulator(
                                                    dayShiftTasks,
                                                    "day"
                                                );
                                                return (
                                                    <div className="simulators-row flex flex-wrap justify-between gap-4 mb-4">
                                                        {simulators.map(
                                                            (simulator) => {
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
                                                        {nightShiftTasks.length}{" "}
                                                        task
                                                    </span>
                                                </div>
                                            </div>
                                            {(() => {
                                                const {
                                                    tasksBySimulator,
                                                    simulators,
                                                } = groupTasksBySimulator(
                                                    nightShiftTasks,
                                                    "night"
                                                );
                                                return (
                                                    <div className="simulators-row flex flex-wrap justify-between gap-4 mb-4">
                                                        {simulators.map(
                                                            (simulator) => {
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
                                        Testo della task
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
                                        {Object.keys(categories).map((c) => (
                                            <option key={c} value={c}>
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
                                                        e.target.value
                                                    )
                                                }
                                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                            >
                                                <option value="">
                                                    Seleziona sotto-categoria
                                                </option>
                                                {(
                                                    categories[category] || []
                                                ).map((sc) => (
                                                    <option key={sc} value={sc}>
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
                                        <option value="109FFS">109FFS</option>
                                        <option value="139#1">139#1</option>
                                        <option value="139#3">139#3</option>
                                        <option value="169">169</option>
                                        <option value="189">189</option>
                                        <option value="Others">Others</option>
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
                                                    setFormDate(e.target.value)
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
                                                    setFormTime(e.target.value)
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

                                <p className="text-gray-600">Filtro logbook</p>

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
                                                setSearch(e.target.value)
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
                                                <p className="p-0 m-0">Cerca</p>
                                            </>{" "}
                                        </button>
                                        {showFilterResults && (
                                            <button
                                                onClick={handleClearFilters}
                                                className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
                                            >
                                                Cancella
                                            </button>
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
                                            setFilterCategory(e.target.value)
                                        }
                                        className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                    >
                                        <option value="">
                                            Tutte le categorie
                                        </option>
                                        {Object.keys(categories).map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
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
                                            setFilterSubcategory(e.target.value)
                                        }
                                        className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none"
                                    >
                                        <option value="">
                                            Tutte le sottocategorie
                                        </option>
                                        {[
                                            ...new Set(
                                                Object.values(categories)
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
                                                            e.target.value
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
                                                            e.target.value
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
                onToggleTask={() => {}} // Placeholder - no task editing in logbook
                onDeleteTask={handleDeleteTask} // Allow deletion of logbook entries
                canToggleTask={canToggleTask}
                canDeleteTasks={canDeleteTasks}
                canEditDescription={canEditDescription}
                onEditDescription={openDescriptionModal}
                onSaveNote={handleSaveNote}
            />{" "}
            <DescriptionModal
                isOpen={descriptionModal.isOpen}
                onClose={closeDescriptionModal}
                onSave={handleSaveDescriptionForLogbook}
                currentDescription={descriptionModal.entry?.fullText || ""}
                currentSimulator={descriptionModal.entry?.simulator || ""}
                currentEmployee={descriptionModal.entry?.employee || ""}
                availableEmployees={[]}
                employeesLoading={false}
                isEditing={true}
            />
        </>
    );
}
