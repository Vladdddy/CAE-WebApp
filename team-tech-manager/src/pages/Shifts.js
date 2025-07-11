import { useEffect, useState, useRef, useMemo } from "react";
import html2pdf from "html2pdf.js";
import Modal from "../components/Modal";
import "../styles/shifts.css";

const API = process.env.REACT_APP_API_URL;
const adminShifts = ["O", "OP", "ON", "F", "M", "R", "C"];
const employeeShifts = ["D", "N", "F", "M", "R", "C"];
const shifts = ["O", "OP", "ON", "D", "N", "F", "M", "R", "C"]; // Combined for pattern display

// Helper function to get today's date in local timezone
const getTodayDateKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Helper function to get date key from a Date object (local timezone)
const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Helper function to get shift color
const getShiftColor = (shift) => {
    const colors = {
        O: "bg-green-100 text-green-800",
        OP: "bg-orange-100 text-orange-800",
        ON: "bg-purple-100 text-purple-800",
        D: "bg-green-100 text-green-800",
        N: "bg-blue-100 text-blue-800",
        F: "bg-yellow-100 text-yellow-800",
        M: "bg-red-100 text-red-800",
        R: "bg-slate-100 text-slate-800",
        C: "bg-cyan-100 text-cyan-800",
    };
    return colors[shift] || "bg-gray-100 text-gray-800";
};

function getMonthDays(year, month) {
    const days = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
}

