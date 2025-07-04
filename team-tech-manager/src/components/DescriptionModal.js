import { useState, useEffect } from "react";

export default function DescriptionModal({
    isOpen,
    onClose,
    onSave,
    currentDescription = "",
    currentSimulator = "",
    currentEmployee = "",
    availableEmployees = [],
    employeesLoading = false,
    isEditing = false,
}) {
    const [description, setDescription] = useState(currentDescription);
    const [simulator, setSimulator] = useState(currentSimulator);
    const [employee, setEmployee] = useState(currentEmployee);

    // Update state when props change
    useEffect(() => {
        setDescription(currentDescription);
        setSimulator(currentSimulator);
        setEmployee(currentEmployee);
    }, [currentDescription, currentSimulator, currentEmployee]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    const handleSave = () => {
        onSave({ description, simulator, employee });
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
                            onChange={(e) => setEmployee(e.target.value)}
                            className="border px-3 py-2 rounded mb-4 text-gray-600 text-sm w-full"
                            disabled={employeesLoading}
                        >
                            <option value="">
                                {employeesLoading
                                    ? "Caricamento dipendenti..."
                                    : availableEmployees.length === 0
                                    ? "Nessun dipendente disponibile"
                                    : "Seleziona dipendente..."}
                            </option>
                            {availableEmployees.map((employeeName) => (
                                <option key={employeeName} value={employeeName}>
                                    {employeeName}
                                </option>
                            ))}
                        </select>
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
