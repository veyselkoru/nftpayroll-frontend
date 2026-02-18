"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  Info,
  Landmark,
  PlayCircle,
  RefreshCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { useToast } from "@/app/components/ToastProvider";
import {
  fetchPayrolls,
  decryptPayrollApi,
  payrollStatusApi,
  queuePayrollApi,
  retryMintApi,
} from "@/lib/payrolls";
import { formatDateDDMMYYYY } from "@/lib/date";
import { formatCurrencyTrailing } from "@/lib/currency";

export default function PayrollDetailPage() {
  const ready = useAuthGuard();
  const router = useRouter();
  const { companyId, employeeId, payrollId } = useParams();

  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const previousStatusRef = useRef("");

  const [decryptModal, setDecryptModal] = useState({
    open: false,
    loading: false,
    error: "",
    payload: null,
  });

  const readStatus = (item) =>
    item?.nft?.status ||
    item?.nftMint?.status ||
    item?.nft_status ||
    item?.mint_status ||
    item?.status ||
    "";

  const isActiveStatus = (status) =>
    ["pending", "queued", "sending", "minting", "processing"].includes(
      String(status || "").toLowerCase()
    );

  const isFinalStatus = (status) =>
    ["sent", "failed", "minted", "mint_failed"].includes(
      String(status || "").toLowerCase()
    );

  const normalizePayrollStatusPayload = useCallback((currentPayroll, rawPayload) => {
    if (!rawPayload || typeof rawPayload !== "object") return null;

    const payload = rawPayload?.payroll || rawPayload?.data?.payroll || rawPayload?.data || rawPayload;
    if (!payload || typeof payload !== "object") return null;

    const currentNft = currentPayroll?.nft || currentPayroll?.nftMint || {};
    const payloadNft = payload?.nft || payload?.nftMint || {};

    const resolvedStatus =
      payloadNft?.status ||
      payload?.nft_status ||
      payload?.mint_status ||
      payload?.status ||
      currentNft?.status ||
      currentPayroll?.status ||
      "";

    const mergedNft = {
      ...currentNft,
      ...payloadNft,
      status: resolvedStatus || currentNft?.status || "",
      tx_hash: payloadNft?.tx_hash || payload?.tx_hash || currentNft?.tx_hash || null,
      token_id: payloadNft?.token_id || payload?.token_id || currentNft?.token_id || null,
      ipfs_cid: payloadNft?.ipfs_cid || payload?.ipfs_cid || currentNft?.ipfs_cid || null,
      image_url: payloadNft?.image_url || payload?.image_url || currentNft?.image_url || null,
    };

    return {
      ...currentPayroll,
      ...payload,
      status: resolvedStatus || payload?.status || currentPayroll?.status || "",
      nft: mergedNft,
    };
  }, []);

  const loadPayroll = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
          setError("");
        }

        const data = await fetchPayrolls(companyId, employeeId);
        const list = Array.isArray(data) ? data : data?.data || [];
        const found = list.find((p) => String(p.id) === String(payrollId)) || null;

        if (!found) {
          setError("Payroll bulunamadı");
          return;
        }

        const currentStatus = readStatus(found);
        if (previousStatusRef.current && previousStatusRef.current !== currentStatus) {
          showToast(`Mint durumu güncellendi: ${currentStatus || "unknown"}`, "success");
        }
        previousStatusRef.current = currentStatus;

        setPayroll(found);
      } catch (err) {
        if (!silent) setError(err.message || "Detay yüklenirken hata oluştu.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [companyId, employeeId, payrollId, showToast]
  );

  const refreshPayrollStatus = useCallback(async () => {
    if (!payroll) return;
    try {
      const statusRes = await payrollStatusApi(companyId, employeeId, payroll.id);
      const merged = normalizePayrollStatusPayload(payroll, statusRes);

      if (merged) {
        const currentStatus = readStatus(merged);
        if (previousStatusRef.current && previousStatusRef.current !== currentStatus) {
          showToast(`Mint durumu güncellendi: ${currentStatus || "unknown"}`, "success");
        }
        previousStatusRef.current = currentStatus;
        setPayroll(merged);

        if (isFinalStatus(currentStatus)) {
          await loadPayroll({ silent: true });
        }
        return;
      }

      await loadPayroll({ silent: true });
    } catch {
      await loadPayroll({ silent: true });
    }
  }, [companyId, employeeId, payroll, showToast, loadPayroll, normalizePayrollStatusPayload]);

  useEffect(() => {
    if (!ready) return;
    loadPayroll();
  }, [ready, loadPayroll]);

  useEffect(() => {
    if (!ready || !payroll) return;
    const status = readStatus(payroll);
    if (!isActiveStatus(status)) return;

    const id = setInterval(() => {
      refreshPayrollStatus();
    }, 4000);

    return () => clearInterval(id);
  }, [ready, payroll, refreshPayrollStatus]);

  const handleDecrypt = async () => {
    if (!payroll) return;

    setDecryptModal({ open: true, loading: true, error: "", payload: null });

    try {
      const res = await decryptPayrollApi(companyId, employeeId, payroll.id);
      setDecryptModal({
        open: true,
        loading: false,
        error: "",
        payload: res.decrypted_payload || res.payload || null,
      });
    } catch (err) {
      setDecryptModal({
        open: true,
        loading: false,
        error: err.message || "Decrypt failed",
        payload: null,
      });
    }
  };

  const closeDecryptModal = () => {
    setDecryptModal({ open: false, loading: false, error: "", payload: null });
  };

  const handleQueueMint = async () => {
    if (!payroll) return;
    try {
      await queuePayrollApi(companyId, employeeId, payroll.id);
      showToast("Mint kuyruğa eklendi", "success");
      await loadPayroll({ silent: true });
    } catch (err) {
      showToast(err.message || "Bir hata oluştu.", "error");
    }
  };

  const handleRetryMint = async () => {
    if (!payroll) return;
    try {
      await retryMintApi(companyId, employeeId, payroll.id);
      showToast("Mint tekrar kuyruğa eklendi", "success");
      await loadPayroll({ silent: true });
    } catch (err) {
      showToast(err.message || "Bir hata oluştu.", "error");
    }
  };

  const badge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      queued: "bg-blue-100 text-blue-700",
      minted: "bg-green-100 text-green-700",
      mint_failed: "bg-red-100 text-red-700",
      sending: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status] || "bg-gray-200 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  const statusText = (status) => {
    const map = {
      pending: "Pending",
      queued: "Queued",
      minted: "Minted",
      mint_failed: "Mint Failed",
      sending: "Sending",
      sent: "Sent",
      failed: "Failed",
    };
    return map[status] || status || "unknown";
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Yükleniyor...</div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex ta-shell">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="ta-page">
            <div className="text-sm text-slate-500">Detay yükleniyor...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !payroll) {
    return (
      <div className="min-h-screen flex ta-shell">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="ta-page space-y-3">
            <button
              onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls`)}
              className="text-xs px-3 py-1 bg-slate-900 text-white rounded"
            >
              ← Listeye Dön
            </button>
            <div className="bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded text-sm">
              {error || "Payroll bulunamadı."}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const nft = payroll.nft || payroll.nftMint || null;
  const imageUrl = nft?.image_url || "/placeholder-nft.png";
  const mintStatus = nft?.status || payroll.status;

  const lineItems = [
    {
      key: "gross",
      label: "Brüt Ücret",
      value: formatCurrencyTrailing(payroll.gross_salary, payroll.currency || "TRY"),
      quantity: "1",
      unit: formatCurrencyTrailing(payroll.gross_salary, payroll.currency || "TRY"),
      discount: "0%",
    },
    {
      key: "bonus",
      label: "Bonus / Prim",
      value:
        payroll.bonus != null
          ? formatCurrencyTrailing(payroll.bonus, payroll.currency || "TRY")
          : formatCurrencyTrailing(0, payroll.currency || "TRY"),
      quantity: "1",
      unit:
        payroll.bonus != null
          ? formatCurrencyTrailing(payroll.bonus, payroll.currency || "TRY")
          : formatCurrencyTrailing(0, payroll.currency || "TRY"),
      discount: "0%",
    },
    {
      key: "deductions",
      label: "Toplam Kesinti",
      value:
        payroll.deductions_total != null
          ? formatCurrencyTrailing(payroll.deductions_total, payroll.currency || "TRY")
          : formatCurrencyTrailing(0, payroll.currency || "TRY"),
      quantity: "1",
      unit:
        payroll.deductions_total != null
          ? formatCurrencyTrailing(payroll.deductions_total, payroll.currency || "TRY")
          : formatCurrencyTrailing(0, payroll.currency || "TRY"),
      discount: "-",
    },
  ];

  const createdAt = payroll?.created_at_formatted || payroll?.created_at || null;
  const updatedAt = payroll?.updated_at_formatted || payroll?.updated_at || null;
  const nftCreatedAt = nft?.created_at_formatted || nft?.created_at || null;

  const timelineItems = [
    {
      key: "created",
      title: "Bordro Kaydı Oluşturuldu",
      desc: `Payroll #${payroll.id}`,
      date: createdAt,
    },
    {
      key: "status",
      title: "Mint Durumu",
      desc: statusText(mintStatus),
      date: updatedAt || createdAt,
    },
    {
      key: "nft",
      title: "NFT Kaydı",
      desc: nft?.token_id ? `Token #${nft.token_id}` : "Token henüz oluşmadı",
      date: nftCreatedAt || updatedAt,
    },
  ];

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ta-page space-y-4">
          <section className="ta-card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Firma #{companyId} / Çalışan #{employeeId}</p>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">Bordro İşlem Detayı</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-600">Payroll ID: #{payroll.id}</span>
                  {badge(mintStatus)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Ödeme: {formatDateDDMMYYYY(payroll.payment_date)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleQueueMint}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Queue
                </button>
                <button
                  onClick={handleRetryMint}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Retry
                </button>
                <button
                  onClick={handleDecrypt}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-[#e9edf7] text-[#111b3a] rounded border border-[#d8e0f3] hover:bg-[#dce4f5]"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Decrypt
                </button>
                <button
                  onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls`)}
                  className="text-xs px-3 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  ← Listeye Dön
                </button>
              </div>
            </div>
            {isActiveStatus(readStatus(payroll)) ? (
              <p className="text-[11px] text-emerald-600 mt-2">Canlı takip açık: durum her 4 sn güncelleniyor.</p>
            ) : null}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="ta-card p-4 xl:col-span-2 space-y-4">
              <h2 className="text-base font-semibold">Bordro Kalemleri</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left text-xs text-slate-500">Kalem</th>
                      <th className="px-2 py-2 text-left text-xs text-slate-500">Adet</th>
                      <th className="px-2 py-2 text-left text-xs text-slate-500">Birim</th>
                      <th className="px-2 py-2 text-left text-xs text-slate-500">İndirim</th>
                      <th className="px-2 py-2 text-right text-xs text-slate-500">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.key} className="border-b last:border-b-0">
                        <td className="px-2 py-2">{item.label}</td>
                        <td className="px-2 py-2">{item.quantity}</td>
                        <td className="px-2 py-2">{item.unit}</td>
                        <td className="px-2 py-2">{item.discount}</td>
                        <td className="px-2 py-2 text-right font-medium">{item.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm">
                  <h3 className="font-medium">Bordro Özeti</h3>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Brüt</span><span>{formatCurrencyTrailing(payroll.gross_salary, payroll.currency || "TRY")}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Bonus</span><span>{payroll.bonus != null ? formatCurrencyTrailing(payroll.bonus, payroll.currency || "TRY") : "-"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Kesinti</span><span>{payroll.deductions_total != null ? formatCurrencyTrailing(payroll.deductions_total, payroll.currency || "TRY") : "-"}</span></div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-semibold"><span>Net</span><span>{formatCurrencyTrailing(payroll.net_salary, payroll.currency || "TRY")}</span></div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm">
                  <h3 className="font-medium">Dönem Bilgileri</h3>
                  <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4" />{formatDateDDMMYYYY(payroll.period_start)} - {formatDateDDMMYYYY(payroll.period_end)}</div>
                  <div className="flex items-center gap-2 text-slate-600"><Landmark className="w-4 h-4" />{payroll.currency || "TRY"}</div>
                  <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4" />{payroll.employer_sign_name || "-"}</div>
                  <div className="flex items-center gap-2 text-slate-600"><Briefcase className="w-4 h-4" />{payroll.employer_sign_title || "-"}</div>
                </div>
              </div>
            </section>

            <section className="ta-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">NFT & Mint</h2>
                {badge(mintStatus)}
              </div>

              <div className="w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img src={imageUrl} alt="Payroll NFT" className="w-full h-28 object-cover" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-500">Durum</p>
                  <p className="font-medium text-slate-800">{statusText(mintStatus)}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-500">Token</p>
                  <p className="font-medium text-slate-800">{nft?.token_id ?? "-"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="text-xs text-slate-500">Tx Hash</p>
                <div className="flex items-center gap-1">
                  {nft?.tx_hash ? (
                    <button
                      onClick={() => navigator.clipboard.writeText(nft.tx_hash)}
                      aria-label="Tx Hash Kopyala"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">-</span>
                  )}
                  {nft?.tx_hash ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${nft.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Etherscan Aç"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                  {nft?.ipfs_cid ? (
                    <a
                      href={`https://ipfs.io/ipfs/${nft.ipfs_cid}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="IPFS Aç"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="ta-card p-4 xl:col-span-1 space-y-3">
              <h2 className="text-base font-semibold">Çalışan Bilgileri</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4" /> Çalışan #{employeeId}</div>
                <div className="flex items-center gap-2 text-slate-600"><DollarSign className="w-4 h-4" /> Net: {formatCurrencyTrailing(payroll.net_salary, payroll.currency || "TRY")}</div>
                <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4" /> Ödeme: {formatDateDDMMYYYY(payroll.payment_date)}</div>
              </div>
            </section>

            <section className="ta-card p-4 xl:col-span-2 space-y-3">
              <h2 className="text-base font-semibold">İşlem Geçmişi</h2>
              <div className="space-y-3">
                {timelineItems.map((item, idx) => (
                  <div key={item.key} className="flex gap-3">
                    <div className="pt-0.5">
                      {idx === timelineItems.length - 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock3 className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDateDDMMYYYY(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {decryptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="ta-card w-full max-w-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Decrypted Payroll #{payroll.id}</h2>
              <button onClick={closeDecryptModal} className="text-sm text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-800">
                <Info className="w-4 h-4" /> Information Alert!
              </div>
              <p className="mt-1 text-xs text-blue-700">
                Decrypt işlemi hassas bordro verisini gösterir. Sadece yetkili kullanıcılar erişmelidir.
              </p>
            </div>

            {decryptModal.loading && <div className="text-sm text-slate-500">Çözümleniyor...</div>}
            {decryptModal.error && <div className="text-sm text-red-600">{decryptModal.error}</div>}

            {!decryptModal.loading && !decryptModal.error && decryptModal.payload && (
              <div className="space-y-2 text-sm">
                {"period_start" in decryptModal.payload && (
                  <div><span className="font-medium">Period Start: </span>{formatDateDDMMYYYY(decryptModal.payload.period_start)}</div>
                )}
                {"period_end" in decryptModal.payload && (
                  <div><span className="font-medium">Period End: </span>{formatDateDDMMYYYY(decryptModal.payload.period_end)}</div>
                )}
                {"gross_salary" in decryptModal.payload && (
                  <div><span className="font-medium">Gross Salary: </span>{decryptModal.payload.gross_salary}</div>
                )}
                {"net_salary" in decryptModal.payload && (
                  <div><span className="font-medium">Net Salary: </span>{decryptModal.payload.net_salary}</div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-slate-600">Tüm payload (JSON)</summary>
                  <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-auto">{JSON.stringify(decryptModal.payload, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
