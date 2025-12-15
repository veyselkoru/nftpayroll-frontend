"use client";

import { ToastProvider } from "@/app/components/ToastProvider";

export default function Providers({ children }) {
    return <ToastProvider>{children}</ToastProvider>;
}
