// lib/employees.js
import { apiFetch } from "./apiClient";

// Çalışan listesini getir
export async function fetchEmployees(companyId) {
    return apiFetch(`/companies/${companyId}/employees`, { auth: true });
}

// Yeni çalışan oluştur
export async function createEmployeeApi(companyId, payload) {
    return apiFetch(`/companies/${companyId}/employees`, {
        method: "POST",
        body: payload,
        auth: true,
    });
}

export function listEmployeeNfts(companyId, employeeId) {
    return apiFetch(`/companies/${companyId}/employees/${employeeId}/nfts`, {
        auth: true,
    });
}
