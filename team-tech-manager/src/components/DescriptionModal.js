import { useState, useEffect, useRef } from "react";

export default function DescriptionModal({
    isOpen,
    onClose,
    onSave,
    currentTitle = "",
    currentDescription = "",
    currentSimulator = "",
    currentEmployee = "",
    currentDate = "",
    currentTime = "",
    availableEmployees = [],
    employeesLoading = false,
    isEditing = false,
    onDateTimeChange,
    isEmployee = false,
}) {
    const [title, setTitle] = useState(currentTitle);
    const [description, setDescription] = useState(currentDescription);
    const [simulator, setSimulator] = useState(currentSimulator);
    const [employee, setEmployee] = useState(currentEmployee);
    const [date, setDate] = useState(currentDate);
    const [shift, setShift] = useState("D"); // Changed from time to shift
    const initialLoadRef = useRef(true);

    // Helper function to convert shift to time
    const shiftToTime = (shiftValue) => {
        return shiftValue === "N" ? "23:00" : "08:00";
    };

    // Helper function to convert time to shift
    const timeToShift = (timeValue) => {
        if (!timeValue) return "D";
        const hour = parseInt(timeValue.split(":")[0]);
        return hour >= 19 || hour <= 7 ? "N" : "D";
    };

    // Update state when props change
    useEffect(() => {
        setTitle(currentTitle);
        setDescription(currentDescription);
        setSimulator(currentSimulator);
        setEmployee(currentEmployee);
        setDate(currentDate);
        setShift(timeToShift(currentTime));

        // Reset the initial load flag when modal opens
        if (isOpen) {
            initialLoadRef.current = true;
        }
    }, [
        currentTitle,
        currentDescription,
        currentSimulator,
        currentEmployee,
        currentDate,
        currentTime,
        isOpen,
    ]);

    // Notify parent when date or shift changes to fetch new available employees
    useEffect(() => {
        // Skip the first call on initial load to avoid unnecessary API calls
        if (initialLoadRef.current) {
            console.log("Skipping initial date/shift change callback");
            initialLoadRef.current = false;
            return;
        }

        const time = shiftToTime(shift);
        console.log("Date/shift changed in modal:", date, shift, "->", time);
        if (onDateTimeChange) {
            onDateTimeChange(date, time);
        }
    }, [date, shift, onDateTimeChange]);

    // Reset employee selection if current employee is not available for the new date/time
    useEffect(() => {
        if (
            employee &&
            availableEmployees.length > 0 &&
            !availableEmployees.includes(employee)
        ) {
            setEmployee("");
        } else if (
            availableEmployees.length === 0 &&
            employee &&
            employee !== "Non assegnare"
        ) {
            // If no employees are available for this date/shift, automatically set to "Non assegnare"
            setEmployee("Non assegnare");
        }
    }, [availableEmployees, employee]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    const handleSave = () => {
        const time = shiftToTime(shift);
        onSave({ title, description, simulator, employee, date, time });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-8">
                        {isEditing ? "Modifica entry logbook" : "Modifica task"}
                    </h3>
                    <div className="separator"></div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {isEditing ? "Titolo entry" : "Titolo task"}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={
                                isEditing
                                    ? "Titolo dell'entry..."
                                    : "Titolo del task..."
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Simulatore
                        </label>
                        <select
                            id="simulator"
                            value={simulator}
                            onChange={(e) => setSimulator(e.target.value)}
                            className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm w-full"
                        >
                            <option value="">Seleziona simulatore...</option>
                            <option value="FTD">FTD</option>
                            <option value="109FFS">109FFS</option>
                            <option value="139#1">139#1</option>
                            <option value="139#3">139#3</option>
                            <option value="169">169</option>
                            <option value="189">189</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dipendente
                        </label>
                        <select
                            value={employee}
                            onChange={(e) =>
                                !isEmployee && setEmployee(e.target.value)
                            }
                            className={`border px-3 py-2 rounded mb-4 text-sm w-full ${
                                employeesLoading || isEmployee
                                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                    : "text-gray-600"
                            }`}
                            disabled={employeesLoading || isEmployee}
                        >
                            <option value="">
                                {employeesLoading
                                    ? "Caricamento dipendenti..."
                                    : availableEmployees.length === 0
                                    ? "Nessun dipendente disponibile"
                                    : "Seleziona dipendente..."}
                            </option>
                            {availableEmployees.length === 0 &&
                                !employeesLoading && (
                                    <option value="Non assegnare">
                                        Non assegnare
                                    </option>
                                )}
                            {availableEmployees.map((employeeName) => (
                                <option key={employeeName} value={employeeName}>
                                    {employeeName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data
                        </label>
                        <input
                            type="date"
                            value={date || ""}
                            onChange={(e) => setDate(e.target.value)}
                            className="border px-3 py-2 rounded mb-4 text-sm w-full text-gray-600"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Turno
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="shift"
                                    value="D"
                                    checked={shift === "D"}
                                    onChange={(e) => setShift(e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                    style={{
                                        accentColor: "#3b82f6",
                                        cursor: "pointer",
                                    }}
                                />
                                <span className="text-sm text-gray-700">D</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="shift"
                                    value="N"
                                    checked={shift === "N"}
                                    onChange={(e) => setShift(e.target.value)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                    style={{
                                        accentColor: "#3b82f6",
                                        cursor: "pointer",
                                    }}
                                />
                                <span className="text-sm text-gray-700">N</span>
                            </label>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {isEditing ? "Testo entry" : "Descrizione"}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                                isEditing
                                    ? "Modifica il testo dell'entry..."
                                    : "Descrizione del task..."
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
                            style={{ maxHeight: "100px", minHeight: "60px" }}
                            rows={3}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                        >
                            {isEditing ? "Salva modifiche" : "Aggiungi"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
