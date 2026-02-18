export function formatDateDDMMYYYY(value) {
  if (!value) return "-";

  if (typeof value === "string") {
    const isoOnlyDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoOnlyDate) {
      return `${isoOnlyDate[3]}-${isoOnlyDate[2]}-${isoOnlyDate[1]}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateTimeDDMMYYYY(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hour}:${minute}`;
}
