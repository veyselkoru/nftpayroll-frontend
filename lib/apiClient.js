// lib/apiClient.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
    const { method = "GET", body, auth = false } = options;

    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };

    if (auth) {
        const token = getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
        data = await res.json();
    } catch {
        // boş body vs.
    }

    if (!res.ok) {
        const message = data?.message || "API error";
        throw new Error(message);
    }

    return data;
}
