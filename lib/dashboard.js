// lib/dashboard.js
import { apiFetch } from "./apiClient";

export async function fetchDashboardSummary() {
    return apiFetch("/dashboard/summary", {
        auth: true,
    });
}

export async function fetchDashboardRecentMints() {
    return apiFetch("/dashboard/recent-mints", {
        auth: true,
    });
}