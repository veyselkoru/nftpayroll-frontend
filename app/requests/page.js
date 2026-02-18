"use client";

import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

export default function RequestsPage() {
  const ready = useAuthGuard();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="ta-page space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Talepler</h1>
            <p className="text-sm text-slate-500 mt-1">
              Onay/iş akışı talepleri burada listelenir.
            </p>
          </div>
          <div className="ta-card p-6 text-sm text-slate-600">
            Henüz talep kaydı yok.
          </div>
        </main>
      </div>
    </div>
  );
}
