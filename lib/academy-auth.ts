import type { StoredAcademyUser, UserRole } from "@/types/academy";

export const academyStorageKeys = {
  sessionUserId: "ev-academy-session-user-id",
  users: "ev-academy-users",
  data: "ev-academy-data"
} as const;

export const demoAcademyUsers: StoredAcademyUser[] = [
  {
    id: "user-admin-1",
    name: "Admin User",
    email: "admin@evacademy.com",
    password: "admin123",
    role: "admin"
  },
  {
    id: "user-visitor-1",
    name: "Visitor User",
    email: "visitor@example.com",
    password: "visitor123",
    role: "visitor"
  }
];

export function getAcademyRedirectForRole(role: UserRole) {
  return role === "admin" ? "/academy/admin" : "/academy/dashboard";
}

export function toPublicUser(user: StoredAcademyUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
