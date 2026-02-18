"use client";

import ReactDatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { tr } from "date-fns/locale/tr";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("tr", tr);
setDefaultLocale("tr");

// YYYY-MM-DD string -> Date (local time, timezone-safe)
function parseDateStr(str) {
    if (!str || typeof str !== "string") return null;
    const [y, m, d] = str.split("-").map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;
    return date;
}

// Date -> YYYY-MM-DD
function formatDateStr(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Türkçe takvim (ay/yıl isimleri) ile tarih seçici.
 * Form uyumluluğu: value ve onChange native input gibi (value: "YYYY-MM-DD", onChange: e => e.target.value).
 */
export default function DatePicker({
    name,
    value,
    onChange,
    placeholder = "Tarih seçin",
    className = "",
    wrapperClassName = "w-full",
    required = false,
    ...rest
}) {
    const dateValue = parseDateStr(value);

    const handleChange = (date) => {
        const str = formatDateStr(date);
        onChange({ target: { name, value: str } });
    };

    return (
        <ReactDatePicker
            name={name}
            selected={dateValue}
            onChange={handleChange}
            dateFormat="dd-MM-yyyy"
            locale="tr"
            placeholderText={placeholder}
            wrapperClassName={wrapperClassName}
            className={`w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 ${className}`}
            required={required}
            isClearable
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            yearDropdownItemNumber={80}
            scrollableYearDropdown
            {...rest}
        />
    );
}
