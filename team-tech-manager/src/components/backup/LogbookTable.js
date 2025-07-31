import React from "react";

const LogbookTable = ({
    entries = [],
    filteredEntries = [],
    showFilterResults = false,
    selectedDate,
    openTaskDetails,
    getCategoryBorderColor,
    generateLogbookNoteKey,
    logbookNotes = {},
}) => {
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

    // Filter entries for the selected date
    const dayEntries = entries.filter((entry) => entry.date === selectedDate);

    return (
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
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M8.99811 21.5001L8.99811 2.50006"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M21.4981 8.00006L2.49811 8.00006"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M21.4981 16.0001H2.49811"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
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
                        <>Tabella task</>
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
                    {filteredEntries.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            Nessuna entry trovata con i filtri applicati
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
                                <div className="entry-info">
                                    <p className="text-gray-600 max-w-md font-bold text-sm">
                                        {entry.title || entry.text}
                                    </p>
                                    <div className="text-xs text-gray-500 capitalize">
                                        {entry.date} • {entry.time} •{" "}
                                        {entry.duration} • {entry.author} •{" "}
                                        {entry.category}
                                        {entry.subcategory &&
                                            ` / ${entry.subcategory}`}
                                        {entry.extraDetail &&
                                            ` / ${entry.extraDetail}`}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            const taskEntry = {
                                                id: `logbook-${entry.date}-${entry.time}`,
                                                title:
                                                    entry.title ||
                                                    entry.text.substring(
                                                        0,
                                                        50
                                                    ) +
                                                        (entry.text.length > 50
                                                            ? "..."
                                                            : ""),
                                                description: entry.text,
                                                fullText: entry.text,
                                                assignedTo: entry.author,
                                                date: entry.date,
                                                time: entry.time,
                                                status: entry.category,
                                                category: entry.category,
                                                subcategory: entry.subcategory,
                                                extraDetail: entry.extraDetail,
                                                simulator:
                                                    entry.simulator || "Others",
                                                type: "logbook-entry",
                                                originalEntry: entry,
                                            };
                                            const logbookNoteKey =
                                                generateLogbookNoteKey(entry);
                                            taskEntry.notes =
                                                logbookNotes[logbookNoteKey] ||
                                                [];

                                            openTaskDetails(taskEntry);
                                        }}
                                        className="text-blue-600 hover:underline"
                                    >
                                        Visualizza
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </>
            ) : (
                <>
                    <div className="separator w-full border-b border-gray-200 mb-4"></div>
                    {dayEntries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Nessuna entry trovata per {selectedDate}
                        </div>
                    ) : (
                        dayEntries.map((entry, index) => (
                            <div
                                key={index}
                                className="display-entry flex items-center gap-4 justify-between dashboard-content p-3 rounded mt-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                                style={{
                                    border: `2px solid ${getCategoryBorderColor(
                                        entry.category
                                    )}`,
                                }}
                                onClick={() => {
                                    const taskEntry = {
                                        id: `logbook-${entry.date}-${entry.time}`,
                                        title:
                                            entry.title ||
                                            entry.text.substring(0, 50) +
                                                (entry.text.length > 50
                                                    ? "..."
                                                    : ""),
                                        description: entry.text,
                                        fullText: entry.text,
                                        assignedTo: entry.author,
                                        date: entry.date,
                                        time: entry.time,
                                        status: entry.category,
                                        category: entry.category,
                                        subcategory: entry.subcategory,
                                        extraDetail: entry.extraDetail,
                                        simulator: entry.simulator || "Others",
                                        type: "logbook-entry",
                                        originalEntry: entry,
                                    };
                                    const logbookNoteKey =
                                        generateLogbookNoteKey(entry);
                                    taskEntry.notes =
                                        logbookNotes[logbookNoteKey] || [];

                                    openTaskDetails(taskEntry);
                                }}
                            >
                                <div className="entry-info">
                                    <p className="text-gray-600 max-w-md font-bold text-sm">
                                        {entry.title || entry.text}
                                    </p>
                                    <div className="text-xs text-gray-500 capitalize">
                                        {entry.date} • {entry.time} •{" "}
                                        {entry.duration} • {entry.author} •{" "}
                                        {entry.category}
                                        {entry.subcategory &&
                                            ` / ${entry.subcategory}`}
                                        {entry.extraDetail &&
                                            ` / ${entry.extraDetail}`}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-blue-600 text-sm">
                                        Visualizza
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </>
            )}
        </div>
    );
};

export default LogbookTable;
