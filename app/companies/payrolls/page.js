"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCompanies } from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

function toList(payload) {
  return Array.isArray(payload) ? payload : payload?.data || [];
}

export default function CompaniesPayrollsEntryPage() {
  const ready = useAuthGuard();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      try {
        const companies = toList(await fetchCompanies());
        const preferredCompanyId = new URLSearchParams(window.location.search).get("companyId");
        const preferredCompany = preferredCompanyId
          ? companies.find((company) => String(company.id) === String(preferredCompanyId))
          : null;
        const firstCompanyId = companies?.[0]?.id;

        if (preferredCompany) {
          const preferredEmployees = toList(await fetchEmployees(preferredCompany.id));
          const preferredFirstEmployeeId = preferredEmployees?.[0]?.id;
          if (preferredFirstEmployeeId) {
            router.replace(`/companies/${preferredCompany.id}/employees/${preferredFirstEmployeeId}/payrolls`);
            return;
          }
        }

        for (const company of companies) {
          const employees = toList(await fetchEmployees(company.id));
          const firstEmployeeId = employees?.[0]?.id;
          if (firstEmployeeId) {
            router.replace(`/companies/${company.id}/employees/${firstEmployeeId}/payrolls`);
            return;
          }
        }

        if (firstCompanyId) {
          router.replace(`/companies/${firstCompanyId}/employees?company=all`);
          return;
        }

        router.replace("/companies");
      } catch {
        router.replace("/companies");
      }
    };

    load();
  }, [ready, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
      Bordrolar sayfasına yönlendiriliyor...
    </div>
  );
}
