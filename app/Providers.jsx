"use client";

import AutoButtonTooltip from "@/app/components/AutoButtonTooltip";
import { ToastProvider } from "@/app/components/ToastProvider";

export default function Providers({ children }) {
    return (
        <ToastProvider>
            <AutoButtonTooltip />
            {children}
        </ToastProvider>
    );
}
