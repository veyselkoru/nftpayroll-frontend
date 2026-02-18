import { apiFetch } from "./apiClient";
import { moduleConfigs } from "./moduleConfigs";

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const s = query.toString();
  return s ? `?${s}` : "";
}

function getEndpoint(slug, key) {
  const path = moduleConfigs?.[slug]?.endpoints?.[key];
  if (!path) throw new Error(`Endpoint tanımı bulunamadı: ${slug}.${key}`);
  return path;
}

export async function fetchModuleList(slug, params = {}) {
  const path = getEndpoint(slug, "list");
  return apiFetch(`${path}${buildQuery(params)}`, { auth: true });
}

export async function fetchModuleMetrics(slug, params = {}) {
  const path = getEndpoint(slug, "metrics");
  return apiFetch(`${path}${buildQuery(params)}`, { auth: true });
}
