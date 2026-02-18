export function extractUserFromMe(payload) {
  if (!payload || typeof payload !== "object") return null;
  const user =
    payload.user ||
    payload.data?.user ||
    payload.data?.data?.user ||
    payload.data?.data ||
    payload.data ||
    payload;
  return user && typeof user === "object" ? user : null;
}

export function extractUserRole(payload) {
  const user = extractUserFromMe(payload);
  if (!user) return "";

  const direct =
    user.role ||
    user.role_name ||
    user.roleName ||
    user.user_type ||
    user.type ||
    "";
  if (direct) return String(direct).toLowerCase();

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const first = user.roles[0];
    if (typeof first === "string") return first.toLowerCase();
    if (first && typeof first === "object") {
      return String(first.name || first.slug || "").toLowerCase();
    }
  }

  return "";
}

export function isCompanyOwner(payload) {
  const role = extractUserRole(payload);
  return role === "company_owner" || role === "owner";
}

export function isAdminLike(payload) {
  const role = extractUserRole(payload);
  return ["admin", "owner", "company_owner"].includes(role);
}

export function isManagerLike(payload) {
  const role = extractUserRole(payload);
  return ["company_manager", "manager"].includes(role);
}

export function isEmployeeLike(payload) {
  const role = extractUserRole(payload);
  return role === "employee";
}

export function extractUserContext(payload) {
  const user = extractUserFromMe(payload) || {};
  return {
    id: user.id ?? null,
    email: user.email ?? null,
    role: extractUserRole(payload),
    companyId: user.company_id ?? user.companyId ?? null,
    employeeId: user.employee_id ?? user.employeeId ?? user.profile?.employee_id ?? null,
  };
}
