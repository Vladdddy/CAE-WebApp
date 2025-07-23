import React from "react";

const TaskTable = ({
    tasks = [],
    filteredTasks = [],
    showFilterResults = false,
    dayShiftTasks = [],
    nightShiftTasks = [],
    simulatorSchedules = {},
    selectedDate,
    selectedPeriod = "1",
    openTaskDetails,
    openScheduleModal,
    canModifySimulatorSchedules,
    getBorderColor,
    tasksListRef,
}) => {
    // Helper function to format date for display
    const formatDateForDisplay = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (dateStr === today.toISOString().split("T")[0]) {
            return `${dateStr} (Oggi)`;
        } else if (dateStr === yesterday.toISOString().split("T")[0]) {
            return `${dateStr} (Ieri)`;
        } else {
            return dateStr;
        }
    };

    // Helper function to render multiple days
    const renderMultipleDays = () => {
        // Helper function to get date range
        const getDateRange = (startDate, days) => {
            const dates = [];
            const start = new Date(startDate);

            for (let i = 0; i < days; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + i);
                dates.push(date.toISOString().split("T")[0]);
            }

            return dates; // Keep chronological order (oldest first)
        };

        // Get all dates in the selected period
        const allDates = getDateRange(selectedDate, parseInt(selectedPeriod));

        // Initialize tasksByDate with all dates in the range
        const tasksByDate = {};
        allDates.forEach((date) => {
            tasksByDate[date] = { day: [], night: [] };
        });

        // Combine day and night shift tasks and group by date
        [...dayShiftTasks, ...nightShiftTasks].forEach((task) => {
            // Only process tasks that are in our date range
            if (tasksByDate[task.date]) {
                const taskTime = task.time;
                if (!taskTime) {
                    tasksByDate[task.date].day.push(task);
                    return;
                }

                const [hours, minutes] = taskTime.split(":").map(Number);
                const timeInMinutes = hours * 60 + minutes;

                if (timeInMinutes > 420 && timeInMinutes < 1140) {
                    tasksByDate[task.date].day.push(task);
                } else if (timeInMinutes >= 1140 || timeInMinutes <= 420) {
                    tasksByDate[task.date].night.push(task);
                }
            }
        });

        // Use allDates instead of Object.keys to ensure we show all dates
        const sortedDates = allDates;

        return sortedDates.map((date) => {
            const dayTasks = tasksByDate[date].day;
            const nightTasks = tasksByDate[date].night;

            return (
                <div
                    key={date}
                    className="date-section border rounded-lg p-4 bg-gray-50 mb-8"
                >
                    {/* Date Header */}
                    <h3 className="text-sm font-medium text-gray-600 mb-8">
                        {new Date(date).toLocaleDateString("it-IT", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </h3>

                    {/* Day Shift for this date */}
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
                            </svg>
                            <h4 className="text-gray-600">Giorno</h4>
                            <span className="span">{dayTasks.length} task</span>
                        </div>
                    </div>
                    {dayTasks.length > 0 ? (
                        renderSimulatorSection(dayTasks, false)
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-xs">
                            Nessun task per il turno giorno
                        </div>
                    )}

                    <div className="separator mb-4"></div>

                    {/* Night Shift for this date */}
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
                            <h4 className="text-gray-600">Notte</h4>
                            <span className="span">
                                {nightTasks.length} task
                            </span>
                        </div>
                    </div>
                    {nightTasks.length > 0 ? (
                        renderSimulatorSection(nightTasks, true)
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-xs">
                            Nessun task per il turno notte
                        </div>
                    )}
                </div>
            );
        });
    };

    const simulators = [
        "FTD",
        "109FFS",
        "139#1",
        "139#3",
        "169",
        "189",
        "Others",
    ];

    const renderSimulatorSection = (sectionTasks, isNightShift = false) => {
        // Group tasks by simulator
        const tasksBySimulator = {};

        // Initialize each simulator group
        simulators.forEach((sim) => {
            tasksBySimulator[sim] = [];
        });

        // Group tasks by simulator
        sectionTasks.forEach((task) => {
            const simulator = task.simulator || "";
            if (simulators.slice(0, -1).includes(simulator)) {
                tasksBySimulator[simulator].push(task);
            } else {
                tasksBySimulator["Others"].push(task);
            }
        });

        return (
            <div className="simulator-container">
                <div className="simulators-row flex flex-wrap justify-between gap-4 mb-4">
                    {simulators.map((simulator) => {
                        const simulatorTasks = tasksBySimulator[simulator];

                        return (
                            <div
                                key={`${
                                    isNightShift ? "night-" : ""
                                }${simulator}`}
                                className="simulator-column flex-1 min-w-[120px]"
                            >
                                <div className="simulator-header flex flex-row items-center justify-center gap-2 mb-4">
                                    <p className="text-xs font-medium text-gray-600">
                                        {simulator}
                                        {simulatorSchedules[simulator] && (
                                            <span className="ml-2 bg-blue-100 p-1 rounded text-blue-600 text-xs">
                                                {
                                                    simulatorSchedules[
                                                        simulator
                                                    ].startTime
                                                }
                                                -
                                                {
                                                    simulatorSchedules[
                                                        simulator
                                                    ].endTime
                                                }
                                                {simulatorSchedules[simulator]
                                                    .selectedEmployee && (
                                                    <span className="ml-1">
                                                        (
                                                        {
                                                            simulatorSchedules[
                                                                simulator
                                                            ].selectedEmployee
                                                        }
                                                        )
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </p>
                                    {(() => {
                                        const today = new Date()
                                            .toISOString()
                                            .split("T")[0];
                                        const isToday = selectedDate === today;

                                        // Only show the plus SVG if user can modify simulator schedules (admin only)
                                        if (
                                            !canModifySimulatorSchedules ||
                                            !canModifySimulatorSchedules()
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                width="16"
                                                height="16"
                                                color={
                                                    isToday
                                                        ? "#3b82f6"
                                                        : "#9ca3af"
                                                }
                                                fill="none"
                                                className={
                                                    isToday
                                                        ? "cursor-pointer hover:scale-110 transition-transform"
                                                        : "cursor-not-allowed opacity-50"
                                                }
                                                onClick={() => {
                                                    if (
                                                        isToday &&
                                                        openScheduleModal
                                                    ) {
                                                        openScheduleModal(
                                                            simulator
                                                        );
                                                    }
                                                }}
                                                title={
                                                    isToday
                                                        ? "Modifica orari"
                                                        : "Puoi modificare gli orari solo per oggi"
                                                }
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
                                        );
                                    })()}
                                </div>
                                <div className="simulator-tasks space-y-2">
                                    {simulatorTasks.length === 0 ? (
                                        <div className="text-center py-2">
                                            <span className="text-xs text-gray-400 italic"></span>
                                        </div>
                                    ) : (
                                        simulatorTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="task-card-small p-2 rounded-xl border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                                style={{
                                                    border: `1px solid ${getBorderColor(
                                                        task.status
                                                    )}`,
                                                }}
                                                onClick={() =>
                                                    openTaskDetails(task)
                                                }
                                            >
                                                <div className="task-info h-full flex flex-col justify-between">
                                                    <p className="text-gray-900 font-bold text-xs leading-tight mb-1 overflow-hidden">
                                                        {task.title.length > 20
                                                            ? task.title.substring(
                                                                  0,
                                                                  20
                                                              ) + "..."
                                                            : task.title}
                                                    </p>
                                                    <div className="task-details text-xs text-gray-500 space-y-4">
                                                        <div className="text-xs">
                                                            {task.time ||
                                                                "Nessun orario"}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col gap-1">
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
                                                                            "12px",
                                                                    }}
                                                                >
                                                                    {
                                                                        task.status
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-gray-500 px-2">
                                                                    {
                                                                        task.assignedTo
                                                                    }
                                                                </span>
                                                            </div>
                                                            {task.notes &&
                                                                task.notes
                                                                    .length >
                                                                    0 && (
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
                                                                            {
                                                                                task
                                                                                    .notes
                                                                                    .length
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div
            ref={tasksListRef}
            className="tasks flex flex-col w-full border p-4 rounded-xl bg-white my-8 overflow-y-auto max-h-[80vh] flex-1 max-w-full"
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
                                {filteredTasks.length} task
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
                    <div className="flex flex-row items-center gap-16 mb-2">
                        <div className="flex items-center gap-2"></div>
                        <div className="flex flex-row justify-between items-center w-[80%]">
                            {/* Simulator headers will be displayed below with their tasks */}
                        </div>
                    </div>
                </>
            )}

            {showFilterResults ? (
                <>
                    <div className="separator w-full border-b border-gray-200 mb-4"></div>
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            Nessun task trovato con i filtri applicati
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
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
                                    <p className="text-gray-600 max-w-md font-bold text-sm">
                                        {task.title}
                                    </p>
                                    <div className="text-xs text-gray-500 capitalize">
                                        {task.date || "Nessuna data"} •{" "}
                                        {task.time || "Nessun orario"} •{" "}
                                        {task.assignedTo === "Non assegnare"
                                            ? "Non assegnato"
                                            : task.assignedTo}{" "}
                                        • {task.status}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </>
            ) : selectedPeriod !== "1" ? (
                // Multiple days view
                renderMultipleDays()
            ) : (
                // Single day view (original logic)
                <>
                    {/* Day Shift Section */}
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
                            </svg>
                            <h4 className="text-gray-600">Giorno</h4>
                            <span className="span">
                                {dayShiftTasks.length} task
                            </span>
                        </div>
                        <div className="flex flex-row justify-between items-center w-[80%]">
                            {/* Simulator headers will be displayed below with their tasks */}
                        </div>
                    </div>
                    {renderSimulatorSection(dayShiftTasks, false)}

                    {/* Night Section */}
                    <div className="separator w-full border-b border-gray-200 mt-6"></div>
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
                            <h4 className="text-gray-600">Notte</h4>
                            <span className="span">
                                {nightShiftTasks.length} task
                            </span>
                        </div>
                        <div className="flex flex-row justify-between items-center w-[80%]">
                            {/* Simulator headers will be displayed below with their tasks */}
                        </div>
                    </div>

                    {/* Night Shift Section */}
                    {renderSimulatorSection(nightShiftTasks, true)}
                </>
            )}
        </div>
    );
};

export default TaskTable;
