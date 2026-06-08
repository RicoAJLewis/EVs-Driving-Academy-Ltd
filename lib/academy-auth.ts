import type { UserRole } from "@/types/academy";

export const academyStorageKeys = {
  data: "ev-academy-data"
} as const;

export function getAcademyRedirectForRole(role: UserRole) {
  return role === "admin" ? "/academy/admin" : "/academy/dashboard";
}
