export interface PricingSettings {
  transactionFee: number; // %
  gstOnTransactionFee: number; // %
  processingFee: number; // %
  gstOnProcessingFee: number; // %
  adsSpend: number; // %
  gstAfterBank: number; // %
  incomeTax: number; // %
  targetNetProfit: number; // %
  shipping: number; // $
}

export const DEFAULT_SETTINGS: PricingSettings = {
  transactionFee: 6.5,
  gstOnTransactionFee: 18,
  processingFee: 5,
  gstOnProcessingFee: 18,
  adsSpend: 15,
  gstAfterBank: 3,
  incomeTax: 15,
  targetNetProfit: 10,
  shipping: 60,
};

export interface Breakdown {
  sellingPrice: number;
  transactionFee: number;
  gstOnTransactionFee: number;
  processingFee: number;
  gstOnProcessingFee: number;
  adsSpend: number;
  bankReceived: number;
  gstAfterBank: number;
  shipping: number;
  productCost: number;
  profitBeforeTax: number;
  incomeTax: number;
  netProfit: number;
  netProfitPct: number;
}

/**
 * Compute the required selling price so that net profit (after income tax)
 * equals `targetNetProfit%` of the selling price.
 *
 * S = selling price. Fees proportional to S:
 *   TF = S * tf
 *   GST_TF = TF * gtf = S * tf * gtf
 *   PF = S * pf
 *   GST_PF = PF * gpf = S * pf * gpf
 *   Ads = S * ads
 * Bank = S - (TF + GST_TF + PF + GST_PF + Ads)
 *      = S * (1 - tf*(1+gtf) - pf*(1+gpf) - ads)
 * GST_Bank = Bank * gb
 * NetAfterFees = Bank * (1 - gb)
 * ProfitBeforeTax = NetAfterFees - Shipping - Cost
 * NetProfit = ProfitBeforeTax * (1 - it)
 *
 * Target: NetProfit = S * target
 *   => ProfitBeforeTax = S * target / (1 - it)
 *   => S * K - Shipping - Cost = S * target / (1 - it)
 *   where K = (1 - tf*(1+gtf) - pf*(1+gpf) - ads) * (1 - gb)
 *   => S * (K - target/(1-it)) = Shipping + Cost
 *   => S = (Shipping + Cost) / (K - target/(1-it))
 */
export function calculateSellingPrice(cost: number, s: PricingSettings): number {
  const tf = s.transactionFee / 100;
  const gtf = s.gstOnTransactionFee / 100;
  const pf = s.processingFee / 100;
  const gpf = s.gstOnProcessingFee / 100;
  const ads = s.adsSpend / 100;
  const gb = s.gstAfterBank / 100;
  const it = s.incomeTax / 100;
  const target = s.targetNetProfit / 100;

  const K = (1 - tf * (1 + gtf) - pf * (1 + gpf) - ads) * (1 - gb);
  const denom = K - target / (1 - it);

  if (denom <= 0) return NaN;
  return (s.shipping + cost) / denom;
}

export function computeBreakdown(cost: number, sellingPrice: number, s: PricingSettings): Breakdown {
  const S = sellingPrice;
  const TF = S * (s.transactionFee / 100);
  const GTF = TF * (s.gstOnTransactionFee / 100);
  const PF = S * (s.processingFee / 100);
  const GPF = PF * (s.gstOnProcessingFee / 100);
  const Ads = S * (s.adsSpend / 100);
  const Bank = S - TF - GTF - PF - GPF - Ads;
  const GB = Bank * (s.gstAfterBank / 100);
  const netAfter = Bank - GB;
  const profitBefore = netAfter - s.shipping - cost;
  const tax = profitBefore > 0 ? profitBefore * (s.incomeTax / 100) : 0;
  const net = profitBefore - tax;
  return {
    sellingPrice: S,
    transactionFee: TF,
    gstOnTransactionFee: GTF,
    processingFee: PF,
    gstOnProcessingFee: GPF,
    adsSpend: Ads,
    bankReceived: Bank,
    gstAfterBank: GB,
    shipping: s.shipping,
    productCost: cost,
    profitBeforeTax: profitBefore,
    incomeTax: tax,
    netProfit: net,
    netProfitPct: (net / S) * 100,
  };
}

export interface ParsedProduct {
  name: string;
  cost: number;
}

export function parseProducts(text: string): ParsedProduct[] {
  const out: ParsedProduct[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Match: <name> $<cost> or <name> <cost>
    const m = line.match(/^(.+?)[\s:\-–]+\$?\s*([0-9]+(?:\.[0-9]+)?)\s*$/);
    if (m) {
      out.push({ name: m[1].trim(), cost: parseFloat(m[2]) });
    }
  }
  return out;
}

export function roundPrice(n: number): number {
  return Math.ceil(n); // round up to nearest whole dollar for cleaner Etsy pricing
}
