"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, BadgeDollarSign } from "lucide-react";

const menu = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Şirketler", href: "/companies", icon: Building2 },
    { label: "Çalışanlar", href: "/employees", icon: Users },
    { label: "Payroll", href: "/payrolls", icon: BadgeDollarSign },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-60 flex-col bg-white border-r shadow-sm">
            <div className="px-5 py-4 border-b">
                <div className="font-bold text-xl tracking-tight">NFTPAYROLL</div>
                <div className="text-xs text-slate-500 mt-1">Admin Panel</div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {menu.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                                active
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                            ].join(" ")}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="px-4 py-3 border-t text-[11px] text-slate-400">
                v0.1 • NFTPAYROLL
            </div>
        </aside>
    );
}
