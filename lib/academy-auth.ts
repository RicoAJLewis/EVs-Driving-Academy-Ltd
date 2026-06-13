import type { UserRole } from "@/types/academy";
import { isAdminRole } from "./academy-roles";

export const academyStorageKeys = {
  data: "ev-academy-data"
} as const;

export function getAcademyRedirectForRole(role: UserRole) {
  return isAdminRole(role) ? "/academy/admin" : "/academy/dashboard";
}
