import type { UserRole } from "@/types/academy";

export function normalizeUserRole(value: unknown): UserRole | null {
  return value === "owner" ||
    value === "admin" ||
    value === "student" ||
    value === "visitor"
    ? value
    : null;
}

export function isAdminRole(role: unknown) {
  const normalizedRole = normalizeUserRole(role);
  return normalizedRole === "admin" || normalizedRole === "owner";
}

export function isOwnerRole(role: unknown) {
  return normalizeUserRole(role) === "owner";
}

export function formatAdminSenderLabel(fullName?: string | null) {
  const safeName =
    fullName
      ?.trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_") || "EV";

  return `Admin_${safeName}`;
}
