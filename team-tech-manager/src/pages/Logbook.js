import { useEffect, useState } from "react";
import "../styles/tasks.css";
import Modal from "../components/Modal";
import TaskDetailsModal from "../components/TaskDetailsModal";
import html2pdf from "html2pdf.js";

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

    const [text, setText] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [extraDetail, setExtraDetail] = useState("");
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
    const [isTaskAccordionOpen, setIsTaskAccordionOpen] = useState(false);    // Task details modal state
    const [taskDetailsModal, setTaskDetailsModal] = useState({
        isOpen: false,
        task: null,
    });

    // Modal state for notifications
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
    });    // Get current user's name from localStorage
    const currentUserName =
        localStorage.getItem("userName") || "Utente Sconosciuto";

    // Modal functions
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
    };    const handleExportPDF = () => {
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

            // Get the entries to export (use filtered entries if filters are applied, otherwise use all entries)
            const entriesToExport = showFilterResults ? filteredEntries : entries;

            // Create a temporary div with clean styling for PDF
            const pdfContent = document.createElement("div");
            pdfContent.style.padding = "20px";
            pdfContent.style.fontFamily = "Arial, sans-serif";
            pdfContent.style.backgroundColor = "white";

            // Add title
            const title = document.createElement("h2");
            title.textContent = `Logbook per il ${formattedDate}`;
            title.style.marginBottom = "20px";
            title.style.color = "#333";
            title.style.borderBottom = "2px solid #3b82f6";
            title.style.paddingBottom = "10px";
            pdfContent.appendChild(title);
            
            if (entriesToExport.length === 0) {
                const noEntries = document.createElement("p");
                noEntries.textContent = "Nessuna voce per questa data";
                noEntries.style.color = "#666";
                noEntries.style.fontStyle = "italic";
                pdfContent.appendChild(noEntries);
            } else {
                // Group entries by category
                const entriesByCategory = {};
                entriesToExport.forEach((entry) => {
                    const category = entry.category || "Altri";
                    if (!entriesByCategory[category]) {
                        entriesByCategory[category] = [];
                    }
                    entriesByCategory[category].push(entry);
                });

                // Render entries grouped by category
                Object.keys(entriesByCategory).forEach((category) => {
                    // Add category header
                    const categoryHeader = document.createElement("h4");
                    categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                    categoryHeader.style.margin = "20px 0 10px 0";
                    categoryHeader.style.color = "#1f2937";
                    categoryHeader.style.fontSize = "18px";
                    categoryHeader.style.fontWeight = "bold";
                    categoryHeader.style.borderBottom = "1px solid #d1d5db";
                    categoryHeader.style.paddingBottom = "5px";
                    pdfContent.appendChild(categoryHeader);

                    // Add entries for this category
                    entriesByCategory[category].forEach((entry, index) => {
                        const entryDiv = document.createElement("div");
                        entryDiv.style.marginBottom = "15px";
                        entryDiv.style.padding = "15px";
                        entryDiv.style.border = "1px solid #d1d5db";
                        entryDiv.style.borderRadius = "8px";
                        entryDiv.style.backgroundColor = "#f9f9f9";

                        const entryHeader = document.createElement("h5");
                        entryHeader.textContent = `${index + 1}. ${entry.time || 'N/A'} - ${entry.author || 'N/A'}`;
                        entryHeader.style.margin = "0 0 8px 0";
                        entryHeader.style.color = "#333";
                        entryHeader.style.fontSize = "16px";
                        entryDiv.appendChild(entryHeader);

                        const entryText = document.createElement("p");
                        entryText.textContent = entry.text || '';
                        entryText.style.margin = "0 0 8px 0";
                        entryText.style.color = "#666";
                        entryText.style.fontSize = "14px";
                        entryDiv.appendChild(entryText);

                        if (entry.subcategory) {
                            const subcategoryText = document.createElement("p");
                            subcategoryText.textContent = `Sottocategoria: ${entry.subcategory}`;
                            subcategoryText.style.margin = "0";
                            subcategoryText.style.color = "#888";
                            subcategoryText.style.fontSize = "12px";
                            subcategoryText.style.fontStyle = "italic";
                            entryDiv.appendChild(subcategoryText);
                        }

                        if (entry.extraDetail) {
                            const extraDetailText = document.createElement("p");
                            extraDetailText.textContent = `Dettagli extra: ${entry.extraDetail}`;
                            extraDetailText.style.margin = "0";
                            extraDetailText.style.color = "#888";
                            extraDetailText.style.fontSize = "12px";
                            extraDetailText.style.fontStyle = "italic";
                            entryDiv.appendChild(extraDetailText);
                        }

                        pdfContent.appendChild(entryDiv);
                    });
                });
            }

            // Temporarily add to body
            document.body.appendChild(pdfContent);

            const opt = {
                margin: 0.5,
                filename: `logbook-${formattedDate.replace(/\//g, "-")}.pdf`,
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

        // Text search filter - comprehensive search like in Tasks.js
        if (searchTerm && searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (entry) =>
                    entry.text.toLowerCase().includes(searchLower) ||
                    entry.author.toLowerCase().includes(searchLower) ||
                    entry.category.toLowerCase().includes(searchLower) ||
                    (entry.subcategory &&
                        entry.subcategory
                            .toLowerCase()
                            .includes(searchLower)) ||
                    (entry.extraDetail &&
                        entry.extraDetail.toLowerCase().includes(searchLower))
            );
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

        return filtered;
    };

    const handleSearch = async () => {
        setIsSearching(true);
        setShowFilterResults(true);
        let filtered = [];

        // If date range is specified, search across that range
        if (startDate && endDate) {
            const allEntries = await loadEntriesFromRange();
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
        setText("");
        setAuthor(currentUserName);
        setCategory("");
        setSubcategory("");
        setExtraDetail("");
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
            date: formDate,
            time: formTime,
            duration,
        };

        const newEntries = [...entries];
        if (editIndex !== null) {
            newEntries[editIndex] = entry;
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
        setText(entry.text);
        setAuthor(entry.author);
        setCategory(entry.category);
        setSubcategory(entry.subcategory);
        setExtraDetail(entry.extraDetail || "");
        setFormDate(entry.date);
        setFormTime(entry.time);
        setDuration(entry.duration || "");
        setEditIndex(index);
    }; // Task details modal functions
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
    }; // Permission functions for TaskDetailsModal (read-only in logbook)
    const canToggleTask = (task) => false; // No task editing in logbook
    const canDeleteTasks = () => false; // No task deletion in logbook
    const canEditDescription = (task) => false; // No description editing in logbook

    // Function to handle saving notes for tasks
    const handleSaveNote = async (taskId, noteText) => {
        try {
            const noteData = {
                text: noteText,
                author: currentUserName,
                timestamp: new Date().toISOString(),
            };

            // For now, store notes in localStorage until backend endpoint is created
            const savedNotes = JSON.parse(
                localStorage.getItem("taskNotes") || "{}"
            );
            if (!savedNotes[taskId]) {
                savedNotes[taskId] = [];
            }
            savedNotes[taskId].push(noteData);
            localStorage.setItem("taskNotes", JSON.stringify(savedNotes));

            // Update the task in local state
            const updatedTasks = tasks.map((task) => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        notes: savedNotes[taskId],
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
            alert("Errore nel salvare la nota: " + error.message);
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
    };

    // Helper function to get border color based on task status
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
                // Load notes from localStorage and merge with tasks
                const savedNotes = JSON.parse(
                    localStorage.getItem("taskNotes") || "{}"
                );
                const tasksWithNotes = data.map((task) => ({
                    ...task,
                    notes: savedNotes[task.id] || [],
                }));

                setTasks(tasksWithNotes);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching tasks:", error);
                setLoading(false);
            });
    }, []);

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
                                            className="display-entry flex items-center gap-4 justify-between dashboard-content p-3 rounded mt-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                                            style={{
                                                border: `2px solid ${getCategoryBorderColor(
                                                    entry.category
                                                )}`,
                                            }}
                                        >
                                            <div className="entry-info">
                                                <p className="text-gray-600 max-w-md font-bold text-sm">
                                                    {entry.text}
                                                </p>
                                                <div className="text-xs text-gray-500 capitalize">
                                                    {entry.date} • {entry.time}{" "}
                                                    • {entry.duration} •{" "}
                                                    {entry.author} •{" "}
                                                    {entry.category}
                                                    {entry.subcategory &&
                                                        ` / ${entry.subcategory}`}
                                                    {entry.extraDetail &&
                                                        ` / ${entry.extraDetail}`}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() =>
                                                        handleEdit(
                                                            entries.findIndex(
                                                                (e) =>
                                                                    e === entry
                                                            )
                                                        )
                                                    }
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
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(
                                                            entries.findIndex(
                                                                (e) =>
                                                                    e === entry
                                                            )
                                                        )
                                                    }
                                                    className="text-red-600 hover:underline"
                                                >
                                                    <svg
                                                        className="elimina-icon"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        width="24"
                                                        height="24"
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

                                // If no entries and no tasks, show empty message
                                if (
                                    dateEntries.length === 0 &&
                                    dateTasks.length === 0
                                ) {
                                    return (
                                        <div className="text-center py-4 text-gray-400 text-sm">
                                            Nessuna entry o task per questa data
                                        </div>
                                    );
                                }

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
                                });

                                // Function to group tasks by simulator
                                const groupTasksBySimulator = (taskList) => {
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
                                    });

                                    return { tasksBySimulator, simulators };
                                };
                                return (
                                    <div className="combined-container space-y-6">
                                        {/* Day Shift Tasks Section */}
                                        {dayShiftTasks.length > 0 && (
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
                                                            dayShiftTasks
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
                                                                                        (
                                                                                            task
                                                                                        ) => (
                                                                                            <div
                                                                                                key={
                                                                                                    task.id
                                                                                                }
                                                                                                className="task-card-small p-2 rounded-xl border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                                                                                style={{
                                                                                                    border: `1px solid ${getBorderColor(
                                                                                                        task.status
                                                                                                    )}`,
                                                                                                }}
                                                                                                onClick={() =>
                                                                                                    openTaskDetails(
                                                                                                        task
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <div className="task-info h-full flex flex-col justify-between">
                                                                                                    <p className="text-gray-900 font-bold text-xs leading-tight mb-1 overflow-hidden">
                                                                                                        {task
                                                                                                            .title
                                                                                                            .length >
                                                                                                        20
                                                                                                            ? task.title.substring(
                                                                                                                  0,
                                                                                                                  20
                                                                                                              ) +
                                                                                                              "..."
                                                                                                            : task.title}
                                                                                                    </p>
                                                                                                    <div className="task-details text-xs text-gray-500 space-y-1">
                                                                                                        <div className="text-xs">
                                                                                                            {
                                                                                                                task.time
                                                                                                            }
                                                                                                        </div>
                                                                                                        <div className="flex items-center justify-between">
                                                                                                            <span className="text-xs text-gray-600">
                                                                                                                {
                                                                                                                    task.assignedTo
                                                                                                                }
                                                                                                            </span>
                                                                                                            <span
                                                                                                                className={`px-2 py-1 rounded text-xs ${
                                                                                                                    task.status ===
                                                                                                                    "completato"
                                                                                                                        ? "bg-green-100 text-green-600"
                                                                                                                        : task.status ===
                                                                                                                          "in corso"
                                                                                                                        ? "bg-yellow-100 text-yellow-600"
                                                                                                                        : task.status ===
                                                                                                                          "non completato"
                                                                                                                        ? "bg-red-100 text-red-600"
                                                                                                                        : "bg-gray-100 text-gray-600"
                                                                                                                }`}
                                                                                                                style={{
                                                                                                                    fontSize:
                                                                                                                        "10px",
                                                                                                                }}
                                                                                                            >
                                                                                                                {
                                                                                                                    task.status
                                                                                                                }
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
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
                                        )}

                                        {/* Night Shift Tasks Section */}
                                        {nightShiftTasks.length > 0 && (
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
                                                        </svg>
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
                                                            nightShiftTasks
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
                                                                                        (
                                                                                            task
                                                                                        ) => (
                                                                                            <div
                                                                                                key={
                                                                                                    task.id
                                                                                                }
                                                                                                className="task-card-small p-2 rounded-xl border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                                                                                style={{
                                                                                                    border: `1px solid ${getBorderColor(
                                                                                                        task.status
                                                                                                    )}`,
                                                                                                }}
                                                                                                onClick={() =>
                                                                                                    openTaskDetails(
                                                                                                        task
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <div className="task-info h-full flex flex-col justify-between">
                                                                                                    <p className="text-gray-900 font-bold text-xs leading-tight mb-1 overflow-hidden">
                                                                                                        {task
                                                                                                            .title
                                                                                                            .length >
                                                                                                        20
                                                                                                            ? task.title.substring(
                                                                                                                  0,
                                                                                                                  20
                                                                                                              ) +
                                                                                                              "..."
                                                                                                            : task.title}
                                                                                                    </p>
                                                                                                    <div className="task-details text-xs text-gray-500 space-y-1">
                                                                                                        <div className="text-xs">
                                                                                                            {
                                                                                                                task.time
                                                                                                            }
                                                                                                        </div>
                                                                                                        <div className="flex items-center justify-between">
                                                                                                            <span className="text-xs text-gray-600">
                                                                                                                {
                                                                                                                    task.assignedTo
                                                                                                                }
                                                                                                            </span>
                                                                                                            <span
                                                                                                                className={`px-2 py-1 rounded text-xs ${
                                                                                                                    task.status ===
                                                                                                                    "completato"
                                                                                                                        ? "bg-green-100 text-green-600"
                                                                                                                        : task.status ===
                                                                                                                          "in corso"
                                                                                                                        ? "bg-yellow-100 text-yellow-600"
                                                                                                                        : task.status ===
                                                                                                                          "non completato"
                                                                                                                        ? "bg-red-100 text-red-600"
                                                                                                                        : "bg-gray-100 text-gray-600"
                                                                                                                }`}
                                                                                                                style={{
                                                                                                                    fontSize:
                                                                                                                        "10px",
                                                                                                                }}
                                                                                                            >
                                                                                                                {
                                                                                                                    task.status
                                                                                                                }
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
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
                                        )}
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
                                                )}
                                            </select>
                                        </>
                                    )}
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
                                            placeholder="Cerca testo..."
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
                </div>
            </div>{" "}            <TaskDetailsModal
                isOpen={taskDetailsModal.isOpen}
                onClose={closeTaskDetails}
                task={taskDetailsModal.task}
                onToggleTask={() => {}} // Placeholder - no task editing in logbook
                onDeleteTask={() => {}} // Placeholder - no task deletion in logbook
                canToggleTask={canToggleTask}
                canDeleteTasks={canDeleteTasks}
                canEditDescription={canEditDescription}
                onEditDescription={() => {}} // Placeholder
                onSaveNote={handleSaveNote}
            />
            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onConfirm={modal.onConfirm}
            />
        </>
    );
}
