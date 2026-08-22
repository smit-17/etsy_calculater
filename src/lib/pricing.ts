export interface PricingSettings {
  transactionFee: number; // % of selling price
  processingFee: number; // % of selling price
  processingFeeFixedInr: number; // ₹ per order
  usdInrRate: number; // ₹ per $1
  regulatoryFee: number; // %
  sellerFeeGst: number; // % GST charged on seller fees (default 0)
  tds: number; // %
  tcs: number; // %
  payoneerFee: number; // % charged by Payoneer on the Etsy cash payout
  tdsTcsFinalCost: boolean; // treat TDS/TCS as final cost
  adsSpend: number; // average Etsy ads cost %
  offsiteAdsOn: boolean;
  offsiteAdsPct: number; // %
  incomeTax: number; // %
  targetNetProfit: number; // %
  minNetProfit: number; // $ minimum final net profit per order
  shipping: number; // $
  buyerTaxOn: boolean;
  buyerTaxPct: number; // %
}

export const DEFAULT_SETTINGS: PricingSettings = {
  transactionFee: 6.5,
  processingFee: 5,
  processingFeeFixedInr: 25,
  usdInrRate: 95,
  regulatoryFee: 0.05,
  sellerFeeGst: 0,
  tds: 0.1,
  tcs: 0.5,
  payoneerFee: 2.5,
  tdsTcsFinalCost: false,
  adsSpend: 15,
  offsiteAdsOn: false,
  offsiteAdsPct: 15,
  incomeTax: 15,
  targetNetProfit: 10,
  minNetProfit: 50,
  shipping: 60,
  buyerTaxOn: false,
  buyerTaxPct: 0,
};

export interface Breakdown {
  sellingPrice: number;
  transactionFee: number;
  processingFee: number;
  processingFeeFixed: number;
  regulatoryFee: number;
  sellerFeeGst: number;
  offsiteAds: number;
  tds: number;
  tcs: number;
  withheldTotal: number;
  cashPayout: number; // after withholding
  payoneerFee: number;
  bankReceipt: number; // cash payout after Payoneer fee
  revenueAfterEtsyFees: number; // economic, before withholding
  adsSpend: number;
  shipping: number;
  productCost: number;
  profitBeforeTax: number;
  incomeTax: number;
  netProfit: number;
  netProfitPct: number;
  buyerTax: number;
  buyerPays: number;
}

interface Rates {
  tf: number;
  pf: number;
  reg: number;
  gst: number;
  tds: number;
  tcs: number;
  payoneer: number;
  ads: number;
  offsite: number;
  it: number;
  target: number;
  fixedUsd: number;
  final: boolean;
}

/** Per-row overrides. adsPct is an absolute percentage (0 = no ads). */
export interface CalcOptions {
  adsPct?: number;
}

function rates(s: PricingSettings, o?: CalcOptions): Rates {
  const adsPct = o?.adsPct === undefined ? s.adsSpend : o.adsPct;
  return {
    tf: s.transactionFee / 100,
    pf: s.processingFee / 100,
    reg: s.regulatoryFee / 100,
    gst: s.sellerFeeGst / 100,
    tds: s.tds / 100,
    tcs: s.tcs / 100,
    payoneer: (s.payoneerFee || 0) / 100,
    ads: adsPct / 100,
    offsite: s.offsiteAdsOn ? s.offsiteAdsPct / 100 : 0,
    it: s.incomeTax / 100,
    target: s.targetNetProfit / 100,
    fixedUsd: s.usdInrRate > 0 ? s.processingFeeFixedInr / s.usdInrRate : 0,
    final: s.tdsTcsFinalCost,
  };
}

