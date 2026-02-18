"use client";

import Select from "react-select";

const select2Styles = {
    control: (base, state) => ({
        ...base,
        minHeight: "38px",
        borderColor: state.isFocused ? "#94a3b8" : "#e2e8f0",
        boxShadow: state.isFocused ? "0 0 0 2px rgba(148, 163, 184, 0.25)" : "none",
        "&:hover": { borderColor: "#cbd5e1" },
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? "#0f172a" : state.isFocused ? "#f1f5f9" : "white",
        color: state.isSelected ? "white" : "#334155",
    }),
    singleValue: (base) => ({
        ...base,
        color: "#334155",
    }),
    placeholder: (base) => ({
        ...base,
        color: "#94a3b8",
    }),
    input: (base) => ({
        ...base,
        "input": { font: "inherit" },
    }),
};

/**
 * Select2-style dropdown. Form uyumluluğu için native select gibi name + value + onChange kullanır.
 * @param {string} name - Form alan adı (onChange'e { target: { name, value } } ile iletilir)
 * @param {string} value - Seçili değer
 * @param {function} onChange - (e) => {} where e.target = { name, value }
 * @param {Array<{value: string, label: string}>} options
 * @param {string} [placeholder] - Placeholder metni
 * @param {string} [className] - Ek sınıflar
 * @param {boolean} [isClearable] - Temizle butonu
 * @param {boolean} [isSearchable] - Arama (varsayılan true)
 */
export default function Select2({
    name,
    value,
    onChange,
    options = [],
    placeholder = "Seçiniz",
    className = "",
    isClearable = false,
    isSearchable = true,
    ...rest
}) {
    const selectedOption = options.find((opt) => opt.value === value) || null;

    const handleChange = (option) => {
        const newValue = option ? option.value : "";
        onChange({ target: { name, value: newValue } });
    };

    return (
        <Select
            name={name}
            value={selectedOption}
            onChange={handleChange}
            options={options}
            placeholder={placeholder}
            isClearable={isClearable}
            isSearchable={isSearchable}
            styles={select2Styles}
            className={className}
            classNamePrefix="select2"
            noOptionsMessage={() => "Seçenek yok"}
            {...rest}
        />
    );
}
