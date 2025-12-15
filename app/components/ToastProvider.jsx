"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

// Hook
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast, ToastProvider içinde kullanılmalı");
    }
    return ctx;
}

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    /**
     * showToast("Mesaj", "success")
     * showToast("Mesaj", { type: "error", duration: 6000 })
     */
    const showToast = useCallback((message, options) => {
        let type = "info";
        let duration = 6000;

        if (typeof options === "string") {
            type = options;
        } else if (typeof options === "object" && options !== null) {
            type = options.type || type;
            duration =
                typeof options.duration === "number"
                    ? options.duration
                    : duration;
        }

        const id = ++toastId;

        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration !== Infinity && duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const value = { showToast };

    const typeStyles = {
        success: "bg-emerald-500 text-white",
        error: "bg-red-500 text-white",
        info: "bg-slate-800 text-white",
        warning: "bg-amber-500 text-white",
    };

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Global toast container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl shadow-lg text-sm border border-black/5 ${typeStyles[toast.type] || typeStyles.info}`}
                    >
                        <span>{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 text-xs font-medium underline/50"
                        >
                            Kapat
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
