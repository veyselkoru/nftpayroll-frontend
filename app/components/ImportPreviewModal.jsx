"use client";

export default function ImportPreviewModal({
    open,
    onClose,
    preview,
    onConfirm,
    loading,
}) {
    if (!open || !preview) return null;

    const { fileName, total, validCount, invalidCount, invalidItems } = preview;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm md:text-base font-semibold text-slate-800">
                        JSON Önizleme – Toplu Payroll Yükleme
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-2 text-xs md:text-sm text-slate-700">
                    {fileName && (
                        <p className="text-[11px] text-slate-500">
                            Dosya: <span className="font-medium">{fileName}</span>
                        </p>
                    )}

                    <p>
                        Toplam <span className="font-semibold">{total}</span> kayıt
                        bulundu.{" "}
                        <span className="text-emerald-600 font-semibold">
                            {validCount} geçerli
                        </span>
                        ,{" "}
                        <span className="text-red-600 font-semibold">
                            {invalidCount} hatalı
                        </span>
                        .
                    </p>

                    {invalidCount > 0 && (
                        <div className="mt-2 border border-red-100 bg-red-50 rounded p-2 max-h-52 overflow-auto">
                            <p className="text-[11px] font-semibold text-red-700 mb-1">
                                Hatalı kayıtlar (ilk {Math.min(invalidItems.length, 15)} gösteriliyor):
                            </p>
                            {invalidItems.slice(0, 15).map((item) => (
                                <div
                                    key={item.index}
                                    className="mb-2 pb-2 border-b border-red-100 last:border-b-0 last:pb-0"
                                >
                                    <p className="text-[11px] font-semibold text-red-700">
                                        Kayıt #{item.index + 1}
                                    </p>
                                    {item.summary && (
                                        <p className="text-[11px] text-slate-700">
                                            {item.summary}
                                        </p>
                                    )}
                                    {item.errors?.length > 0 && (
                                        <ul className="mt-1 text-[11px] text-red-700 list-disc list-inside">
                                            {item.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                            {invalidItems.length > 15 && (
                                <p className="mt-1 text-[11px] text-red-600">
                                    Toplam {invalidItems.length} hatalı kayıt var, ilk 15 gösteriliyor.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-4 flex flex-col md:flex-row gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded border border-slate-300 text-xs md:text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        disabled={loading}
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs md:text-sm hover:bg-slate-800 disabled:opacity-60"
                        disabled={loading || validCount === 0}
                    >
                        {loading
                            ? "İçe aktarılıyor..."
                            : `Tüm geçerli kayıtları içeri aktar (${validCount})`}
                    </button>
                </div>
            </div>
        </div>
    );
}
