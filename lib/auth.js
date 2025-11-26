// lib/auth.js
import { apiFetch } from "./apiClient";

const TOKEN_KEY = "token";

function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function loginApi({ email, password }) {
  const resp = await apiFetch("/login", {
    method: "POST",
    body: { email, password },
  });

  if (resp?.token) {
    setToken(resp.token);
  }

  return resp;
}

export async function registerApi(payload) {
  const resp = await apiFetch("/register", {
    method: "POST",
    body: payload,
  });

  if (resp?.token) {
    setToken(resp.token);
  }

  return resp;
}

export async function meApi() {
  // Kullanıcının halen login olup olmadığını kontrol eder
  return apiFetch("/me", { auth: true });
}

export async function logoutApi() {
  try {
    await apiFetch("/logout", {
      method: "POST",
      auth: true,
    });
  } catch {
    // logout isteği patlasa da token'ı temizleriz
  }

  clearToken();
}