/**
 * Solve for the minimum selling price S (price the customer actually pays,
 * excluding buyer-paid sales tax) so that net profit after income tax equals
 * target% of S. Every fee uses its own base; the fixed ₹ fee is converted
 * with the editable USD/INR rate and never hardcoded.
 *
 * ProfitBeforeTax = S*K − C
 *   K = 1 − (tf+pf+reg)(1+gst) − offsite − ads − (final ? tds+tcs : 0)
 *   C = fixedUsd*(1+gst) + shipping + cost
 * Net = ProfitBeforeTax*(1−it) = target*S
 */
export function calculateSellingPrice(
  cost: number,
  s: PricingSettings,
  o?: CalcOptions
): number {
  const r = rates(s, o);
  // A = share of S left after Etsy fees, B = fixed fee in USD
  const A = 1 - (r.tf + r.pf + r.reg) * (1 + r.gst) - r.offsite;
  const B = r.fixedUsd * (1 + r.gst);
  // Payoneer fee applies to the Etsy cash payout (after TDS/TCS withholding)
  const K =
    A - r.ads - (r.final ? r.tds + r.tcs : 0) - r.payoneer * (A - r.tds - r.tcs);
  const C = B * (1 - r.payoneer) + s.shipping + cost;
  if (!(K > 0)) return NaN;

  // Rule 1: net profit = target% of selling price
  const denom = K - r.target / (1 - r.it);
  const byMargin = denom > 0 ? C / denom : NaN;

  // Rule 2: net profit >= minimum $ amount
  const minNet = s.minNetProfit > 0 ? s.minNetProfit : 0;
  const byMin = minNet > 0 ? (minNet / (1 - r.it) + C) / K : NaN;

  const candidates = [byMargin, byMin].filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return NaN;
  return Math.max(...candidates);
}

/** True when the $ minimum-profit rule drives the price instead of the % target. */
export function isMinProfitDriven(
  cost: number,
  s: PricingSettings,
  o?: CalcOptions
): boolean {
  const r = rates(s, o);
  const A = 1 - (r.tf + r.pf + r.reg) * (1 + r.gst) - r.offsite;
  const B = r.fixedUsd * (1 + r.gst);
  const K =
    A - r.ads - (r.final ? r.tds + r.tcs : 0) - r.payoneer * (A - r.tds - r.tcs);
  const C = B * (1 - r.payoneer) + s.shipping + cost;
  if (!(K > 0)) return false;
  const denom = K - r.target / (1 - r.it);
  const byMargin = denom > 0 ? C / denom : 0;
  const minNet = s.minNetProfit > 0 ? s.minNetProfit : 0;
  const byMin = minNet > 0 ? (minNet / (1 - r.it) + C) / K : 0;
  return byMin > byMargin;
}


export function computeBreakdown(
  cost: number,
  sellingPrice: number,
  s: PricingSettings,
  o?: CalcOptions
): Breakdown {
  const S = sellingPrice;
  const r = rates(s, o);

  const TF = S * r.tf;
  const PF = S * r.pf + r.fixedUsd;
  const REG = S * r.reg;
  const GST = (TF + PF + REG) * r.gst;
  const OFF = S * r.offsite;
  const TDS = S * r.tds;
  const TCS = S * r.tcs;
  const withheld = TDS + TCS;
  const revenueAfterFees = S - TF - PF - REG - GST - OFF;
  const cashPayout = revenueAfterFees - withheld;
  const payoneer = cashPayout * r.payoneer;
  const bankReceipt = cashPayout - payoneer;
  const Ads = S * r.ads;
  const profitBefore =
    revenueAfterFees - Ads - s.shipping - cost - payoneer - (r.final ? withheld : 0);
  const tax = profitBefore > 0 ? profitBefore * r.it : 0;
  const net = profitBefore - tax;
  const buyerTax = s.buyerTaxOn ? S * (s.buyerTaxPct / 100) : 0;
  return {
    sellingPrice: S,
    transactionFee: TF,
    processingFee: PF,
    processingFeeFixed: r.fixedUsd,
    regulatoryFee: REG,
    sellerFeeGst: GST,
    offsiteAds: OFF,
    tds: TDS,
    tcs: TCS,
    withheldTotal: withheld,
    cashPayout,
    payoneerFee: payoneer,
    bankReceipt,
    revenueAfterEtsyFees: revenueAfterFees,
    adsSpend: Ads,
    shipping: s.shipping,
    productCost: cost,
    profitBeforeTax: profitBefore,
    incomeTax: tax,
    netProfit: net,
    netProfitPct: S > 0 ? (net / S) * 100 : 0,
    buyerTax,
    buyerPays: S + buyerTax,
  };
}

