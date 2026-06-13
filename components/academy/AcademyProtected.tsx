"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAcademyRedirectForRole } from "@/lib/academy-auth";
import type { UserRole } from "@/types/academy";
import { Skeleton, SkeletonAdminRows } from "@/components/ui/Skeleton";
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
          gap: "1.2rem",
          alignContent: "start",
          color: "#eff6ff",
          width: "min(1180px, calc(100% - 2rem))",
          margin: "0 auto",
          padding: "2rem 0"
        }}
        aria-label="Loading protected EV Academy content"
      >
        <Skeleton width="42%" height="2.4rem" rounded="0.8rem" />
        <Skeleton width="64%" height="1rem" />
        <SkeletonAdminRows rows={3} />
      </div>
    );
  }

  return <>{children}</>;
}
