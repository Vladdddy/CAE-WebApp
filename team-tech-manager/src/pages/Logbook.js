import { useEffect, useState } from "react";
import "../styles/tasks.css";

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
    const [showFilterResults, setShowFilterResults] = useState(false);

    // Get current user's name from localStorage
    const currentUserName =
        localStorage.getItem("userName") || "Utente Sconosciuto";

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
                // Group tasks by simulator
                const tasksBySimulator = {};
                dailyTasks.forEach((task) => {
                    const simulator = task.simulator || "Nessun Simulatore";
                    if (!tasksBySimulator[simulator]) {
                        tasksBySimulator[simulator] = [];
                    }
                    tasksBySimulator[simulator].push(task);
                });

                // Render tasks grouped by simulator
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
                    pdfContent.appendChild(simulatorHeader);

                    // Add tasks for this simulator
                    tasksBySimulator[simulator].forEach((task, index) => {
                        const taskDiv = document.createElement("div");
                        taskDiv.style.marginBottom = "15px";
                        taskDiv.style.padding = "15px";
                        taskDiv.style.border = `2px solid ${getBorderColor(
                            task.status
                        )}`;
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

    return (
        <>
            <div className="flex gap-4 flex-col lg:flex-row justify-between max-w-full p-4">
                <div className="flex flex-col min-w-0 justify-start gap-8">
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
                        className="mb-8 border p-6 rounded-xl bg-white w-full max-w-2xl mx-auto"
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
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M3 17H9"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M18 17L21 17"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M15 7L21 7"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M6 7C6 6.06812 6 5.60218 6.15224 5.23463C6.35523 4.74458 6.74458 4.35523 7.23463 4.15224C7.60218 4 8.06812 4 9 4C9.93188 4 10.3978 4 10.7654 4.15224C11.2554 4.35523 11.6448 4.74458 11.8478 5.23463C12 5.60218 12 6.06812 12 7C12 7.93188 12 8.39782 11.8478 8.76537C11.6448 9.25542 11.2554 9.64477 10.7654 9.84776C10.3978 10 9.93188 10 9 10C8.06812 10 7.60218 10 7.23463 9.84776C6.74458 9.64477 6.35523 9.25542 6.15224 8.76537C6 8.39782 6 7.93188 6 7Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M12 17C12 16.0681 12 15.6022 12.1522 15.2346C12.3552 14.7446 12.7446 14.3552 13.2346 14.1522C13.6022 14 14.0681 14 15 14C15.9319 14 16.3978 14 16.7654 14.1522C17.2554 14.3552 17.6448 14.7446 17.8478 15.2346C18 15.6022 18 16.0681 18 17C18 17.9319 18 18.3978 17.8478 18.7654C17.6448 19.2554 17.2554 19.6448 16.7654 19.8478C16.3978 20 15.9319 20 15 20C14.0681 20 13.6022 20 13.2346 19.8478C12.7446 19.6448 12.3552 19.2554 12.1522 18.7654C12 18.3978 12 17.9319 12 17Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>
                            <p className="text-gray-600">Filtro logbook</p>
                        </div>

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
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={(e) =>
                                        e.key === "Enter" && handleSearch()
                                    }
                                    className="flex w-full border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tutte le categorie</option>
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
                                className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">
                                    Tutte le sottocategorie
                                </option>
                                {[
                                    ...new Set(
                                        Object.values(categories)
                                            .flat()
                                            .concat(troubleshootingDetails)
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
                                                setStartDate(e.target.value)
                                            }
                                            className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                setEndDate(e.target.value)
                                            }
                                            className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className="mb-8 border p-6 rounded-xl bg-white w-full max-w-2xl mx-auto"
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
                                ? "Modifica task"
                                : "Nuova task"}
                        </p>
                    </div>

                    <div className="separator"></div>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-2"
                    >
                        <label htmlFor="text" className="text-xs text-gray-500">
                            Testo della task
                        </label>
                        <textarea
                            id="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Aggiungi descrizione"
                            className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Seleziona categoria</option>
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
                                        setSubcategory(e.target.value)
                                    }
                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        Seleziona sotto-categoria
                                    </option>
                                    {(categories[category] || []).map((sc) => (
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
                                        setExtraDetail(e.target.value)
                                    }
                                    className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="border px-3 py-2 rounded text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="Durata (es. 1h30)"
                            className="border px-3 py-2 rounded mb-8 text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="mt-2 text-gray-600 underline hover:text-gray-800 transition-colors"
                            >
                                Annulla modifica
                            </button>
                        )}
                    </form>
                </div>{" "}
            </div>{" "}
            <div
                className="entries flex flex-col w-[44vw] border p-4 rounded-xl bg-white mb-8 overflow-y-auto max-h-[30vh] flex-1 max-w-full"
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
                    <p className="text-gray-600">
                        {showFilterResults ? (
                            <>
                                Risultato{" "}
                                <span className="span ml-1">
                                    {filteredEntries.length} entr
                                    {filteredEntries.length === 1 ? "y" : "ies"}
                                </span>
                            </>
                        ) : (
                            <>
                                Entries per oggi{" "}
                                <span className="span ml-1">
                                    {
                                        entries.filter((e) => e.date === date)
                                            .length
                                    }{" "}
                                    entr
                                    {entries.filter((e) => e.date === date)
                                        .length === 1
                                        ? "y"
                                        : "ies"}
                                </span>
                            </>
                        )}
                    </p>
                </div>
                <div className="separator w-full border-b border-gray-200"></div>

                {/* Entries display */}
                {showFilterResults ? (
                    // Show filtered results
                    filteredEntries.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            Nessuna entry trovata con i filtri applicati
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {filteredEntries.map((entry, index) => (
                                <li
                                    key={index}
                                    className="relative p-4 border rounded shadow bg-gray-50 hover:bg-gray-100"
                                >
                                    <div className="text-sm text-gray-600 mb-1">
                                        {entry.date} {entry.time} •{" "}
                                        {entry.duration} • {entry.author} •{" "}
                                        {entry.category}
                                        {entry.subcategory &&
                                            ` / ${entry.subcategory}`}
                                        {entry.extraDetail &&
                                            ` / ${entry.extraDetail}`}
                                    </div>
                                    <div>{entry.text}</div>
                                    <div className="absolute top-2 right-2 space-x-2">
                                        <button
                                            onClick={() =>
                                                handleEdit(
                                                    entries.indexOf(entry)
                                                )
                                            }
                                            className="text-blue-600 hover:underline"
                                        >
                                            Modifica
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(
                                                    entries.indexOf(entry)
                                                )
                                            }
                                            className="text-red-600 hover:underline"
                                        >
                                            Elimina
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )
                ) : // Show daily entries (original behavior)
                entries.filter((e) => e.date === date).length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                        Nessuna entry per questa data
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {entries
                            .filter((e) => e.date === date)
                            .map((entry, index) => (
                                <li
                                    key={index}
                                    className="relative p-4 border rounded shadow bg-gray-50 hover:bg-gray-100"
                                >
                                    <div className="text-sm text-gray-600 mb-1">
                                        {entry.date} {entry.time} •{" "}
                                        {entry.duration} • {entry.author} •{" "}
                                        {entry.category}
                                        {entry.subcategory &&
                                            ` / ${entry.subcategory}`}
                                        {entry.extraDetail &&
                                            ` / ${entry.extraDetail}`}
                                    </div>
                                    <div>{entry.text}</div>
                                    <div className="absolute top-2 right-2 space-x-2">
                                        <button
                                            onClick={() =>
                                                handleEdit(
                                                    entries.findIndex(
                                                        (e) => e === entry
                                                    )
                                                )
                                            }
                                            className="text-blue-600 hover:underline"
                                        >
                                            Modifica
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(
                                                    entries.findIndex(
                                                        (e) => e === entry
                                                    )
                                                )
                                            }
                                            className="text-red-600 hover:underline"
                                        >
                                            Elimina
                                        </button>
                                    </div>
                                </li>
                            ))}
                    </ul>
                )}
            </div>
        </>
    );
}