export type Currency = "USD" | "INR";

export interface ParsedProduct {
  name: string;
  cost: number; // USD, full precision
  amount: number; // as typed
  currency: Currency;
}

/**
 * Flexible cost parser. Any line containing a name and a number works:
 *   "Silver 25000" · "14KT LGD ₹55,686" · "ABC Ring $300" · "Platinum Moiss - 23811"
 * Currency comes from the symbol when present (₹ / Rs / INR vs $ / USD),
 * otherwise the currently selected default currency is used.
 */
export function parseProducts(
  text: string,
  opts?: { usdInrRate?: number; defaultCurrency?: Currency }
): ParsedProduct[] {
  const rate = opts?.usdInrRate && opts.usdInrRate > 0 ? opts.usdInrRate : 1;
  const def: Currency = opts?.defaultCurrency ?? "USD";
  const out: ParsedProduct[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // last number in the line is the cost
    const numRe = /(-?[0-9][0-9,]*(?:\.[0-9]+)?)/g;
    let m: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((m = numRe.exec(line))) last = m;
    if (!last) continue;
    const amount = parseFloat(last[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const before = line.slice(0, last.index);
    const after = line.slice(last.index + last[0].length);
    const around = `${before} ${after}`;
    let currency: Currency = def;
    if (/₹|\brs\.?\b|\binr\b/i.test(around)) currency = "INR";
    else if (/\$|\busd\b/i.test(around)) currency = "USD";

    const name =
      before
        .replace(/₹|\$/g, " ")
        .replace(/\b(rs\.?|inr|usd|cost|price)\b/gi, " ")
        .replace(/[\s:\-–—|,]+$/, "")
        .trim() || `Item ${out.length + 1}`;

    out.push({
      name,
      cost: currency === "INR" ? amount / rate : amount,
      amount,
      currency,
    });
  }
  return out;
}


export function roundPrice(n: number): number {
  return Math.ceil(n * 100) / 100; // round up so target margin is always met
}

export function compareAtPrice(sellingPrice: number, discountPct: number): number {
  if (!(discountPct > 0) || discountPct >= 100) return sellingPrice;
  return roundPrice(sellingPrice / (1 - discountPct / 100));
}

/* ---------- Jewelry quotation parsing ---------- */

export interface QuotedItem {
  metal: string;
  stone: "LGD" | "Moissanite";
  name: string;
  inr: number;
  cost: number; // USD
}

const METALS: { key: string; label: string; re: RegExp }[] = [
  { key: "10KT", label: "10KT", re: /(^|[^0-9])10\s*(?:kt|k|karat|carat)\b/i },
  { key: "14KT", label: "14KT", re: /(^|[^0-9])14\s*(?:kt|k|karat|carat)\b/i },
  { key: "18KT", label: "18KT", re: /(^|[^0-9])18\s*(?:kt|k|karat|carat)\b/i },
  { key: "SILVER", label: "Silver", re: /\bsilver\b/i },
  { key: "PLATINUM", label: "Platinum", re: /\b(?:platinum|plat|950\s*pt|pt\s*950)\b/i },
];

/** All numeric tokens in a row, in column order. */
function rowNumbers(line: string): { value: number; rupee: boolean }[] {
  // strip purity tokens like "10KT" / "18 K" so they aren't read as amounts
  const cleaned = line.replace(/(^|[^0-9])(\d{2})\s*(?:kt|k|karat|carat)\b/gi, "$1 ");
  const out: { value: number; rupee: boolean }[] = [];
  const re = /(₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const v = parseFloat(m[2].replace(/,/g, ""));
    if (Number.isFinite(v)) out.push({ value: v, rupee: Boolean(m[1]) });
  }
  return out;
}

/**
 * Pick the final LGD / Moissanite totals from a quotation row.
 * Summary format: Purity | Grams | Metal Total | LGD Amount | Moiss. Amount |
 * Total (LGD) | Total (Moiss.)  -> the last two columns are the final costs.
 * Legacy format: Purity | Grams | Metal | LGD | Natural | Moiss.
 */
function pickTotals(
  tokens: { value: number; rupee: boolean }[]
): { lgd: number; moiss: number } | null {
  const nums = tokens.map((t) => t.value);
  const rupeeCount = tokens.filter((t) => t.rupee).length;
  const n = nums.length;
  if (n < 2) return null;
  // Summary table: last two columns are Total (LGD) / Total (Moiss.)
  if (n >= 6) return { lgd: nums[n - 2], moiss: nums[n - 1] };
  // Legacy table: Grams | Metal | LGD | Natural | Moiss.
  if (n === 5 && rupeeCount < 5) return { lgd: nums[2], moiss: nums[4] };
  if (n === 5) return { lgd: nums[n - 2], moiss: nums[n - 1] };
  if (n === 3) return { lgd: nums[0], moiss: nums[2] };
  return { lgd: nums[n - 2], moiss: nums[n - 1] };
}


/**
 * Extract the 10 supported metal × stone combinations from a pasted quotation
 * summary. Values are always read as INR (quotation tables are ₹) and converted
 * with the saved USD/INR rate. 24KT, 22KT and the Natural Diamond column are
 * ignored, and Total (LGD) / Total (Moiss.) are used as-is (already metal +
 * diamond combined) so nothing is double counted.
 */
export function parseJewelryQuotation(
  text: string,
  usdInrRate: number
): QuotedItem[] {
  const rate = usdInrRate > 0 ? usdInrRate : 1;
  const found = new Map<string, QuotedItem>();

  const add = (metal: { key: string; label: string }, lgd: number, moiss: number) => {
    for (const [stone, inr] of [
      ["LGD", lgd],
      ["Moissanite", moiss],
    ] as ["LGD" | "Moissanite", number][]) {
      const key = `${metal.key}-${stone}`;
      if (found.has(key) || !(inr > 0)) continue;
      found.set(key, {
        metal: metal.label,
        stone,
        name: `${metal.label} ${stone}`,
        inr,
        cost: inr / rate,
      });
    }
  };

  const consume = (segment: string) => {
    if (/(^|[^0-9])(?:24|22)\s*(?:kt|k|karat|carat)\b/i.test(segment)) return;
    const metalHit = METALS.find((m) => m.re.test(segment));
    if (!metalHit) return;
    if (found.has(`${metalHit.key}-LGD`) && found.has(`${metalHit.key}-Moissanite`)) return;
    const totals = pickTotals(rowNumbers(segment));
    if (!totals) return;
    add(metalHit, totals.lgd, totals.moiss);
  };

  const metalRe =
    /(?:10|14|18|22|24)\s*(?:kt|k|karat|carat)\b|silver\b|(?:platinum|plat|950\s*pt|pt\s*950)\b/gi;


  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Several rows flattened onto one line — split at each metal name
    metalRe.lastIndex = 0;
    const starts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = metalRe.exec(line))) starts.push(m.index);
    if (starts.length > 1) {
      for (let i = 0; i < starts.length; i++) {
        consume(line.slice(starts[i], starts[i + 1] ?? line.length));
      }
    } else {
      consume(line);
    }
  }


  const order: string[] = [];
  for (const m of METALS) for (const s of ["LGD", "Moissanite"]) order.push(`${m.key}-${s}`);
  return order.filter((k) => found.has(k)).map((k) => found.get(k)!);
}


