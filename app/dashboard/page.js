import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";

export default function DashboardPage() {
    return (
        <div className="min-h-screen flex bg-slate-100">
            {/* SOL MENÜ */}
            <Sidebar />

            {/* SAĞ TARAF */}
            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />
                <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
                    <h1 className="text-2xl font-bold">Hoş geldin 👋</h1>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Toplam Şirket</div>
                            <div className="mt-2 text-3xl font-bold">0</div>
                        </div>
                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Toplam Çalışan</div>
                            <div className="mt-2 text-3xl font-bold">0</div>
                        </div>
                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Mint Edilen Payroll NFT</div>
                            <div className="mt-2 text-3xl font-bold">0</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border p-4">
                        <div className="font-semibold mb-2">Son İşlemler</div>
                        <p className="text-sm text-slate-500">
                            Şimdilik statik. Laravel API bağlayınca buraya gerçek veriyi koyacağız.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
