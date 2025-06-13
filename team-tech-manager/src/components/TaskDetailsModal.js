import React from "react";
import "../styles/tasks.css";

export default function TaskDetailsModal({ isOpen, onClose, task }) {
    if (!isOpen || !task) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case "completato":
                return "text-green-600 bg-green-100";
            case "in corso":
                return "text-yellow-600 bg-yellow-100";
            case "non completato":
                return "text-red-600 bg-red-100";
            default:
                return "text-gray-600 bg-gray-100";
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Dettagli Task #{task.id}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
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

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Assigned To */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                            Assegnato a
                        </label>
                        <div className="flex items-center justify-center employee-info">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="#3b82f6"
                                fill="none"
                            >
                                <path
                                    d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                                    stroke="currentColor"
                                    stroke-width="2"
                                />
                                <path
                                    d="M14 14H10C7.23858 14 5 16.2386 5 19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19C19 16.2386 16.7614 14 14 14Z"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linejoin="round"
                                />
                            </svg>
                            <p className="text-[#3b82f6]">{task.assignedTo}</p>
                        </div>
                    </div>

                    {/* Task Title */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Titolo
                        </label>
                        <p className="text-black font-bold text-xl">
                            {task.title}
                        </p>
                    </div>

                    {/* Date and Time */}
                    <div className="flex justify-between">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Data
                            </label>
                            <p className="text-gray-600 text-md">
                                {new Date(task.date).toLocaleDateString(
                                    "it-IT"
                                )}
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Orario
                            </label>
                            <p className="text-gray-600 text-md">{task.time}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Stato
                            </label>
                            <span
                                className={`inline-flex px-4 py-1 text-xs font-medium rounded-md capitalize ${getStatusColor(
                                    task.status
                                )}`}
                            >
                                {task.status}
                            </span>
                        </div>
                    </div>

                    {/* Status */}

                    <div className="separator"></div>

                    {/* Created Date (placeholder) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Simulatore
                        </label>
                        <p className="text-gray-600 text-sm">
                            (nome simulatore)
                        </p>
                    </div>

                    {/* Description (placeholder) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Descrizione
                        </label>
                        <p className="text-gray-600 text-sm">
                            (note o motivazione del task)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
