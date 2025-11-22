// lib/payrolls.js
import { apiFetch } from "./apiClient";

// Liste
export async function fetchPayrolls(companyId, employeeId) {
    return apiFetch(
        `/companies/${companyId}/employees/${employeeId}/payrolls`,
        { auth: true }
    );
}

// Oluştur
export async function createPayrollApi(companyId, employeeId, payload) {
    return apiFetch(
        `/companies/${companyId}/employees/${employeeId}/payrolls`,
        {
            method: "POST",
            body: payload,
            auth: true,
        }
    );
}

// Kuyruğa ekle
export async function queuePayrollApi(companyId, employeeId, payrollId) {
    return apiFetch(
        `/companies/${companyId}/employees/${employeeId}/payrolls/${payrollId}/queue`,
        {
            method: "POST",
            auth: true,
        }
    );
}

// Durum sorgu
export async function payrollStatusApi(companyId, employeeId, payrollId) {
    return apiFetch(
        `/companies/${companyId}/employees/${employeeId}/payrolls/${payrollId}/status`,
        {
            auth: true,
        }
    );
}

// Mint retry
export async function retryMintApi(companyId, employeeId, payrollId) {
    return apiFetch(
        `/companies/${companyId}/employees/${employeeId}/payrolls/${payrollId}/mint/retry`,
        {
            method: "POST",
            auth: true,
        }
    );
}
