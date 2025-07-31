import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
    isOpen,
    onClose,
    title,
    message,
    type = "info",
    onConfirm = null,
    confirmText = "Conferma",
}) {
    if (!isOpen) return null;

    const isConfirmModal = type === "confirm";
    const isErrorModal = type === "error";
    const isSuccessModal = type === "success";
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (isSuccessModal && isOpen) {
            const timer = setTimeout(() => {
                onCloseRef.current();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isSuccessModal, isOpen]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !isSuccessModal) {
            onClose();
        }
    };

    const getIcon = () => {
        if (isConfirmModal) {
            return (
                <svg
                    className="w-8 h-8 text-yellow-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                </svg>
            );
        } else if (isErrorModal) {
            return (
                <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            );
        } else if (isSuccessModal) {
            return (
                <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            );
        } else {
            return (
                <svg
                    className="w-8 h-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            );
        }
    };

    // Success toast notification at the top
    if (isSuccessModal) {
        return createPortal(
            <div
                className="fixed top-4 left-1/2 transform -translate-x-1/2"
                style={{ zIndex: 999999 }}
            >
                <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 min-w-80">
                    <svg
                        className="w-6 h-6 text-white flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <div>
                        <p className="text-sm opacity-90">{message}</p>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Regular modal for other types
    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            style={{ zIndex: 999999 }}
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        {getIcon()}
                        <h3 className="ml-3 text-lg font-semibold text-gray-900">
                            {title}
                        </h3>
                    </div>

                    <p className="text-gray-600 mb-6">{message}</p>

                    <div className="flex justify-end space-x-3">
                        {isConfirmModal ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    Annulla
                                </button>{" "}
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className="px-4 py-2 text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-md transition-colors"
                                >
                                    {confirmText}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                            >
                                OK
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
