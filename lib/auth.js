// lib/auth.js
import { apiFetch } from "./apiClient";

export async function loginApi({ email, password }) {
    const resp = await apiFetch("/login", {
        method: "POST",
        body: { email, password },
    });

    // Laravel'de login response'unda token alanı olduğunu varsayıyorum
    if (typeof window !== "undefined") {
        if (resp.token) {
            localStorage.setItem("token", resp.token);
        }
    }

    return resp;
}

export async function registerApi(payload) {
    const resp = await apiFetch("/register", {
        method: "POST",
        body: payload,
    });

    if (typeof window !== "undefined") {
        if (resp.token) {
            localStorage.setItem("token", resp.token);
        }
    }

    return resp;
}
