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

// 🔹 Şirket detayını getir
export async function fetchCompanyDetail(companyId) {
    return apiFetch(`/companies/${companyId}`, {
        auth: true,
    });
}

// 🔹 Şirketin NFT'lerini getir (company-level NFTs)
export async function fetchCompanyNfts(companyId) {
    return apiFetch(`/companies/${companyId}/nfts`, {
        auth: true,
    });
}
