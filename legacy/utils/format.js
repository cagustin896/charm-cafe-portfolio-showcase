export const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2
});

export function formatMoney(value) {
  return peso.format(value || 0).replace("PHP", "₱");
}

export function todayLabel() {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}
