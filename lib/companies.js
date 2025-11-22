// lib/companies.js
import { apiFetch } from "./apiClient";

export async function fetchCompanies() {
    return apiFetch("/companies", { auth: true });
}

export async function createCompanyApi(payload) {
    return apiFetch("/companies", {
        method: "POST",
        body: payload,
        auth: true,
    });
}
