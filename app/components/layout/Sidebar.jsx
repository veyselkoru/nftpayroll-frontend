"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Building2,
    Users,
    WalletCards,
    FileStack,
    FileCode2,
    ChevronDown,
    Bell,
    PlugZap,
    LayoutTemplate,
    Wallet,
    BarChart3,
    UsersRound,
    FileOutput,
    ActivitySquare,
    Settings,
    ClipboardList,
    LogOut
} from "lucide-react";
import { logoutApi } from "@/lib/auth";

const menu = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Firmalar", href: "/companies", icon: Building2 },
    { label: "Çalışanlar", href: "/companies/employees", icon: Users },
    { label: "Bordrolar", href: "/companies/payrolls", icon: WalletCards },
    {
        label: "Raporlar",
        href: "/reports",
        icon: FileStack,
        collapsibleOnly: true,
        children: [
            { label: "Firma Raporları", href: "/reports/company", icon: Building2 },
            { label: "Çalışan Raporları", href: "/reports/employee", icon: UsersRound },
            { label: "Bordro Raporları", href: "/reports/payroll", icon: ClipboardList },
            { label: "NFT Raporları", href: "/reports/nft", icon: Wallet },
            { label: "Maliyet Raporları", href: "/modules/cost-reports", icon: BarChart3 },
        ],
    },
    {
        label: "Ayarlar",
        href: "/settings",
        icon: Settings,
        collapsibleOnly: true,
        children: [
            { label: "Entegrasyonlar", href: "/modules/integrations", icon: PlugZap },
            { label: "Şablonlar", href: "/modules/templates", icon: LayoutTemplate },
            { label: "Yetki & Roller", href: "/modules/roles", icon: UsersRound },
        ],
    },
    { label: "Bildirimler", href: "/modules/notifications", icon: Bell },
    { label: "Dışa Aktarım", href: "/modules/exports", icon: FileOutput },
    { label: "Sistem Sağlığı", href: "/modules/system-health", icon: ActivitySquare },
    { label: "Talepler", href: "/requests", icon: ClipboardList },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [expandedGroups, setExpandedGroups] = useState({});

    async function handleLogout() {
        await logoutApi();
        router.push("/login");
    }

    return (
        <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200">
            <div className="px-5 py-5 border-b border-gray-200">
                <Image
                    src="/nftpayroll-logo.svg"
                    alt="NFTPayroll Logo"
                    width={180}
                    height={40}
                    priority
                    className="h-auto w-auto max-w-[180px]"
                />
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 flex flex-col overflow-y-auto">
                {menu.map((item) => {
                    const Icon = item.icon;
                    const active = (() => {
                        if (item.href === "/dashboard") return pathname === item.href;
                        if (item.href === "/companies") {
                            return pathname === "/companies" || /^\/companies\/\d+(\/nfts)?$/.test(pathname);
                        }
                        if (item.href === "/companies/employees") {
                            return pathname === "/companies/employees" || /^\/companies\/\d+\/employees$/.test(pathname);
                        }
                        if (item.href === "/companies/payrolls") {
                            return (
                                pathname === "/companies/payrolls" ||
                                /^\/companies\/\d+\/employees\/\d+\/payrolls(\/\d+)?$/.test(pathname)
                            );
                        }
                        return pathname.startsWith(item.href);
                    })();
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    const childActive = hasChildren
                        ? item.children.some((child) => pathname.startsWith(child.href))
                        : false;
                    const parentActive = active || childActive;
                    const autoOpen = hasChildren ? active || childActive : false;
                    const isOpen = hasChildren ? expandedGroups[item.href] ?? autoOpen : false;

                    return (
                        <div key={`${item.label}-${item.href}`} className="space-y-1">
                            {item.collapsibleOnly && hasChildren ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedGroups((prev) => ({
                                            ...prev,
                                            [item.href]: !(prev[item.href] ?? autoOpen),
                                        }))
                                    }
                                    className={[
                                        "group flex w-full items-center gap-2 rounded-lg text-sm font-medium transition px-3 py-2.5",
                                        parentActive
                                            ? "bg-[#e9edf7] text-[#111b3a]"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                                    ].join(" ")}
                                    aria-label={`${item.label} aç/kapat`}
                                >
                                    <Icon
                                        className={[
                                            "w-4 h-4",
                                            parentActive ? "text-[#111b3a]" : "text-gray-500 group-hover:text-gray-700",
                                        ].join(" ")}
                                    />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <ChevronDown
                                        className={[
                                            "w-4 h-4 transition-transform",
                                            isOpen ? "rotate-180 text-[#111b3a]" : "text-slate-500",
                                        ].join(" ")}
                                    />
                                </button>
                            ) : (
                                <div
                                    className={[
                                        "group flex items-center gap-2 rounded-lg text-sm font-medium transition",
                                        parentActive
                                            ? "bg-[#e9edf7] text-[#111b3a] pr-1"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 pr-1",
                                    ].join(" ")}
                                >
                                    <Link href={item.href} className="flex-1 flex items-center gap-3 px-3 py-2.5">
                                        <Icon
                                            className={[
                                                "w-4 h-4",
                                                parentActive ? "text-[#111b3a]" : "text-gray-500 group-hover:text-gray-700",
                                            ].join(" ")}
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                    {hasChildren ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedGroups((prev) => ({
                                                    ...prev,
                                                    [item.href]: !(prev[item.href] ?? autoOpen),
                                                }))
                                            }
                                            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-200/60"
                                            aria-label={`${item.label} aç/kapat`}
                                        >
                                            <ChevronDown
                                                className={[
                                                    "w-4 h-4 transition-transform",
                                                    isOpen ? "rotate-180 text-[#111b3a]" : "text-slate-500",
                                                ].join(" ")}
                                            />
                                        </button>
                                    ) : null}
                                </div>
                            )}

                            {hasChildren && isOpen ? (
                                <div className="ml-6 pl-2 border-l border-slate-200 space-y-1">
                                    {item.children.map((child) => {
                                        const childIsActive = pathname.startsWith(child.href);
                                        return (
                                            <Link
                                                key={`${child.label}-${child.href}`}
                                                href={child.href}
                                                className={[
                                                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition",
                                                    childIsActive
                                                        ? "bg-[#eef2fb] text-[#111b3a] font-medium"
                                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                                                ].join(" ")}
                                            >
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                                <span>{child.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
                <div className="mt-auto pt-4 border-t border-gray-200">
                    <Link
                        href="/swagger"
                        className={[
                            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-1",
                            pathname.startsWith("/swagger")
                                ? "bg-[#e9edf7] text-[#111b3a]"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                        ].join(" ")}
                    >
                        <FileCode2 className="w-4 h-4" />
                        <span>Swagger</span>
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Çıkış</span>
                    </button>
                </div>
            </nav>

            <div className="px-4 py-3 border-t border-gray-200 text-[11px] text-gray-400">
                v0.1 • NFTPAYROLL
            </div>
        </aside>
    );
}
