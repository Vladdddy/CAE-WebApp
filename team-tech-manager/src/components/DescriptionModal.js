import { useState, useEffect } from "react";

export default function DescriptionModal({
    isOpen,
    onClose,
    onSave,
    currentDescription = "",
    currentSimulator = "",
}) {
    const [description, setDescription] = useState(currentDescription);
    const [simulator, setSimulator] = useState(currentSimulator);

    // Update state when props change
    useEffect(() => {
        setDescription(currentDescription);
        setSimulator(currentSimulator);
    }, [currentDescription, currentSimulator]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    const handleSave = () => {
        onSave({ description, simulator });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
                <div className="p-6">
                    {" "}
                    <h3 className="text-xl font-semibold text-gray-800 mb-8">
                        Aggiungi descrizione
                    </h3>
                    <div className="separator"></div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Simulatore
                        </label>
                        <input
                            type="text"
                            value={simulator}
                            onChange={(e) => setSimulator(e.target.value)}
                            placeholder="Nome del simulatore..."
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descrizione
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descrizione del task..."
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            Aggiungi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
