import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AcademyProvider } from "@/components/academy/AcademyProvider";

export default function AcademyLayout({ children }: { children: ReactNode }) {
  return (
    <AcademyProvider>
      {children}
      <SiteFooter />
    </AcademyProvider>
  );
}
