"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCompanies } from "@/lib/companies";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

function toList(payload) {
  return Array.isArray(payload) ? payload : payload?.data || [];
}

export default function CompaniesEmployeesEntryPage() {
  const ready = useAuthGuard();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    fetchCompanies()
      .then((resp) => {
        const companies = toList(resp);
        const firstCompanyId = companies?.[0]?.id;
        if (firstCompanyId) {
          router.replace(`/companies/${firstCompanyId}/employees?company=all`);
          return;
        }
        router.replace("/companies");
      })
      .catch(() => {
        router.replace("/companies");
      });
  }, [ready, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
      Çalışan sayfasına yönlendiriliyor...
    </div>
  );
}