export default function Shifts() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [days, setDays] = useState(getMonthDays(year, month));
    const [data, setData] = useState({});
    const [noteModal, setNoteModal] = useState({
        isOpen: false,
        name: "",
        dateKey: "",
        note: "",
    });
    const [viewNoteModal, setViewNoteModal] = useState({
        isOpen: false,
        name: "",
        dateKey: "",
        note: "",
    });
    const [users, setUsers] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [isHoursSummaryExpanded, setIsHoursSummaryExpanded] = useState(true);
    const [patternModal, setPatternModal] = useState({
        isOpen: false,
        selectedUsers: [],
        patternType: "admin",
        startDate: "",
    });
    const [draggedUser, setDraggedUser] = useState(null);
    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        message: "",
    });
    const [dragOverUser, setDragOverUser] = useState(null);
    const [employeeOrderKey, setEmployeeOrderKey] = useState(0);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalData, setOriginalData] = useState({});
    const tableRef = useRef();

    // Shift patterns
    const shiftPatterns = {
        admin: {
            name: "Admin Pattern",
            description: "",
            weekdayPattern: ["ON", "OP", "O", "ON", "OP"],
            weekendShift: "R",
            type: "weekday",
        },
        employee: {
            name: "Employee Pattern 1",
            description: "",
            pattern: [
                "D",
                "D",
                "D",
                "D",
                "R",
                "R",
                "R",
                "R",
                "N",
                "N",
                "N",
                "N",
                "R",
                "R",
                "R",
                "R",
            ],
            type: "cycle",
        },
        employee_night: {
            name: "Employee Pattern 2",
            description: "",
            pattern: [
                "N",
                "N",
                "N",
                "N",
                "R",
                "R",
                "R",
                "R",
                "D",
                "D",
                "D",
                "D",
                "R",
                "R",
                "R",
                "R",
            ],
            type: "cycle",
        },
    };

    // Get current user's role from JWT token
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
    const isAdmin = currentUser && currentUser.role === "admin";

    // Function to check if a user has admin role
    const isUserAdmin = (userName) => {
        const user = users.find((u) => u.name === userName);
        return user && user.role === "admin";
    };

    // Get names of active users (including admin users who should appear in shifts)
    const getShiftUsers = () => {
        const filteredUsers = users.filter(
            (user) =>
                user.active &&
                (user.role === "employee" ||
                    user.role === "admin" ||
                    user.role === "manager")
        );

        // Sort users: admin first, then manager, then employee
        const sortedUsers = filteredUsers.sort((a, b) => {
            const rolePriority = {
                admin: 1,
                manager: 2,
                employee: 3,
            };

            const aPriority = rolePriority[a.role] || 4;
            const bPriority = rolePriority[b.role] || 4;

            // If roles are different, sort by role priority (lower number = higher priority)
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // If roles are the same, sort alphabetically by name
            return a.name.localeCompare(b.name);
        });

        console.log("Filtered users:", filteredUsers);
        console.log("Sorted users:", sortedUsers);

        return sortedUsers.map((user) => user.name);
    };

    // Separate admins and employees for drag and drop
    const { admins, employees } = useMemo(() => {
        const filteredUsers = users.filter(
            (user) =>
                user.active &&
                (user.role === "employee" ||
                    user.role === "admin" ||
                    user.role === "manager")
        );

        const admins = filteredUsers
            .filter((user) => user.role === "admin")
            .map((user) => user.name);
        const employees = filteredUsers
            .filter((user) => user.role !== "admin")
            .map((user) => user.name);

        // Get custom order from localStorage or use default
        const savedOrder = localStorage.getItem(
            `employee-order-${year}-${month}`
        );
        let orderedEmployees = employees;

        if (savedOrder) {
            try {
                const parsedOrder = JSON.parse(savedOrder);
                // Filter to only include employees that still exist
                orderedEmployees = parsedOrder.filter((name) =>
                    employees.includes(name)
                );
                // Add any new employees that weren't in the saved order
                const newEmployees = employees.filter(
                    (name) => !orderedEmployees.includes(name)
                );
                orderedEmployees = [...orderedEmployees, ...newEmployees];
            } catch (e) {
                console.error("Error parsing saved employee order:", e);
            }
        }

        return { admins, employees: orderedEmployees };
    }, [users, year, month, employeeOrderKey]);

    // Calculate names dynamically based on users state - combine admins and employees
    const names = [...admins, ...employees];
    console.log("Current users:", users);
    console.log("Generated names:", names);

    useEffect(() => {
        setDays(getMonthDays(year, month));
        setEmployeeOrderKey(0); // Reset employee order when month changes
        const token = localStorage.getItem("authToken");

        // Fetch shifts data
        fetch(`${API}/api/shifts/${year}/${month + 1}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((json) => {
                setData(json);
                setOriginalData(json); // Store original data
                setHasUnsavedChanges(false); // Reset unsaved changes flag
            });

        // Fetch users data
        fetch(`${API}/api/users`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((json) => {
                console.log("Fetched users:", json);
                setUsers(json);
            })
            .catch((error) => console.error("Error fetching users:", error));
    }, [year, month]);

    // Add warning for unsaved changes when leaving page
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue =
                    "Hai modifiche non salvate. Sei sicuro di voler uscire?";
                return "Hai modifiche non salvate. Sei sicuro di voler uscire?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    const handleChange = (name, day, field, value) => {
        const dateKey = getDateKey(day);
        const updated = {
            ...data,
            [dateKey]: {
                ...data[dateKey],
                [name]: {
                    ...(data[dateKey]?.[name] || {}),
                    [field]: value,
                },
            },
        };
        setData(updated);
        setHasUnsavedChanges(true); // Mark as having unsaved changes
    };

    const saveChanges = async () => {
        const token = localStorage.getItem("authToken");
        try {
            const response = await fetch(
                `${API}/api/shifts/${year}/${month + 1}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data),
                }
            );

            if (response.ok) {
                setOriginalData(data); // Update original data with saved data
                setHasUnsavedChanges(false); // Reset unsaved changes flag
                setSuccessModal({
                    isOpen: true,
                    message: "Modifiche salvate con successo!",
                });
            } else {
                throw new Error("Errore durante il salvataggio");
            }
        } catch (error) {
            console.error("Error saving changes:", error);
            alert("Errore durante il salvataggio delle modifiche");
        }
    };

    const discardChanges = () => {
        setData(originalData); // Restore original data
        setHasUnsavedChanges(false); // Reset unsaved changes flag
    };

    const changeMonth = (offset) => {
        if (hasUnsavedChanges) {
            const confirmChange = window.confirm(
                "Hai modifiche non salvate. Sei sicuro di voler cambiare mese? Le modifiche andranno perse."
            );
            if (!confirmChange) {
                return;
            }
        }

        let newMonth = month + offset;
        let newYear = year;
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        setMonth(newMonth);
        setYear(newYear);
    };

    const handleExportPDF = () => {
        const element = tableRef.current;

        // Store original state
        const originalExpandedRows = new Set(expandedRows);

        // Collapse all rows for cleaner PDF
        setExpandedRows(new Set());

        // Wait for state update, then create vertical layout for PDF
        setTimeout(() => {
            // Create a new container for vertical layout
            const pdfContainer = document.createElement("div");
            pdfContainer.style.cssText = `
                font-family: system-ui, -apple-system, sans-serif;
                padding: 20px;
                background: white;
                max-width: 800px;
                margin: 0 auto;
            `;

            // Add title
            const title = document.createElement("h1");
            title.textContent = `Turni - ${new Date(
                year,
                month
            ).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}`;
            title.style.cssText = `
                text-align: center;
                margin-bottom: 30px;
                color: #1f2937;
                font-size: 24px;
                font-weight: bold;
            `;
            pdfContainer.appendChild(title);

            // Create sections for each user
            names.forEach((name, nameIndex) => {
                const userSection = document.createElement("div");
                userSection.style.cssText = `
                    margin-bottom: 40px;
                    page-break-inside: avoid;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    overflow: hidden;
                `;

                // User header
                const userHeader = document.createElement("div");
                userHeader.style.cssText = `
                    background: #f9fafb;
                    padding: 15px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    font-weight: bold;
                    font-size: 18px;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;

                // Add admin star if applicable
                if (isUserAdmin(name)) {
                    const star = document.createElement("span");
                    star.textContent = "⭐";
                    star.style.fontSize = "16px";
                    userHeader.appendChild(star);
                }

                const nameSpan = document.createElement("span");
                nameSpan.textContent = name;
                userHeader.appendChild(nameSpan);

                // Add hours calculation to PDF
                const hoursSpan = document.createElement("span");
                const userHours = calculateUserHours(name);
                hoursSpan.textContent = ` (${userHours}h/160h)`;
                hoursSpan.style.cssText = `
                    font-size: 14px;
                    margin-left: 8px;
                    color: ${userHours < 160 ? "#dc2626" : "#16a34a"};
                    font-weight: bold;
                `;
                userHeader.appendChild(hoursSpan);

                userSection.appendChild(userHeader);

                // Days table for this user
                const daysTable = document.createElement("table");
                daysTable.style.cssText = `
                    width: 100%;
                    border-collapse: collapse;
                `;

                // Create rows for each day
                days.forEach((day, dayIndex) => {
                    const dateKey = getDateKey(day);
                    const entry = data?.[dateKey]?.[name] || {};
                    const isToday = dateKey === getTodayDateKey();

                    const row = document.createElement("tr");
                    row.style.cssText = `
                        border-bottom: 1px solid #f3f4f6;
                        ${isToday ? "background-color: #dbeafe;" : ""}
                        ${
                            dayIndex % 2 === 0
                                ? "background-color: #f9fafb;"
                                : ""
                        }
                    `;

                    // Date cell
                    const dateCell = document.createElement("td");
                    dateCell.style.cssText = `
                        padding: 12px 20px;
                        font-weight: 500;
                        color: #374151;
                        width: 200px;
                        border-right: 1px solid #f3f4f6;
                    `;
                    dateCell.textContent = `${day.getDate()}/${
                        day.getMonth() + 1
                    }/${year}`;

                    // Day name
                    const dayName = day.toLocaleDateString("it-IT", {
                        weekday: "short",
                    });
                    const daySpan = document.createElement("span");
                    daySpan.style.cssText = `
                        color: #6b7280;
                        font-size: 12px;
                        margin-left: 8px;
                    `;
                    daySpan.textContent = `(${dayName})`;
                    dateCell.appendChild(daySpan);

                    row.appendChild(dateCell);

                    // Shift cell
                    const shiftCell = document.createElement("td");
                    shiftCell.style.cssText = `
                        padding: 12px 20px;
                        text-align: center;
                        width: 120px;
                        border-right: 1px solid #f3f4f6;
                    `;

                    const shiftDiv = document.createElement("div");
                    const shiftValue = entry.shift || "--";
                    shiftDiv.textContent = shiftValue;
                    shiftDiv.style.cssText = `
                        padding: 6px 12px;
                        border-radius: 6px;
                        font-weight: bold;
                        font-size: 14px;
                        display: inline-block;
                        min-width: 40px;
                    `;

                    // Apply shift colors
                    if (entry.shift) {
                        const colorClass = getShiftColor(entry.shift);
                        if (colorClass.includes("bg-yellow-100")) {
                            shiftDiv.style.backgroundColor = "#fef3c7";
                            shiftDiv.style.color = "#92400e";
                        } else if (colorClass.includes("bg-orange-100")) {
                            shiftDiv.style.backgroundColor = "#fed7aa";
                            shiftDiv.style.color = "#9a3412";
                        } else if (colorClass.includes("bg-purple-100")) {
                            shiftDiv.style.backgroundColor = "#e9d5ff";
                            shiftDiv.style.color = "#7c2d12";
                        } else if (colorClass.includes("bg-green-100")) {
                            shiftDiv.style.backgroundColor = "#dcfce7";
                            shiftDiv.style.color = "#166534";
                        } else if (colorClass.includes("bg-red-100")) {
                            shiftDiv.style.backgroundColor = "#fee2e2";
                            shiftDiv.style.color = "#991b1b";
                        } else if (colorClass.includes("bg-blue-100")) {
                            shiftDiv.style.backgroundColor = "#dbeafe";
                            shiftDiv.style.color = "#1e40af";
                        }
                    } else {
                        shiftDiv.style.backgroundColor = "#f3f4f6";
                        shiftDiv.style.color = "#6b7280";
                    }

                    shiftCell.appendChild(shiftDiv);
                    row.appendChild(shiftCell);

                    // Notes cell
                    const notesCell = document.createElement("td");
                    notesCell.style.cssText = `
                        padding: 12px 20px;
                        color: #6b7280;
                        font-size: 14px;
                    `;
                    notesCell.textContent = entry.note || "";
                    row.appendChild(notesCell);

                    daysTable.appendChild(row);
                });

                userSection.appendChild(daysTable);
                pdfContainer.appendChild(userSection);
            });

            // Create a temporary container for the PDF content
            const tempContainer = document.createElement("div");
            tempContainer.style.position = "fixed";
            tempContainer.style.top = "-9999px";
            tempContainer.style.left = "-9999px";
            tempContainer.appendChild(pdfContainer);
            document.body.appendChild(tempContainer);

            // Generate PDF from the vertical layout
            html2pdf()
                .from(pdfContainer)
                .set({
                    margin: 0.5,
                    filename: `turni-${year}-${month + 1}.pdf`,
                    html2canvas: {
                        scale: 1.5,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#ffffff",
                    },
                    jsPDF: {
                        unit: "in",
                        format: "a4",
                        orientation: "portrait",
                    },
                })
                .save()
                .then(() => {
                    // Clean up
                    document.body.removeChild(tempContainer);
                    // Restore original state
                    setExpandedRows(originalExpandedRows);
                })
                .catch(() => {
                    // Clean up even if there's an error
                    if (tempContainer.parentNode) {
                        document.body.removeChild(tempContainer);
                    }
                    setExpandedRows(originalExpandedRows);
                });
        }, 100);
    };

    const openNoteModal = (name, dateKey) => {
        const entry = data?.[dateKey]?.[name] || {};
        setNoteModal({
            isOpen: true,
            name,
            dateKey,
            note: entry.note || "",
        });
    };

    const closeNoteModal = () => {
        setNoteModal({ isOpen: false, name: "", dateKey: "", note: "" });
    };

    const saveNote = () => {
        if (noteModal.name && noteModal.dateKey) {
            const day = new Date(noteModal.dateKey);
            handleChange(noteModal.name, day, "note", noteModal.note);
        }
        closeNoteModal();
    };

    const openViewNoteModal = (name, dateKey, note) => {
        setViewNoteModal({
            isOpen: true,
            name,
            dateKey,
            note,
        });
    };

    const closeViewNoteModal = () => {
        setViewNoteModal({ isOpen: false, name: "", dateKey: "", note: "" });
    };

    const toggleRowExpansion = (name) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(name)) {
                newSet.delete(name);
            } else {
                newSet.add(name);
            }
            return newSet;
        });
    };

    const openPatternModal = () => {
        setPatternModal({
            isOpen: true,
            selectedUsers: [],
            patternType: "admin",
        });
    };

    const closePatternModal = () => {
        setPatternModal({
            isOpen: false,
            selectedUsers: [],
            patternType: "admin",
        });
    };

    const applyShiftPattern = () => {
        if (patternModal.selectedUsers.length === 0) {
            setSuccessModal({
                isOpen: true,
                message: "Seleziona almeno un utente",
            });
            return;
        }

        if (!patternModal.startDate) {
            setSuccessModal({
                isOpen: true,
                message: "Seleziona una data di inizio",
            });
            return;
        }

        const pattern = shiftPatterns[patternModal.patternType];
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const startDate = new Date(patternModal.startDate);

        // Create updated data structure
        const updatedData = { ...data };

        patternModal.selectedUsers.forEach((userName, userIndex) => {
            // Start from the selected date instead of the beginning of the month
            let currentDate = new Date(startDate);
            let dayCounter = 0; // Counter for cycle-based patterns

            while (currentDate <= monthEnd) {
                const dateKey = getDateKey(currentDate);
                const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                // Initialize date entry if it doesn't exist
                if (!updatedData[dateKey]) {
                    updatedData[dateKey] = {};
                }

                // Initialize user entry if it doesn't exist
                if (!updatedData[dateKey][userName]) {
                    updatedData[dateKey][userName] = {};
                }

                let shiftToAssign;
                let noteToAdd = "";

                if (pattern.type === "weekday") {
                    // Admin pattern: weekly-based with user offset
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        // Weekend
                        shiftToAssign = pattern.weekendShift;
                        noteToAdd = "Riposo";
                    } else {
                        // Weekday: calculate which calendar week we're in
                        // Get the Monday of the current date's week
                        const currentDateCopy = new Date(currentDate);
                        const dayOfWeekOffset =
                            currentDate.getDay() === 0
                                ? 6
                                : currentDate.getDay() - 1; // Convert Sunday=0 to Sunday=6, Monday=1 to Monday=0, etc.
                        currentDateCopy.setDate(
                            currentDate.getDate() - dayOfWeekOffset
                        );

                        // Get the Monday of the start date's week
                        const startDateCopy = new Date(startDate);
                        const startDayOfWeekOffset =
                            startDate.getDay() === 0
                                ? 6
                                : startDate.getDay() - 1;
                        startDateCopy.setDate(
                            startDate.getDate() - startDayOfWeekOffset
                        );

                        // Calculate weeks difference between the two Mondays
                        const weeksPassed = Math.floor(
                            (currentDateCopy - startDateCopy) /
                                (7 * 24 * 60 * 60 * 1000)
                        );

                        // Add user offset to ensure different users have different shifts
                        let userPatternIndex =
                            (weeksPassed + userIndex) %
                            pattern.weekdayPattern.length;

                        shiftToAssign =
                            pattern.weekdayPattern[userPatternIndex];
                    }
                } else if (pattern.type === "cycle") {
                    // Employee pattern: continuous cycle - all users get the same pattern
                    let userPatternIndex = dayCounter % pattern.pattern.length;
                    shiftToAssign = pattern.pattern[userPatternIndex];

                    // Add note for rest days
                    if (shiftToAssign === "R") {
                        noteToAdd = "Riposo";
                    }
                }

                updatedData[dateKey][userName] = {
                    ...updatedData[dateKey][userName],
                    shift: shiftToAssign,
                    note: noteToAdd,
                };

                currentDate.setDate(currentDate.getDate() + 1);
                dayCounter++; // Increment day counter for cycle patterns
            }
        });

        // Update local state
        setData(updatedData);
        setHasUnsavedChanges(true); // Mark as having unsaved changes

        setSuccessModal({
            isOpen: true,
            message: "Pattern applicato! Ricorda di salvare le modifiche.",
        });
        closePatternModal();
    };

    const toggleUserSelection = (userName) => {
        setPatternModal((prev) => ({
            ...prev,
            selectedUsers: prev.selectedUsers.includes(userName)
                ? prev.selectedUsers.filter((name) => name !== userName)
                : [...prev.selectedUsers, userName],
        }));
    };

    // Drag and drop functions for employee reordering
    const handleDragStart = (e, userName) => {
        // Only allow dragging employees, not admins
        if (isUserAdmin(userName)) {
            e.preventDefault();
            return;
        }
        setDraggedUser(userName);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, userName) => {
        e.preventDefault();
        // Only allow dropping on employees
        if (!isUserAdmin(userName)) {
            setDragOverUser(userName);
            e.dataTransfer.dropEffect = "move";
        }
    };

    const handleDragLeave = () => {
        setDragOverUser(null);
    };

    const handleDrop = (e, targetUserName) => {
        e.preventDefault();

        if (
            !draggedUser ||
            isUserAdmin(targetUserName) ||
            draggedUser === targetUserName
        ) {
            setDraggedUser(null);
            setDragOverUser(null);
            return;
        }

        // Reorder employees array
        const newEmployees = [...employees];
        const draggedIndex = newEmployees.indexOf(draggedUser);
        const targetIndex = newEmployees.indexOf(targetUserName);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove dragged item and insert at new position
            newEmployees.splice(draggedIndex, 1);
            newEmployees.splice(targetIndex, 0, draggedUser);

            // Save new order to localStorage
            localStorage.setItem(
                `employee-order-${year}-${month}`,
                JSON.stringify(newEmployees)
            );

            // Force re-render by updating the key
            setEmployeeOrderKey((prev) => prev + 1);
        }

        setDraggedUser(null);
        setDragOverUser(null);
    };

    const handleDragEnd = () => {
        setDraggedUser(null);
        setDragOverUser(null);
    };

    // Function to calculate total working hours for a user in the current month
    const calculateUserHours = (userName) => {
        let totalHours = 0;

        days.forEach((day) => {
            const dateKey = getDateKey(day);
            const entry = data?.[dateKey]?.[userName];

            if (entry && entry.shift) {
                const shift = entry.shift;
                // Count working shifts: exclude R=Riposo, F=Festa
                if (["O", "OP", "ON", "M", "C"].includes(shift)) {
                    totalHours += 8; // Admin shifts are 8 hours
                } else if (["D", "N"].includes(shift)) {
                    totalHours += 11; // Employee day/night shifts are 11 hours
                }
            }
        });

        return totalHours;
    };

    // Function to get hour display style
    const getHourDisplayStyle = (hours) => {
        const targetHours = 160;
        if (hours < targetHours) {
            return {
                color: "#dc2626", // red-600
                backgroundColor: "#dc262615", // red-200
                fontWeight: "bold",
            };
        }
        return {
            color: "#16a34a", // green-600
            backgroundColor: "#16a34a15", // green-200
            fontWeight: "bold",
        };
    };

    // Function to calculate shift counts for a specific day
    const calculateShiftCounts = (dateKey) => {
        const counts = { D: 0, N: 0 };

        // Both D and N counters: only count employees (exclude admins)

        // Count D shifts (only employees for day shifts)
        employees.forEach((userName) => {
            const entry = data?.[dateKey]?.[userName] || {};
            const shift = entry.shift;

            if (shift && (shift === "D" || shift === "O" || shift === "OP")) {
                counts.D++;
            }
        });

        // Count N shifts (only employees for night shifts)
        employees.forEach((userName) => {
            const entry = data?.[dateKey]?.[userName] || {};
            const shift = entry.shift;

            if (shift && (shift === "ON" || shift === "N")) {
                counts.N++;
            }
        });

        return counts;
    };

    return (
        <div className="flex gap-4 flex-col lg:flex-col justify-between max-w-full p-4">
            {/* Header Section */}
            <div className="flex flex-col min-w-0 justify-start">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="date-selector flex items-center justify-start gap-8 flex-wrap mb-4">
                        <button
                            onClick={() => changeMonth(-1)}
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
                            type="month"
                            value={`${year}-${String(month + 1).padStart(
                                2,
                                "0"
                            )}`}
                            onChange={(e) => {
                                if (hasUnsavedChanges) {
                                    const confirmChange = window.confirm(
                                        "Hai modifiche non salvate. Sei sicuro di voler cambiare mese? Le modifiche andranno perse."
                                    );
                                    if (!confirmChange) {
                                        return;
                                    }
                                }
                                const [newYear, newMonth] =
                                    e.target.value.split("-");
                                setYear(parseInt(newYear));
                                setMonth(parseInt(newMonth) - 1);
                            }}
                            className="px-3 py-2 rounded-md focus:border-blue-500 focus:ring-blue-500 text-md"
                        />
                        <button
                            onClick={() => changeMonth(1)}
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
                        {isAdmin && (
                            <>
                                <button
                                    onClick={openPatternModal}
                                    className="aggiungi-btn flex items-center gap-2 col-span-1 sm:col-span-2 border border-blue-600 px-6 py-2 rounded mr-2 hover:bg-blue-600 transition-colors group"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        className="text-blue-600 group-hover:text-white transition-colors"
                                        fill="none"
                                    >
                                        <path
                                            d="M18 2V4M6 2V4"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M11.9955 13H12.0045M11.9955 17H12.0045M15.991 13H16M8 13H8.00897M8 17H8.00897"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M3.5 8H20.5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M2.5 12.2432C2.5 7.88594 2.5 5.70728 3.75212 4.35364C5.00424 3 7.01949 3 11.05 3H12.95C16.9805 3 18.9958 3 20.2479 4.35364C21.5 5.70728 21.5 7.88594 21.5 12.2432V12.7568C21.5 17.1141 21.5 19.2927 20.2479 20.6464C18.9958 22 16.9805 22 12.95 22H11.05C7.01949 22 5.00424 22 3.75212 20.6464C2.5 19.2927 2.5 17.1141 2.5 12.7568V12.2432Z"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <p className="text-blue-600 group-hover:text-white transition-colors">
                                        Scegli Pattern
                                    </p>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="flex gap-2 mb-6 w-[50vw]">
                {["O", "OP", "ON", "D", "N", "F", "M", "R", "C"].map(
                    (shiftType) => {
                        const count = Object.values(data).reduce(
                            (total, dayData) => {
                                return (
                                    total +
                                    Object.values(dayData).filter(
                                        (entry) => entry.shift === shiftType
                                    ).length
                                );
                            },
                            0
                        );

                        const shiftNames = {
                            O: "Mattino",
                            OP: "Pomeriggio",
                            ON: "Notturno",
                            D: "Giorno",
                            N: "Notte",
                            F: "Ferie",
                            M: "Malattia",
                            R: "Riposo",
                            C: "Corso",
                        };

                        return (
                            <div
                                key={shiftType}
                                className="bg-white rounded-xl shadow-md border px-2 py-2 w-1/2"
                            >
                                <div className="flex flex-col items-center justify-between gap-2">
                                    <div
                                        className={`px-3 py-2 text-xs rounded-lg flex items-center justify-center ${getShiftColor(
                                            shiftType
                                        )}`}
                                    >
                                        <span className="font-bold ">
                                            {shiftType}
                                        </span>
                                    </div>

                                    <span
                                        className={`text-xs ${getShiftColor(
                                            shiftType
                                        )} bg-opacity-0`}
                                    >
                                        {shiftNames[shiftType] || shiftType}
                                    </span>
                                </div>
                            </div>
                        );
                    }
                )}
            </div>

            {/* Save Changes Section */}
            {hasUnsavedChanges && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="#d97706"
                                fill="none"
                            >
                                <path
                                    d="M12 7V13"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M12 16.01L12.01 15.9989"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>
                            <span className="text-yellow-800 font-medium">
                                Hai modifiche non salvate
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={discardChanges}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={saveChanges}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Salva modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shifts Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden w-[90vw]">
                <div ref={tableRef} className="shifts-container overflow-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-center text-xs text-gray-500 border-r border-gray-200">
                                    Turni
                                </th>
                                {days.map((d) => (
                                    <th
                                        key={d.toISOString()}
                                        className="px-3 py-4 text-center text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[100px]"
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-semibold text-xs">
                                                {d.getDate()}/{d.getMonth() + 1}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {/* Shift Counter Row */}
                            {admins.length > 0 && (
                                <tr className="bg-gray-100 border-gray-300">
                                    <td className="px-3 py-4 text-center text-xs font-medium text-gray-500 border-r border-gray-200">
                                        <div className="text-center">
                                            Conteggio Turni
                                        </div>
                                    </td>
                                    {days.map((d) => {
                                        const dateKey = getDateKey(d);
                                        const counts =
                                            calculateShiftCounts(dateKey);
                                        const isToday =
                                            dateKey === getTodayDateKey();

                                        return (
                                            <td
                                                key={dateKey}
                                                className={`px-3 py-3 text-center border-r border-gray-200 ${
                                                    isToday ? "bg-blue-50" : ""
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="grid grid-cols-2 gap-1 text-xs font-medium">
                                                        <div
                                                            className={`flex flex-col items-center rounded px-1 py-1 ${
                                                                counts.D < 2
                                                                    ? "bg-red-100 text-white"
                                                                    : "bg-sky-100"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`font-bold text-xs ${
                                                                    counts.D < 2
                                                                        ? "text-red-600"
                                                                        : "text-sky-700"
                                                                }`}
                                                            >
                                                                D
                                                            </span>
                                                            <span
                                                                className={`text-xs font-bold min-w-[20px] ${
                                                                    counts.D < 2
                                                                        ? "text-red-600"
                                                                        : "text-sky-800"
                                                                }`}
                                                            >
                                                                {counts.D}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={`flex flex-col items-center rounded px-1 py-1 ${
                                                                counts.N < 2
                                                                    ? "bg-red-100 text-white"
                                                                    : "bg-indigo-100"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`font-bold text-xs ${
                                                                    counts.N < 2
                                                                        ? "text-red-600"
                                                                        : "text-indigo-700"
                                                                }`}
                                                            >
                                                                N
                                                            </span>
                                                            <span
                                                                className={`text-xs font-bold min-w-[20px] ${
                                                                    counts.N < 2
                                                                        ? "text-red-600"
                                                                        : "text-indigo-800"
                                                                }`}
                                                            >
                                                                {counts.N}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}

                            {/* Render admin users first */}
                            {admins.map((name, nameIndex) => (
                                <tr
                                    key={name}
                                    className={`shift-row ${
                                        nameIndex % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                    } ${
                                        dragOverUser === name
                                            ? "bg-blue-100 border-blue-300"
                                            : ""
                                    } ${
                                        draggedUser === name ? "opacity-50" : ""
                                    }`}
                                    draggable={!isUserAdmin(name)}
                                    onDragStart={(e) =>
                                        handleDragStart(e, name)
                                    }
                                    onDragOver={(e) => handleDragOver(e, name)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, name)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <td className="gap-2 px-4 py-2 text-gray-700 border-r border-gray-200">
                                        <div className="flex flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                {!isUserAdmin(name) ? (
                                                    <div
                                                        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Trascina per riordinare"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="16"
                                                            height="16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M8 6.5C8 7.32843 7.32843 8 6.5 8C5.67157 8 5 7.32843 5 6.5C5 5.67157 5.67157 5 6.5 5C7.32843 5 8 5.67157 8 6.5Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M8 12C8 12.8284 7.32843 13.5 6.5 13.5C5.67157 13.5 5 12.8284 5 12C5 11.1716 5.67157 10.5 6.5 10.5C7.32843 10.5 8 11.1716 8 12Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M8 17.5C8 18.3284 7.32843 19 6.5 19C5.67157 19 5 18.3284 5 17.5C5 16.6716 5.67157 16 6.5 16C7.32843 16 8 16.6716 8 17.5Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M13.5 6.5C13.5 7.32843 12.8284 8 12 8C11.1716 8 10.5 7.32843 10.5 6.5C10.5 5.67157 11.1716 5 12 5C12.8284 5 13.5 5.67157 13.5 6.5Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5C12.8284 10.5 13.5 11.1716 13.5 12Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M13.5 17.5C13.5 18.3284 12.8284 19 12 19C11.1716 19 10.5 18.3284 10.5 17.5C10.5 16.6716 11.1716 16 12 16C12.8284 16 13.5 16.6716 13.5 17.5Z"
                                                                fill="currentColor"
                                                            />
                                                        </svg>
                                                    </div>
                                                ) : null}
                                                {isUserAdmin(name) ? (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        width="16"
                                                        height="16"
                                                        color="#222"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z"
                                                            stroke="currentColor"
                                                            stroke-width="1.5"
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                        ></path>
                                                    </svg>
                                                ) : null}
                                                <div className="text-xs">
                                                    {name}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    toggleRowExpansion(name)
                                                }
                                                className="flex items-center justify-center p-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                title={
                                                    expandedRows.has(name)
                                                        ? "Nascondi controlli"
                                                        : "Mostra controlli"
                                                }
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="16"
                                                    height="16"
                                                    color="#1051b9"
                                                    fill="none"
                                                    className={`transform transition-transform duration-200 ${
                                                        expandedRows.has(name)
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    <path
                                                        d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Expandable Hours Display */}
                                        <div
                                            className={`transition-all duration-500 ease-in-out ${
                                                expandedRows.has(name)
                                                    ? "max-h-20 opacity-100 mt-2"
                                                    : "max-h-0 opacity-0 overflow-hidden"
                                            }`}
                                        >
                                            {(() => {
                                                const userHours =
                                                    calculateUserHours(name);
                                                return (
                                                    <div
                                                        className="text-xs text-center px-2 py-1 rounded"
                                                        style={getHourDisplayStyle(
                                                            userHours
                                                        )}
                                                    >
                                                        {userHours}h/160h
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    {days.map((d) => {
                                        const dateKey = getDateKey(d);
                                        const entry =
                                            data?.[dateKey]?.[name] || {};
                                        const isToday =
                                            dateKey === getTodayDateKey();

                                        return (
                                            <td
                                                key={dateKey}
                                                className={`px-3 py-2 text-center border-r border-gray-200 relative ${
                                                    isToday ? "bg-blue-50" : ""
                                                }`}
                                            >
                                                <div className="space-y-2">
                                                    {isAdmin ? (
                                                        <select
                                                            value={
                                                                entry.shift ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleChange(
                                                                    name,
                                                                    d,
                                                                    "shift",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className={`shift-select w-full p-2 px-4 text-2xs font-bold rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 ${
                                                                entry.shift
                                                                    ? getShiftColor(
                                                                          entry.shift
                                                                      )
                                                                    : "bg-gray-100"
                                                            }`}
                                                            style={{
                                                                fontSize:
                                                                    "10px",
                                                            }}
                                                        >
                                                            <option
                                                                value=""
                                                                className="text-2xs"
                                                                style={{
                                                                    fontSize:
                                                                        "10px",
                                                                }}
                                                            >
                                                                --
                                                            </option>
                                                            {adminShifts.map(
                                                                (s) => (
                                                                    <option
                                                                        key={s}
                                                                        value={
                                                                            s
                                                                        }
                                                                        className="text-2xs"
                                                                        style={{
                                                                            fontSize:
                                                                                "10px",
                                                                        }}
                                                                    >
                                                                        {s}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    ) : (
                                                        <p
                                                            className={`w-full p-1 px-4 text-xs font-bold rounded-md border-gray-300 transition-colors duration-200 ${
                                                                entry.shift
                                                                    ? getShiftColor(
                                                                          entry.shift
                                                                      )
                                                                    : "bg-gray-50"
                                                            }`}
                                                        >
                                                            {entry.shift ||
                                                                "--"}
                                                        </p>
                                                    )}

                                                    <div
                                                        className={`flex justify-between items-center transition-all duration-500 ease-in-out ${
                                                            expandedRows.has(
                                                                name
                                                            )
                                                                ? "max-h-20 opacity-100"
                                                                : "max-h-0 opacity-0 overflow-hidden"
                                                        }`}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                isAdmin &&
                                                                openNoteModal(
                                                                    name,
                                                                    dateKey
                                                                )
                                                            }
                                                            disabled={!isAdmin}
                                                            className={`flex justify-center w-full p-1 rounded transition-colors ${
                                                                isAdmin
                                                                    ? "hover:bg-gray-100 cursor-pointer"
                                                                    : "opacity-60"
                                                            }`}
                                                            title={
                                                                isAdmin
                                                                    ? "Aggiungi nota"
                                                                    : "Solo gli admin possono aggiungere note"
                                                            }
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 24 24"
                                                                width="20"
                                                                height="20"
                                                                color="#1051b9"
                                                                fill="none"
                                                            >
                                                                <path
                                                                    d="M2.5 12.0001C2.5 7.52171 2.5 5.28254 3.89124 3.8913C5.28249 2.50005 7.52166 2.50005 12 2.50005C16.4783 2.50005 18.7175 2.50005 20.1088 3.8913C21.5 5.28254 21.5 7.52171 21.5 12.0001C21.5 16.4784 21.5 18.7176 20.1088 20.1088C18.7175 21.5001 16.4783 21.5001 12 21.5001C7.52166 21.5001 5.28249 21.5001 3.89124 20.1088C2.5 18.7176 2.5 16.4784 2.5 12.0001Z"
                                                                    stroke="currentColor"
                                                                    stroke-width="1.5"
                                                                    stroke-linecap="round"
                                                                    stroke-linejoin="round"
                                                                ></path>
                                                                <path
                                                                    d="M12 8.00005V16.0001M16 12.0001L8 12.0001"
                                                                    stroke="currentColor"
                                                                    stroke-width="1.5"
                                                                    stroke-linecap="round"
                                                                    stroke-linejoin="round"
                                                                ></path>
                                                            </svg>{" "}
                                                        </button>

                                                        {entry.note && (
                                                            <div className="flex items-center justify-center w-full">
                                                                <button
                                                                    onClick={() =>
                                                                        openViewNoteModal(
                                                                            name,
                                                                            dateKey,
                                                                            entry.note
                                                                        )
                                                                    }
                                                                    className="flex justify-center w-full hover:bg-gray-100 p-1 rounded transition-colors"
                                                                    title={`Visualizza nota`}
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 24 24"
                                                                        width="20"
                                                                        height="20"
                                                                        color="#1051b9"
                                                                        fill="none"
                                                                    >
                                                                        <path
                                                                            d="M12.8809 7.01656L17.6538 8.28825M11.8578 10.8134L14.2442 11.4492M11.9765 17.9664L12.9311 18.2208C15.631 18.9401 16.981 19.2998 18.0445 18.6893C19.108 18.0787 19.4698 16.7363 20.1932 14.0516L21.2163 10.2548C21.9398 7.57005 22.3015 6.22768 21.6875 5.17016C21.0735 4.11264 19.7235 3.75295 17.0235 3.03358L16.0689 2.77924C13.369 2.05986 12.019 1.70018 10.9555 2.31074C9.89196 2.9213 9.53023 4.26367 8.80678 6.94841L7.78366 10.7452C7.0602 13.4299 6.69848 14.7723 7.3125 15.8298C7.92652 16.8874 9.27651 17.2471 11.9765 17.9664Z"
                                                                            stroke="currentColor"
                                                                            stroke-width="1.5"
                                                                            stroke-linecap="round"
                                                                        ></path>
                                                                        <path
                                                                            d="M12 20.9462L11.0477 21.2055C8.35403 21.939 7.00722 22.3057 5.94619 21.6832C4.88517 21.0607 4.52429 19.692 3.80253 16.9546L2.78182 13.0833C2.06006 10.3459 1.69918 8.97718 2.31177 7.89892C2.84167 6.96619 4 7.00015 5.5 7.00003"
                                                                            stroke="currentColor"
                                                                            stroke-width="1.5"
                                                                            stroke-linecap="round"
                                                                        ></path>
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Render employee users */}
                            {employees.map((name, nameIndex) => (
                                <tr
                                    key={name}
                                    className={`shift-row ${
                                        nameIndex % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                    } ${
                                        dragOverUser === name
                                            ? "bg-blue-100 border-blue-300"
                                            : ""
                                    } ${
                                        draggedUser === name ? "opacity-50" : ""
                                    }`}
                                    draggable={!isUserAdmin(name)}
                                    onDragStart={(e) =>
                                        handleDragStart(e, name)
                                    }
                                    onDragOver={(e) => handleDragOver(e, name)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, name)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <td className="gap-2 px-4 py-2 text-gray-700 border-r border-gray-200">
                                        <div className="flex flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                {!isUserAdmin(name) ? (
                                                    <div
                                                        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Trascina per riordinare"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="16"
                                                            height="16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M8 6.5C8 7.32843 7.32843 8 6.5 8C5.67157 8 5 7.32843 5 6.5C5 5.67157 5.67157 5 6.5 5C7.32843 5 8 5.67157 8 6.5Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M8 12C8 12.8284 7.32843 13.5 6.5 13.5C5.67157 13.5 5 12.8284 5 12C5 11.1716 5.67157 10.5 6.5 10.5C7.32843 10.5 8 11.1716 8 12Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M8 17.5C8 18.3284 7.32843 19 6.5 19C5.67157 19 5 18.3284 5 17.5C5 16.6716 5.67157 16 6.5 16C7.32843 16 8 16.6716 8 17.5Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M13.5 6.5C13.5 7.32843 12.8284 8 12 8C11.1716 8 10.5 7.32843 10.5 6.5C10.5 5.67157 11.1716 5 12 5C12.8284 5 13.5 5.67157 13.5 6.5Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M13.5 12C13.5 12.8284 12.8284 13.5 12 13.5C11.1716 13.5 10.5 12.8284 10.5 12C10.5 11.1716 11.1716 10.5 12 10.5C12.8284 10.5 13.5 11.1716 13.5 12Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                d="M13.5 17.5C13.5 18.3284 12.8284 19 12 19C11.1716 19 10.5 18.3284 10.5 17.5C10.5 16.6716 11.1716 16 12 16C12.8284 16 13.5 16.6716 13.5 17.5Z"
                                                                fill="currentColor"
                                                            />
                                                        </svg>
                                                    </div>
                                                ) : null}
                                                {isUserAdmin(name) ? (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        width="16"
                                                        height="16"
                                                        color="#222"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z"
                                                            stroke="currentColor"
                                                            stroke-width="1.5"
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                        ></path>
                                                    </svg>
                                                ) : null}
                                                <div className="text-xs">
                                                    {name}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    toggleRowExpansion(name)
                                                }
                                                className="flex items-center justify-center p-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                title={
                                                    expandedRows.has(name)
                                                        ? "Nascondi controlli"
                                                        : "Mostra controlli"
                                                }
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="16"
                                                    height="16"
                                                    color="#1051b9"
                                                    fill="none"
                                                    className={`transform transition-transform duration-200 ${
                                                        expandedRows.has(name)
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    <path
                                                        d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Expandable Hours Display */}
                                        <div
                                            className={`transition-all duration-500 ease-in-out ${
                                                expandedRows.has(name)
                                                    ? "max-h-20 opacity-100 mt-2"
                                                    : "max-h-0 opacity-0 overflow-hidden"
                                            }`}
                                        >
                                            {(() => {
                                                const userHours =
                                                    calculateUserHours(name);
                                                return (
                                                    <div
                                                        className="text-xs text-center px-2 py-1 rounded"
                                                        style={getHourDisplayStyle(
                                                            userHours
                                                        )}
                                                    >
                                                        {userHours}h/160h
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    {days.map((d) => {
                                        const dateKey = getDateKey(d);
                                        const entry =
                                            data?.[dateKey]?.[name] || {};
                                        const isToday =
                                            dateKey === getTodayDateKey();

                                        return (
                                            <td
                                                key={dateKey}
                                                className={`px-3 py-4 text-center border-r border-gray-200 relative ${
                                                    isToday ? "bg-blue-50" : ""
                                                }`}
                                            >
                                                <div className="space-y-2">
                                                    {isAdmin ? (
                                                        <select
                                                            value={
                                                                entry.shift ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleChange(
                                                                    name,
                                                                    d,
                                                                    "shift",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className={`shift-select w-full p-2 px-4 text-2xs font-bold rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 ${
                                                                entry.shift
                                                                    ? getShiftColor(
                                                                          entry.shift
                                                                      )
                                                                    : "bg-gray-100"
                                                            }`}
                                                            style={{
                                                                fontSize:
                                                                    "10px",
                                                            }}
                                                        >
                                                            <option
                                                                value=""
                                                                className="text-2xs"
                                                                style={{
                                                                    fontSize:
                                                                        "10px",
                                                                }}
                                                            >
                                                                --
                                                            </option>
                                                            {employeeShifts.map(
                                                                (s) => (
                                                                    <option
                                                                        key={s}
                                                                        value={
                                                                            s
                                                                        }
                                                                        className="text-2xs"
                                                                        style={{
                                                                            fontSize:
                                                                                "10px",
                                                                        }}
                                                                    >
                                                                        {s}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    ) : (
                                                        <p
                                                            className={`w-full p-1 px-4 text-xs font-bold rounded-md border-gray-300 transition-colors duration-200 ${
                                                                entry.shift
                                                                    ? getShiftColor(
                                                                          entry.shift
                                                                      )
                                                                    : "bg-gray-50"
                                                            }`}
                                                        >
                                                            {entry.shift ||
                                                                "--"}
                                                        </p>
                                                    )}

                                                    <div
                                                        className={`flex justify-between items-center transition-all duration-500 ease-in-out ${
                                                            expandedRows.has(
                                                                name
                                                            )
                                                                ? "max-h-20 opacity-100"
                                                                : "max-h-0 opacity-0 overflow-hidden"
                                                        }`}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                isAdmin &&
                                                                openNoteModal(
                                                                    name,
                                                                    dateKey
                                                                )
                                                            }
                                                            disabled={!isAdmin}
                                                            className={`flex justify-center w-full p-1 rounded transition-colors ${
                                                                isAdmin
                                                                    ? "hover:bg-gray-100 cursor-pointer"
                                                                    : "opacity-60"
                                                            }`}
                                                            title={
                                                                isAdmin
                                                                    ? "Aggiungi nota"
                                                                    : "Solo gli admin possono aggiungere note"
                                                            }
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 24 24"
                                                                width="20"
                                                                height="20"
                                                                color="#1051b9"
                                                                fill="none"
                                                            >
                                                                <path
                                                                    d="M2.5 12.0001C2.5 7.52171 2.5 5.28254 3.89124 3.8913C5.28249 2.50005 7.52166 2.50005 12 2.50005C16.4783 2.50005 18.7175 2.50005 20.1088 3.8913C21.5 5.28254 21.5 7.52171 21.5 12.0001C21.5 16.4784 21.5 18.7176 20.1088 20.1088C18.7175 21.5001 16.4783 21.5001 12 21.5001C7.52166 21.5001 5.28249 21.5001 3.89124 20.1088C2.5 18.7176 2.5 16.4784 2.5 12.0001Z"
                                                                    stroke="currentColor"
                                                                    stroke-width="1.5"
                                                                    stroke-linecap="round"
                                                                    stroke-linejoin="round"
                                                                ></path>
                                                                <path
                                                                    d="M12 8.00005V16.0001M16 12.0001L8 12.0001"
                                                                    stroke="currentColor"
                                                                    stroke-width="1.5"
                                                                    stroke-linecap="round"
                                                                    stroke-linejoin="round"
                                                                ></path>
                                                            </svg>{" "}
                                                        </button>

                                                        {entry.note && (
                                                            <div className="flex items-center justify-center w-full">
                                                                <button
                                                                    onClick={() =>
                                                                        openViewNoteModal(
                                                                            name,
                                                                            dateKey,
                                                                            entry.note
                                                                        )
                                                                    }
                                                                    className="flex justify-center w-full hover:bg-gray-100 p-1 rounded transition-colors"
                                                                    title={`Visualizza nota`}
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 24 24"
                                                                        width="20"
                                                                        height="20"
                                                                        color="#1051b9"
                                                                        fill="none"
                                                                    >
                                                                        <path
                                                                            d="M12.8809 7.01656L17.6538 8.28825M11.8578 10.8134L14.2442 11.4492M11.9765 17.9664L12.9311 18.2208C15.631 18.9401 16.981 19.2998 18.0445 18.6893C19.108 18.0787 19.4698 16.7363 20.1932 14.0516L21.2163 10.2548C21.9398 7.57005 22.3015 6.22768 21.6875 5.17016C21.0735 4.11264 19.7235 3.75295 17.0235 3.03358L16.0689 2.77924C13.369 2.05986 12.019 1.70018 10.9555 2.31074C9.89196 2.9213 9.53023 4.26367 8.80678 6.94841L7.78366 10.7452C7.0602 13.4299 6.69848 14.7723 7.3125 15.8298C7.92652 16.8874 9.27651 17.2471 11.9765 17.9664Z"
                                                                            stroke="currentColor"
                                                                            stroke-width="1.5"
                                                                            stroke-linecap="round"
                                                                        ></path>
                                                                        <path
                                                                            d="M12 20.9462L11.0477 21.2055C8.35403 21.939 7.00722 22.3057 5.94619 21.6832C4.88517 21.0607 4.52429 19.692 3.80253 16.9546L2.78182 13.0833C2.06006 10.3459 1.69918 8.97718 2.31177 7.89892C2.84167 6.96619 4 7.00015 5.5 7.00003"
                                                                            stroke="currentColor"
                                                                            stroke-width="1.5"
                                                                            stroke-linecap="round"
                                                                        ></path>
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hours Summary Section */}
            <div className="bg-white rounded-xl shadow-sm border mb-6 w-1/2">
                {/* Title/Header */}
                <div
                    className="p-4 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-50 transition-colors duration-150"
                    onClick={() =>
                        setIsHoursSummaryExpanded(!isHoursSummaryExpanded)
                    }
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-md text-gray-600">
                            Riepilogo Ore Mensili
                        </h3>
                        <svg
                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                                isHoursSummaryExpanded
                                    ? "transform rotate-180"
                                    : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>

                {/* Collapsible Content */}
                {isHoursSummaryExpanded && (
                    <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {names.map((name) => {
                                const userHours = calculateUserHours(name);
                                const isUnderTarget = userHours < 160;
                                return (
                                    <div
                                        key={name}
                                        className="flex flex-col items-center p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {isUserAdmin(name) && (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="16"
                                                    height="16"
                                                    color="#fbbf24"
                                                    fill="currentColor"
                                                >
                                                    <path d="M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z" />
                                                </svg>
                                            )}
                                            <span className="text-xs font-medium text-gray-900">
                                                {name}
                                            </span>
                                        </div>
                                        <div className="text-center">
                                            <span
                                                className="text-lg font-bold"
                                                style={{
                                                    color: isUnderTarget
                                                        ? "#dc2626"
                                                        : "#16a34a",
                                                }}
                                            >
                                                {userHours}h
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                /160h
                                            </span>
                                        </div>
                                        {isUnderTarget && (
                                            <div className="text-xs text-red-600 mt-1 text-center">
                                                Mancano {160 - userHours}h
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Note Modal */}
            {noteModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Aggiungi Nota
                            </h3>
                            <button
                                onClick={closeNoteModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                {noteModal.name} -{" "}
                                {new Date(noteModal.dateKey).toLocaleDateString(
                                    "it-IT"
                                )}
                            </p>
                            <textarea
                                placeholder="Inserisci note, orari o altre informazioni..."
                                value={noteModal.note}
                                onChange={(e) =>
                                    setNoteModal((prev) => ({
                                        ...prev,
                                        note: e.target.value,
                                    }))
                                }
                                className="w-full border border-gray-300 rounded-md p-3 focus:border-blue-500 focus:ring-blue-500 resize-none"
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeNoteModal}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={saveNote}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Note Modal */}
            {viewNoteModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Nota
                            </h3>
                            <button
                                onClick={closeViewNoteModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-3">
                                {viewNoteModal.name} -{" "}
                                {new Date(
                                    viewNoteModal.dateKey
                                ).toLocaleDateString("it-IT")}
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 min-h-[100px]">
                                <p className="text-gray-800 whitespace-pre-wrap">
                                    {viewNoteModal.note}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={closeViewNoteModal}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Ok
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pattern Modal */}
            {patternModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Applica Pattern Turni
                            </h3>
                            <button
                                onClick={closePatternModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Pattern Type Selection */}
                        <div className="mb-6">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="relative">
                                    <input
                                        type="radio"
                                        id="admin-pattern"
                                        name="patternType"
                                        value="admin"
                                        checked={
                                            patternModal.patternType === "admin"
                                        }
                                        onChange={(e) =>
                                            setPatternModal((prev) => ({
                                                ...prev,
                                                patternType: e.target.value,
                                            }))
                                        }
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="admin-pattern"
                                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            patternModal.patternType === "admin"
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium text-gray-900">
                                                    {shiftPatterns.admin.name}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {
                                                        shiftPatterns.admin
                                                            .description
                                                    }
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    {shiftPatterns.admin.weekdayPattern.map(
                                                        (shift, index) => (
                                                            <span
                                                                key={index}
                                                                className={`px-2 py-1 text-xs rounded ${getShiftColor(
                                                                    shift
                                                                )}`}
                                                            >
                                                                {shift}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 ${
                                                    patternModal.patternType ===
                                                    "admin"
                                                        ? "border-green-500 bg-green-500"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {patternModal.patternType ===
                                                    "admin" && (
                                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        type="radio"
                                        id="employee-pattern"
                                        name="patternType"
                                        value="employee"
                                        checked={
                                            patternModal.patternType ===
                                            "employee"
                                        }
                                        onChange={(e) =>
                                            setPatternModal((prev) => ({
                                                ...prev,
                                                patternType: e.target.value,
                                            }))
                                        }
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="employee-pattern"
                                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            patternModal.patternType ===
                                            "employee"
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium text-gray-900">
                                                    {
                                                        shiftPatterns.employee
                                                            .name
                                                    }
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {
                                                        shiftPatterns.employee
                                                            .description
                                                    }
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    {shiftPatterns.employee.pattern.map(
                                                        (shift, index) => (
                                                            <span
                                                                key={index}
                                                                className={`px-2 py-1 text-xs rounded ${getShiftColor(
                                                                    shift
                                                                )}`}
                                                            >
                                                                {shift}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 ${
                                                    patternModal.patternType ===
                                                    "employee"
                                                        ? "border-blue-500 bg-blue-500"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {patternModal.patternType ===
                                                    "employee" && (
                                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        type="radio"
                                        id="employee-night-pattern"
                                        name="patternType"
                                        value="employee_night"
                                        checked={
                                            patternModal.patternType ===
                                            "employee_night"
                                        }
                                        onChange={(e) =>
                                            setPatternModal((prev) => ({
                                                ...prev,
                                                patternType: e.target.value,
                                            }))
                                        }
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="employee-night-pattern"
                                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            patternModal.patternType ===
                                            "employee_night"
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium text-gray-900">
                                                    {
                                                        shiftPatterns
                                                            .employee_night.name
                                                    }
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {
                                                        shiftPatterns
                                                            .employee_night
                                                            .description
                                                    }
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    {shiftPatterns.employee_night.pattern.map(
                                                        (shift, index) => (
                                                            <span
                                                                key={index}
                                                                className={`px-2 py-1 text-xs rounded ${getShiftColor(
                                                                    shift
                                                                )}`}
                                                            >
                                                                {shift}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 ${
                                                    patternModal.patternType ===
                                                    "employee_night"
                                                        ? "border-purple-500 bg-purple-500"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {patternModal.patternType ===
                                                    "employee_night" && (
                                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Start Date Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dal giorno
                            </label>
                            <input
                                type="date"
                                value={patternModal.startDate}
                                onChange={(e) =>
                                    setPatternModal((prev) => ({
                                        ...prev,
                                        startDate: e.target.value,
                                    }))
                                }
                                min={`${year}-${String(month + 1).padStart(
                                    2,
                                    "0"
                                )}-01`}
                                max={`${year}-${String(month + 1).padStart(
                                    2,
                                    "0"
                                )}-${String(
                                    new Date(year, month + 1, 0).getDate()
                                ).padStart(2, "0")}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Seleziona il giorno da cui iniziare ad applicare
                                il pattern
                            </p>
                        </div>

                        {/* User Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Seleziona Utenti (
                                {patternModal.selectedUsers.length} selezionati)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                {names.map((name) => {
                                    const user = users.find(
                                        (u) => u.name === name
                                    );
                                    const isSelected =
                                        patternModal.selectedUsers.includes(
                                            name
                                        );

                                    return (
                                        <div
                                            key={name}
                                            onClick={() =>
                                                toggleUserSelection(name)
                                            }
                                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-500"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <svg
                                                        className="w-2.5 h-2.5 text-white"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {user &&
                                                    user.role === "admin" && (
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="12"
                                                            height="12"
                                                            color="#fbbf24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z" />
                                                        </svg>
                                                    )}
                                                <span className="text-sm font-medium text-gray-700">
                                                    {name}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Selection Buttons */}
                        <div className="mb-6">
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => {
                                        const adminUsers = names.filter(
                                            (name) => {
                                                const user = users.find(
                                                    (u) => u.name === name
                                                );
                                                return (
                                                    user &&
                                                    user.role === "admin"
                                                );
                                            }
                                        );
                                        setPatternModal((prev) => ({
                                            ...prev,
                                            selectedUsers: adminUsers,
                                            patternType: "admin",
                                        }));
                                    }}
                                    className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
                                >
                                    Tutti Admin
                                </button>
                                <button
                                    onClick={() => {
                                        const employeeUsers = names.filter(
                                            (name) => {
                                                const user = users.find(
                                                    (u) => u.name === name
                                                );
                                                return (
                                                    user &&
                                                    user.role === "employee"
                                                );
                                            }
                                        );
                                        setPatternModal((prev) => ({
                                            ...prev,
                                            selectedUsers: employeeUsers,
                                            patternType: "employee",
                                        }));
                                    }}
                                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                                >
                                    Tutti Dipendenti 1
                                </button>
                                <button
                                    onClick={() => {
                                        const employeeUsers = names.filter(
                                            (name) => {
                                                const user = users.find(
                                                    (u) => u.name === name
                                                );
                                                return (
                                                    user &&
                                                    user.role === "employee"
                                                );
                                            }
                                        );
                                        setPatternModal((prev) => ({
                                            ...prev,
                                            selectedUsers: employeeUsers,
                                            patternType: "employee_night",
                                        }));
                                    }}
                                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 transition-colors"
                                >
                                    Tutti Dipendenti 2
                                </button>
                                <button
                                    onClick={() =>
                                        setPatternModal((prev) => ({
                                            ...prev,
                                            selectedUsers: [],
                                        }))
                                    }
                                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Deseleziona tutto
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closePatternModal}
                                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={applyShiftPattern}
                                disabled={
                                    patternModal.selectedUsers.length === 0 ||
                                    !patternModal.startDate
                                }
                                className={`px-6 py-2 rounded-md transition-colors ${
                                    patternModal.selectedUsers.length === 0 ||
                                    !patternModal.startDate
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-green-600 text-white hover:bg-green-700"
                                }`}
                            >
                                Applica Pattern
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <Modal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ isOpen: false, message: "" })}
                title="Successo"
                message={successModal.message}
                type="success"
            />
        </div>
    );
}
