import React, { useState, useEffect, memo } from "react";
import "./Calendar.css";

const Calendar = memo(
    ({
        onDayClick,
        onMonthChange, // Add callback for month changes
        tasksData = [],
        entriesData = [],
        currentDate = new Date().toISOString().split("T")[0],
        type = "tasks", // 'tasks' or 'logbook'
    }) => {
        const [currentMonth, setCurrentMonth] = useState(new Date(currentDate));

        // Get days in current month
        const getDaysInMonth = (date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();

            const days = [];

            // Add days of the month starting from 1 (no empty cells)
            for (let day = 1; day <= daysInMonth; day++) {
                days.push(day);
            }

            return days;
        };

        // Count tasks/entries for a specific day
        const getCountForDay = (day) => {
            if (!day) return { tasks: 0, entries: 0, total: 0 };

            const year = currentMonth.getFullYear();
            const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
            const dayStr = String(day).padStart(2, "0");
            const dateStr = `${year}-${month}-${dayStr}`;

            if (type === "tasks") {
                const taskCount = tasksData.filter(
                    (task) => task.date === dateStr
                ).length;
                return { tasks: taskCount, entries: 0, total: taskCount };
            } else if (type === "logbook") {
                const taskCount = tasksData.filter(
                    (task) => task.date === dateStr
                ).length;
                const entryCount = entriesData.filter(
                    (entry) => entry.date === dateStr
                ).length;
                return {
                    tasks: taskCount,
                    entries: entryCount,
                    total: taskCount + entryCount,
                };
            } else {
                const entryCount = entriesData.filter(
                    (entry) => entry.date === dateStr
                ).length;
                return { tasks: 0, entries: entryCount, total: entryCount };
            }
        };

        // Handle day click
        const handleDayClick = (day) => {
            if (!day) return;

            const year = currentMonth.getFullYear();
            const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
            const dayStr = String(day).padStart(2, "0");
            const dateStr = `${year}-${month}-${dayStr}`;

            onDayClick(dateStr);
        };

        // Navigate months
        const goToPreviousMonth = () => {
            const newMonth = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() - 1,
                1
            );
            setCurrentMonth(newMonth);
            // Notify parent of month change
            if (onMonthChange) {
                const monthStr = `${newMonth.getFullYear()}-${String(
                    newMonth.getMonth() + 1
                ).padStart(2, "0")}-01`;
                onMonthChange(monthStr);
            }
        };

        const goToNextMonth = () => {
            const newMonth = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + 1,
                1
            );
            setCurrentMonth(newMonth);
            // Notify parent of month change
            if (onMonthChange) {
                const monthStr = `${newMonth.getFullYear()}-${String(
                    newMonth.getMonth() + 1
                ).padStart(2, "0")}-01`;
                onMonthChange(monthStr);
            }
        };

        const days = getDaysInMonth(currentMonth);

        // Handle month/year change from date input
        const handleDateInputChange = (e) => {
            const selectedDate = new Date(e.target.value + "-01");
            setCurrentMonth(selectedDate);
            // Notify parent of month change
            if (onMonthChange) {
                onMonthChange(e.target.value + "-01");
            }
        };

        // Format current month for date input (YYYY-MM format)
        const getCurrentMonthString = () => {
            const year = currentMonth.getFullYear();
            const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
            return `${year}-${month}`;
        };

        return (
            <div className="calendar-container bg-white border rounded-xl p-4 shadow-sm">
                {/* Calendar Header */}
                <div className="calendar-header flex justify-between items-center mb-4">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={getCurrentMonthString()}
                            onChange={handleDateInputChange}
                            className="text-lg font-semibold text-gray-800 bg-transparent border-0 text-center focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2 py-1"
                            style={{ width: "auto", minWidth: "140px" }}
                        />
                    </div>

                    <button
                        onClick={goToNextMonth}
                        className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>

                {/* Calendar Days */}
                <div className="calendar-grid">
                    {days.map((day) => {
                        const count = getCountForDay(day);
                        const isToday =
                            new Date().getDate() === day &&
                            new Date().getMonth() === currentMonth.getMonth() &&
                            new Date().getFullYear() ===
                                currentMonth.getFullYear();

                        return (
                            <div
                                key={day}
                                className={`calendar-day p-2 border rounded-md cursor-pointer transition-all duration-200 
                                ${
                                    isToday
                                        ? "bg-blue-100 border-blue-300"
                                        : "bg-gray-50 border-gray-200"
                                }
                                hover:bg-blue-50 hover:border-blue-300 flex flex-col items-center justify-center min-h-[80px]`}
                                onClick={() => handleDayClick(day)}
                            >
                                <span
                                    className={`text-sm font-medium ${
                                        isToday
                                            ? "text-blue-600"
                                            : "text-gray-700"
                                    }`}
                                >
                                    {day}
                                </span>
                                {count.total > 0 && (
                                    <div className="flex flex-col items-center gap-1">
                                        {type === "logbook" ? (
                                            <>
                                                {count.tasks > 0 && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
                                                        {count.tasks} task
                                                    </span>
                                                )}
                                                {count.entries > 0 && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
                                                        {count.entries}{" "}
                                                        {count.entries <= 99
                                                            ? "entry"
                                                            : "ent"}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span
                                                className={`text-xs mt-1 px-2 py-1 rounded-full 
                                            ${
                                                type === "tasks"
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-purple-100 text-purple-600"
                                            }`}
                                            >
                                                {count.total}{" "}
                                                {type === "tasks"
                                                    ? "task"
                                                    : count.total <= 99
                                                    ? "ent"
                                                    : "entry"}
                                                {count.total !== 1
                                                    ? type === "task"
                                                    : ""}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
);

export default Calendar;
