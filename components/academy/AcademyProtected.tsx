"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAcademyRedirectForRole } from "@/lib/academy-auth";
import type { UserRole } from "@/types/academy";
import { useAcademy } from "./AcademyProvider";

type AcademyProtectedProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export function AcademyProtected({
  allowedRoles,
  children
}: AcademyProtectedProps) {
  const router = useRouter();
  const { currentUser, isReady } = useAcademy();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!currentUser) {
      router.replace("/academy/login");
      return;
    }

    if (!allowedRoles.includes(currentUser.role)) {
      router.replace(getAcademyRedirectForRole(currentUser.role));
    }
  }, [allowedRoles, currentUser, isReady, router]);

  if (!isReady || !currentUser || !allowedRoles.includes(currentUser.role)) {
    return (
      <div
        style={{
          minHeight: "48vh",
          display: "grid",
          placeItems: "center",
          color: "#eff6ff"
        }}
      >
        Loading EV Academy...
      </div>
    );
  }

  return <>{children}</>;
}
