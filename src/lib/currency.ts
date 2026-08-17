// Dual-currency display helpers. Calculations stay in full-precision USD;
// only displayed values are rounded. The INR rate mirrors the editable
// USD/INR rate saved in Pricing Logic.

let displayRate = 95;

export function setDisplayRate(rate: number) {
  if (Number.isFinite(rate) && rate > 0) displayRate = rate;
}

export function getDisplayRate() {
  return displayRate;
}

export function fmtUsdOnly(n: number) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtInrOnly(n: number) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

/** "$584.00 / ₹55,480" — always both currencies together. */
export function fmtDual(n: number, rate = displayRate) {
  if (!Number.isFinite(n)) return "—";
  return `${fmtUsdOnly(n)} / ${fmtInrOnly(n * rate)}`;
}
