import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type PricingSettings } from "@/lib/pricing";
import { fmtDual } from "@/lib/currency";

type Cur = "usd" | "inr";

interface Form {
  name: string;
  cost: string;
  costCur: Cur;
  price: string;
  priceCur: Cur;
  discMode: "pct" | "amount";
  discountPct: string;
  discountAmt: string;
  discountAmtCur: Cur;
  buyerTax: string;
  buyerTaxCur: Cur;
  offsiteAds: boolean;
  adsMode: "none" | "saved" | "custom";
  adsCustom: string;
}

const EMPTY: Form = {
  name: "",
  cost: "",
  costCur: "usd",
  price: "",
  priceCur: "usd",
  discMode: "pct",
  discountPct: "",
  discountAmt: "",
  discountAmtCur: "usd",
  buyerTax: "",
  buyerTaxCur: "usd",
  offsiteAds: false,
  adsMode: "saved",
  adsCustom: "",
};

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

function CurrencyToggle({
  value,
  onChange,
}: {
  value: Cur;
  onChange: (c: Cur) => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
      {(["usd", "inr"] as Cur[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-11 w-10 text-sm font-semibold transition-colors ${
            value === c
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          {c === "usd" ? "$" : "₹"}
        </button>
      ))}
    </div>
  );
}

export function SalesPriceCheckView({ settings }: { settings: PricingSettings }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [checked, setChecked] = useState<Form | null>(null);

  const rate = settings.usdInrRate > 0 ? settings.usdInrRate : 1;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const toUsd = (v: string, cur: Cur) => (cur === "inr" ? num(v) / rate : num(v));

  /** Live preview of the entered values (before pressing Check). */
  const live = useMemo(() => {
    const S = toUsd(form.price, form.priceCur);
    let pct: number;
    let amt: number;
    if (form.discMode === "amount") {
      amt = toUsd(form.discountAmt, form.discountAmtCur);
      pct = S + amt > 0 ? (amt / (S + amt)) * 100 : 0;
    } else {
      pct = num(form.discountPct);
      amt = pct > 0 && pct < 100 ? (S * pct) / (100 - pct) : 0;
    }
    return { S, cost: toUsd(form.cost, form.costCur), pct, amt };
  }, [form, rate]);

  const result = useMemo(() => {
    if (!checked) return null;
    const c = checked;
    const cToUsd = (v: string, cur: Cur) => (cur === "inr" ? num(v) / rate : num(v));
    const S = cToUsd(c.price, c.priceCur);
    const cost = cToUsd(c.cost, c.costCur);
    const buyerTax = cToUsd(c.buyerTax, c.buyerTaxCur);

    let discountPct: number;
    let discountAmt: number;
    if (c.discMode === "amount") {
      discountAmt = cToUsd(c.discountAmt, c.discountAmtCur);
      discountPct = S + discountAmt > 0 ? (discountAmt / (S + discountAmt)) * 100 : 0;
    } else {
      discountPct = num(c.discountPct);
      discountAmt =
        discountPct > 0 && discountPct < 100 ? (S * discountPct) / (100 - discountPct) : 0;
    }

    const fixedUsd = settings.processingFeeFixedInr / rate;

    const tf = S * (settings.transactionFee / 100);
    const pf = (S + buyerTax) * (settings.processingFee / 100) + fixedUsd;
    const reg = S * (settings.regulatoryFee / 100);
    const gst = (tf + pf + reg) * (settings.sellerFeeGst / 100);
    const offsite = c.offsiteAds ? S * (settings.offsiteAdsPct / 100) : 0;
    const tds = S * (settings.tds / 100);
    const tcs = S * (settings.tcs / 100);
    const payout = S - tf - pf - reg - gst - offsite - tds - tcs;
    const adsPct =
      c.adsMode === "none" ? 0 : c.adsMode === "custom" ? num(c.adsCustom) : settings.adsSpend;
    const ads = S * (adsPct / 100);
    const revenueAfterFees = S - tf - pf - reg - gst - offsite;
    const profitBefore =
      revenueAfterFees -
      ads -
      settings.shipping -
      cost -
      (settings.tdsTcsFinalCost ? tds + tcs : 0);
    const tax = profitBefore > 0 ? profitBefore * (settings.incomeTax / 100) : 0;
    const net = profitBefore - tax;
    const margin = S > 0 ? (net / S) * 100 : 0;
    const original = S + discountAmt;
    const totalFees = tf + pf + reg + gst + offsite;

    return {
      S,
      cost,
      buyerTax,
      discountPct,
      discountAmt,
      original,
      tf,
      pf,
      fixedUsd,
      reg,
      gst,
      offsite,
      tds,
      tcs,
      totalFees,
      payout,
      ads,
      adsPct,
      profitBefore,
      tax,
      net,
      margin,
      good: margin >= settings.targetNetProfit,
    };
  }, [checked, settings, rate]);

  const lines: [string, string, boolean?][] = result
    ? [
        ["Product Cost", fmtDual(result.cost)],
        ...(result.discountAmt > 0
          ? ([
              ["Original Etsy Price", fmtDual(result.original)],
              [
                `Discount (${result.discountPct.toFixed(2)}%)`,
                `− ${fmtDual(result.discountAmt)}`,
              ],
            ] as [string, string][])
          : []),
        ["Selling Price", fmtDual(result.S), true],
        [`Etsy Transaction Fee (${settings.transactionFee}%)`, `− ${fmtDual(result.tf)}`],
        [
          `Payment Processing Fee (${settings.processingFee}% + ₹${settings.processingFeeFixedInr})`,
          `− ${fmtDual(result.pf)}`,
        ],
        [`Regulatory Fee (${settings.regulatoryFee}%)`, `− ${fmtDual(result.reg)}`],
        ...(settings.sellerFeeGst > 0
          ? ([["GST on Seller Fees", `− ${fmtDual(result.gst)}`]] as [string, string][])
          : []),
        ...(result.offsite > 0
          ? ([
              [`Offsite Ads (${settings.offsiteAdsPct}%)`, `− ${fmtDual(result.offsite)}`],
            ] as [string, string][])
          : []),
        ["Total Etsy Fees", `− ${fmtDual(result.totalFees)}`, true],
        [`TDS (${settings.tds}%)`, `− ${fmtDual(result.tds)}`],
        [`TCS (${settings.tcs}%)`, `− ${fmtDual(result.tcs)}`],
        ["Expected Etsy Cash Payout", fmtDual(result.payout), true],
        [`Average Ads Cost (${result.adsPct}%)`, `− ${fmtDual(result.ads)}`],
        ["Shipping Cost", `− ${fmtDual(settings.shipping)}`],
        ["Product Cost", `− ${fmtDual(result.cost)}`],
        ...(settings.tdsTcsFinalCost
          ? ([
              ["TDS + TCS (final cost)", `− ${fmtDual(result.tds + result.tcs)}`],
            ] as [string, string][])
          : []),
        ["Profit Before Income Tax", fmtDual(result.profitBefore), true],
        [`Income Tax (${settings.incomeTax}%)`, `− ${fmtDual(result.tax)}`],
        ["Final Net Profit", fmtDual(result.net), true],
      ]
    : [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-xl">Sales Price Check</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter a real selling price and product cost in $ or ₹ — see the full money flow in
            both currencies using your saved Pricing Logic.
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Product Name
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. 14KT LGD Solitaire Ring"
              className="h-11 mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Product Cost
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.cost}
                placeholder={form.costCur === "usd" ? "270" : "25000"}
                onChange={(e) => set({ cost: e.target.value })}
                className="h-11"
              />
              <CurrencyToggle value={form.costCur} onChange={(c) => set({ costCur: c })} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {fmtDual(live.cost)}
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Selling Price
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                placeholder={form.priceCur === "usd" ? "584" : "55480"}
                onChange={(e) => set({ price: e.target.value })}
                className="h-11"
              />
              <CurrencyToggle value={form.priceCur} onChange={(c) => set({ priceCur: c })} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{fmtDual(live.S)}</p>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Discount
            </Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {(
                [
                  ["pct", "Discount %"],
                  ["amount", "Discount Amount"],
                ] as ["pct" | "amount", string][]
              ).map(([mode, label]) => (
                <Button
                  key={mode}
                  type="button"
                  variant={form.discMode === mode ? "default" : "outline"}
                  className="h-10"
                  onClick={() => set({ discMode: mode })}
                >
                  {label}
                </Button>
              ))}
              {form.discMode === "pct" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.discountPct}
                    placeholder="30"
                    onChange={(e) => set({ discountPct: e.target.value })}
                    className="h-11 w-28 text-right"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.discountAmt}
                    placeholder={form.discountAmtCur === "usd" ? "50" : "4750"}
                    onChange={(e) => set({ discountAmt: e.target.value })}
                    className="h-11 w-32 text-right"
                  />
                  <CurrencyToggle
                    value={form.discountAmtCur}
                    onChange={(c) => set({ discountAmtCur: c })}
                  />
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              Discount: {live.pct.toFixed(2)}% | {fmtDual(live.amt)} · Original{" "}
              {fmtDual(live.S + live.amt)}
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Buyer Tax (optional)
            </Label>
            <div className="mt-1.5 flex gap-2 sm:max-w-xs">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.buyerTax}
                placeholder="0"
                onChange={(e) => set({ buyerTax: e.target.value })}
                className="h-11"
              />
              <CurrencyToggle
                value={form.buyerTaxCur}
                onChange={(c) => set({ buyerTaxCur: c })}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Ads Spend
            </Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {(
                [
                  ["none", "No Ads"],
                  ["saved", `Yes — Saved (${settings.adsSpend}%)`],
                  ["custom", "Custom %"],
                ] as ["none" | "saved" | "custom", string][]
              ).map(([mode, label]) => (
                <Button
                  key={mode}
                  type="button"
                  variant={form.adsMode === mode ? "default" : "outline"}
                  className="h-10"
                  onClick={() => set({ adsMode: mode })}
                >
                  {label}
                </Button>
              ))}
              {form.adsMode === "custom" && (
                <Input
                  type="number"
                  step="0.01"
                  value={form.adsCustom}
                  placeholder="10"
                  onChange={(e) => set({ adsCustom: e.target.value })}
                  className="h-10 w-24 text-right"
                />
              )}
            </div>
          </div>
          <label className="sm:col-span-2 flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Offsite Ads on this order</span>
            <input
              type="checkbox"
              checked={form.offsiteAds}
              onChange={(e) => set({ offsiteAds: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>
          <div className="sm:col-span-2 flex gap-3">
            <Button className="flex-1 h-12" onClick={() => setChecked(form)}>
              Check Sale Price
            </Button>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => {
                setForm(EMPTY);
                setChecked(null);
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="shadow-soft border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="font-display text-xl">
              {checked?.name?.trim() || "Breakdown"}
            </CardTitle>
            <Badge
              className={
                result.good
                  ? "bg-success text-white hover:bg-success"
                  : "bg-destructive text-white hover:bg-destructive"
              }
            >
              {result.good ? "GOOD PRICE" : "LOW PRICE"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            {lines.map(([label, value, strong], i) => (
              <div
                key={`${label}-${i}`}
                className={`flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                  strong ? "bg-muted font-semibold" : ""
                }`}
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums text-foreground">{value}</span>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-primary/10 px-3 py-3 mt-2">
              <span className="font-semibold">Net Profit Margin</span>
              <span
                className={`tabular-nums text-lg font-bold ${
                  result.good ? "text-success" : "text-destructive"
                }`}
              >
                {result.margin.toFixed(2)}%
              </span>
            </div>
            <p className="px-3 pt-1 text-xs text-muted-foreground">
              Target net profit: {settings.targetNetProfit}% · USD/INR {settings.usdInrRate}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
