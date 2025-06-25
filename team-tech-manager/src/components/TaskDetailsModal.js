import React, { useState } from "react";
import "../styles/tasks.css";

export default function TaskDetailsModal({
    isOpen,
    onClose,
    task,
    onToggleTask,
    onDeleteTask,
    canToggleTask,
    canDeleteTasks,
    canEditDescription,
    onEditDescription,
    onSaveNote,
}) {
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState("");

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
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col transform transition-all">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
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

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
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
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="M14 14H10C7.23858 14 5 16.2386 5 19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19C19 16.2386 16.7614 14 14 14Z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <p className="text-[#3b82f6]">
                                    {task.assignedTo}
                                </p>
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
                                    {task.type === "logbook-entry"
                                        ? "Categoria"
                                        : "Stato"}
                                </label>
                                <span
                                    className={`inline-flex px-4 py-1 text-xs font-medium rounded-md capitalize ${getStatusColor(
                                        task.status
                                    )}`}
                                >
                                    {task.status}
                                </span>{" "}
                            </div>
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
                                <p className="text-gray-600 text-md">
                                    {task.time}
                                </p>
                            </div>{" "}
                        </div>{" "}
                        {/* Subcategory - only for logbook entries */}
                        {task.type === "logbook-entry" && task.subcategory && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Sotto-categoria
                                </label>
                                <p className="text-gray-600 text-sm">
                                    {task.subcategory}
                                </p>
                            </div>
                        )}
                        {/* Extra Detail - only for logbook entries */}
                        {task.type === "logbook-entry" && task.extraDetail && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Dettaglio extra
                                </label>
                                <p className="text-gray-600 text-sm">
                                    {task.extraDetail}
                                </p>
                            </div>
                        )}
                        {/* Status */}
                        <div className="separator"></div>
                        {/* Simulator */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Simulatore
                            </label>
                            <p className="text-gray-600 text-sm">
                                {task.simulator || "Nessun simulatore"}
                            </p>
                        </div>{" "}
                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-600">
                                    Descrizione
                                </label>
                            </div>{" "}
                            <p className="text-gray-600 text-sm mb-2">
                                {task.description || "Nessuna descrizione"}
                            </p>{" "}
                            {onSaveNote && (
                                <button
                                    onClick={() =>
                                        setShowNoteInput(!showNoteInput)
                                    }
                                    className="text-blue-600 p-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors mt-2"
                                    title="Aggiungi nota"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
                                        color="currentColor"
                                        fill="none"
                                    >
                                        <path
                                            d="M12 4V20M20 12H4"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>{" "}
                                </button>
                            )}
                            {/* Display existing notes */}
                            {task.notes && task.notes.length > 0 && (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">
                                        Note aggiunte
                                    </label>
                                    <div className="space-y-2 mb-3 overflow-y-auto">
                                        {task.notes.map((note, index) => (
                                            <div
                                                key={index}
                                                className="bg-gray-100 p-2 rounded-md text-xs"
                                            >
                                                <p className="text-gray-800 font-bold">
                                                    {note.text}
                                                </p>
                                                <p className="text-gray-400 mt-1 text-xs">
                                                    {note.author} -{" "}
                                                    {new Date(
                                                        note.timestamp
                                                    ).toLocaleString("it-IT")}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {onSaveNote && showNoteInput && (
                                <div className="mt-3">
                                    <textarea
                                        value={noteText}
                                        onChange={(e) =>
                                            setNoteText(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 text-normal rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows="3"
                                        placeholder="Aggiungi una nota..."
                                    />{" "}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => {
                                                if (
                                                    onSaveNote &&
                                                    noteText.trim()
                                                ) {
                                                    onSaveNote(
                                                        task.id,
                                                        noteText.trim()
                                                    );
                                                    setShowNoteInput(false);
                                                    setNoteText("");
                                                } else if (!noteText.trim()) {
                                                    alert(
                                                        "Inserisci una nota prima di salvare"
                                                    );
                                                } else {
                                                    console.log(
                                                        "Nota salvata:",
                                                        noteText
                                                    );
                                                    setShowNoteInput(false);
                                                    setNoteText("");
                                                }
                                            }}
                                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Salva
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowNoteInput(false);
                                                setNoteText("");
                                            }}
                                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                                        >
                                            Annulla
                                        </button>{" "}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fixed Footer - Action Buttons */}
                {(canToggleTask(task) ||
                    canDeleteTasks() ||
                    canEditDescription(task)) && (
                    <div className="flex-shrink-0 p-6 pt-4 border-t bg-gray-50">
                        {" "}
                        <label className="block text-xs font-medium text-gray-600 mb-3">
                            Azioni
                        </label>
                        <div className="flex gap-3 flex-wrap">
                            {canEditDescription(task) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose(); // Close task details modal first
                                        onEditDescription(task); // Then open description modal
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-200"
                                    title="Modifica descrizione e simulatore"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
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
                                    <span className="text-sm">Modifica</span>
                                </button>
                            )}
                            {canToggleTask(task) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTask(task.id);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
                                    title="Cambia stato"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
                                        color="currentColor"
                                        fill="none"
                                    >
                                        <path
                                            d="M20.5 5.5H9.5C5.78672 5.5 3 8.18503 3 12"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M3.5 18.5H14.5C18.2133 18.5 21 15.815 21 12"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M18.5 3C18.5 3 21 4.84122 21 5.50002C21 6.15882 18.5 8 18.5 8"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M5.49998 16C5.49998 16 3.00001 17.8412 3 18.5C2.99999 19.1588 5.5 21 5.5 21"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <span className="text-sm">
                                        Cambia Stato
                                    </span>{" "}
                                </button>
                            )}
                            {canDeleteTasks(task) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask(task.id);
                                        onClose(); // Close modal after deletion
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
                                    title="Elimina"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
                                        color="currentColor"
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
                                        />{" "}
                                    </svg>{" "}
                                    <span className="text-sm">Elimina</span>
                                </button>
                            )}
                        </div>{" "}
                    </div>
                )}
            </div>
        </div>
    );
}
