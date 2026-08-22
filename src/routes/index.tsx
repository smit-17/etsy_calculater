import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import lifestylelogo from "@/assets/lifestylelogo.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { SalesPriceCheckView } from "@/components/SalesPriceCheckView";
import { toast } from "sonner";
import {
  Calculator as CalcIcon,
  Settings as SettingsIcon,
  Database,
  LogOut,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Save,
  Download,
  Pencil,
  Files,
  Menu,
  X,
  RefreshCw,
  BadgeIndianRupee,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  type PricingSettings,
  calculateSellingPrice,
  isMinProfitDriven,
  computeBreakdown,
  parseProducts,
  roundPrice,
  compareAtPrice,
  parseJewelryQuotation,
} from "@/lib/pricing";
import { fmtDual, fmtUsdOnly, fmtInrOnly, getDisplayRate, setDisplayRate } from "@/lib/currency";
import {
  loadSettings,
  saveSettings,
  loadSaved,
  addSaved,
  deleteSaved,
  updateSaved,
  isAuthed,
  setAuthed,
  bumpCalcCount,
  type SavedPrice,
} from "@/lib/storage";

const PASSWORD = "2424";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LEPDO Etsy India Pricing Calculator" },
      {
        name: "description",
        content:
          "Solve the minimum Etsy selling price for India-based jewelry sellers after fees, TDS/TCS, ads, shipping and income tax.",
      },
      { property: "og:title", content: "LEPDO Etsy India Pricing Calculator" },
      {
        property: "og:description",
        content:
          "Accurate Etsy India selling-price solver with money-flow breakdown, SKU library and real-order calibration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

/* ---------------- Login ---------------- */

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === PASSWORD) {
      setAuthed(true);
      onSuccess();
    } else {
      setErr("Wrong Password. Please Try Again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background to-secondary/40">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-card p-10 shadow-elegant border border-border/60">
          <div className="flex flex-col items-center text-center">
            <img
              src={lifestylelogo}
              alt="LEPDO Lifestyle"
              className="h-24 w-24 rounded-2xl object-cover shadow-soft"
            />
            <h1 className="mt-6 text-3xl font-display font-semibold text-primary">
              LEPDO Lifestyle
            </h1>
            <p className="mt-1 text-sm text-muted-foreground tracking-wide uppercase">
              Etsy Pricing Studio
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="pw" className="text-xs uppercase tracking-wider text-muted-foreground">
                Access Password
              </Label>
              <Input
                id="pw"
                type="password"
                autoFocus
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr("");
                }}
                className="mt-2 h-12 text-lg"
                placeholder="••••"
              />
            </div>
            {err && (
              <p className="text-sm text-destructive font-medium">{err}</p>
            )}
            <Button type="submit" className="w-full h-12 text-base">
              Enter Dashboard
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LEPDO Lifestyle — Private business tool.
        </p>
      </div>
    </div>
  );
}

/* ---------------- App Shell ---------------- */

type Section = "calculator" | "settings" | "saved" | "salecheck";

function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthedState] = useState(false);
  const [section, setSection] = useState<Section>("calculator");
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<SavedPrice[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setAuthedState(isAuthed());
    setSettings(loadSettings());
    setSaved(loadSaved());
    setReady(true);
  }, []);

  useEffect(() => {
    setDisplayRate(settings.usdInrRate);
  }, [settings.usdInrRate]);

  function refreshSaved() {
    setSaved(loadSaved());
  }

  if (!ready) return null;
  if (!authed) return <><Login onSuccess={() => setAuthedState(true)} /><Toaster /></>;

  function logout() {
    setAuthed(false);
    setAuthedState(false);
  }

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "calculator", label: "Calculator", icon: CalcIcon },
    { id: "settings", label: "Pricing Logic", icon: SettingsIcon },
    { id: "saved", label: "Saved SKUs", icon: Database },
    { id: "salecheck", label: "Sales Price Check", icon: BadgeIndianRupee },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <SidebarContent
          navItems={navItems}
          section={section}
          setSection={setSection}
          logout={logout}
        />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <SidebarContent
              navItems={navItems}
              section={section}
              setSection={(s) => {
                setSection(s);
                setMobileOpen(false);
              }}
              logout={logout}
            />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-card px-4 sm:px-8 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden shrink-0 p-2 -ml-2 rounded-md hover:bg-muted"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                LEPDO Lifestyle
              </p>
              <h2 className="truncate font-display text-xl sm:text-2xl font-semibold text-foreground">
                {section === "calculator"
                  ? "Etsy Pricing Calculator"
                  : section === "settings"
                  ? "Pricing Logic Settings"
                  : section === "saved"
                  ? "Saved SKUs & Prices"
                  : "Sales Price Check"}
              </h2>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </header>

        <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {section === "calculator" && (
            <CalculatorView
              settings={settings}
              onSaved={refreshSaved}
            />
          )}
          {section === "settings" && (
            <SettingsView
              settings={settings}
              onChange={(s) => {
                setSettings(s);
                saveSettings(s);
              }}
            />
          )}
          {section === "saved" && (
            <SavedView saved={saved} refresh={refreshSaved} settings={settings} />
          )}
          {section === "salecheck" && <SalesPriceCheckView settings={settings} />}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function SidebarContent({
  navItems,
  section,
  setSection,
  logout,
}: {
  navItems: { id: Section; label: string; icon: React.ElementType }[];
  section: Section;
  setSection: (s: Section) => void;
  logout: () => void;
}) {
  return (
    <>
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
        <img
          src={lifestylelogo}
          alt="LEPDO"
          className="h-11 w-11 rounded-xl object-cover shadow-soft"
        />
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-none">
            LEPDO
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] mt-1 opacity-70">
            Lifestyle
          </p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((n) => {
          const Icon = n.icon;
          const active = section === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

/* ---------------- Calculator ---------------- */

interface CalcRow {
  id: string;
  name: string;
  cost: number;
  costNote?: string;
  priceMode: "auto" | "manual";
  manualPrice: number;
  sku: string;
  discountPct: number;
  adsOn: boolean;
  adsPct: number;
  marginType: "none" | "pct" | "fixed";
  marginPct: number;
  marginUsd: number;
  expanded: boolean;
}

const DISCOUNTS = [0, 10, 20, 30, 40, 50];
const MARGIN_PRESETS = [5, 10, 15, 20];
const ADS_PRESETS = [5, 10, 15, 20];

function Dual({
  value,
  className = "",
  inrClass = "text-muted-foreground",
}: {
  value: number;
  className?: string;
  inrClass?: string;
}) {
  return (
    <div className={`leading-tight tabular-nums ${className}`}>
      <div>{fmtUsdOnly(value)}</div>
      <div className={`text-[11px] ${inrClass}`}>
        {fmtInrOnly(value * getDisplayRate())}
      </div>
    </div>
  );
}

function useRowCalc(row: CalcRow, settings: PricingSettings) {
  return useMemo(() => {
    const opts = { adsPct: row.adsOn ? row.adsPct : 0 };
    const rawBase = calculateSellingPrice(row.cost, settings, opts);
    const base = Number.isFinite(rawBase) ? roundPrice(rawBase) : 0;

    // A % margin is a TARGET net-profit margin: re-solve the price so that
    // net profit ÷ selling price equals exactly that %. A fixed amount is
    // simply added on top of the base required price.
    let auto = base;
    if (row.marginType === "pct" && row.marginPct > 0) {
      const raw = calculateSellingPrice(
        row.cost,
        { ...settings, targetNetProfit: row.marginPct },
        opts
      );
      auto = Number.isFinite(raw) ? roundPrice(raw) : 0;
    } else if (row.marginType === "fixed") {
      auto = roundPrice(base + row.marginUsd);
    }
    const marginAmount = auto - base;
    const targetSettings =
      row.marginType === "pct" && row.marginPct > 0
        ? { ...settings, targetNetProfit: row.marginPct }
        : settings;
    const minApplied =
      row.priceMode === "auto" && isMinProfitDriven(row.cost, targetSettings, opts);
    const selling = row.priceMode === "auto" ? auto : row.manualPrice;
    const bd = computeBreakdown(row.cost, selling, settings, opts);
    const original = compareAtPrice(selling, row.discountPct);
    return { base, marginAmount, auto, selling, bd, original, minApplied };
  }, [row, settings]);
}


function CalculatorView({
  settings,
  onSaved,
}: {
  settings: PricingSettings;
  onSaved: () => void;
}) {
  const [input, setInput] = useState("");
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [rows, setRows] = useState<CalcRow[]>([]);

  // Global pre-calculate options — default 40% discount, 10% target margin
  const [discountMode, setDiscountMode] = useState<"none" | "preset" | "custom">("preset");
  const [discountPreset, setDiscountPreset] = useState(40);
  const [discountCustom, setDiscountCustom] = useState("");

  const [marginMode, setMarginMode] = useState<"none" | "preset" | "custom">("preset");
  const [marginPreset, setMarginPreset] = useState(10);
  const [marginKind, setMarginKind] = useState<"pct" | "amount">("pct");
  const [marginCustom, setMarginCustom] = useState("");
  const [marginCurrency, setMarginCurrency] = useState<"USD" | "INR">("USD");

  const discountPct =
    discountMode === "none"
      ? 0
      : discountMode === "preset"
      ? discountPreset
      : parseFloat(discountCustom) || 0;

  const marginCfg = useMemo(() => {
    if (marginMode === "none") return { marginType: "none" as const, marginPct: 0, marginUsd: 0 };
    if (marginMode === "preset")
      return { marginType: "pct" as const, marginPct: marginPreset, marginUsd: 0 };
    const v = parseFloat(marginCustom) || 0;
    if (marginKind === "pct")
      return { marginType: "pct" as const, marginPct: v, marginUsd: 0 };
    const usd = marginCurrency === "INR" ? v / (settings.usdInrRate || 1) : v;
    return { marginType: "fixed" as const, marginPct: 0, marginUsd: usd };
  }, [marginMode, marginPreset, marginKind, marginCustom, marginCurrency, settings.usdInrRate]);

  function buildRows(parsed: { name: string; cost: number; note?: string }[]) {
    const nextRows: CalcRow[] = parsed.map((p, i) => ({
      id: `${Date.now()}-${i}`,
      name: p.name,
      cost: p.cost,
      costNote: p.note,
      priceMode: "auto",
      manualPrice: 0,
      sku: "",
      discountPct,
      adsOn: true,
      adsPct: settings.adsSpend,
      ...marginCfg,
      expanded: false,
    }));
    setRows(nextRows);
    bumpCalcCount(nextRows.length);
    toast.success(`Calculated ${nextRows.length} item${nextRows.length > 1 ? "s" : ""}.`);
  }

  function calculate() {
    // A pasted quotation table is detected automatically; otherwise free-form lines.
    const quoted = parseJewelryQuotation(input, settings.usdInrRate);
    if (quoted.length >= 2) {
      buildRows(
        quoted.map((it) => ({
          name: it.name,
          cost: it.cost,
          note: `₹${it.inr.toLocaleString("en-IN")}`,
        }))
      );
      return;
    }
    const parsed = parseProducts(input, {
      usdInrRate: settings.usdInrRate,
      defaultCurrency: currency,
    });
    if (!parsed.length) {
      toast.error("No costs detected. Write a name and a number on each line.");
      return;
    }
    buildRows(
      parsed.map((p) => ({
        name: p.name,
        cost: p.cost,
        note:
          p.currency === "INR"
            ? `₹${p.amount.toLocaleString("en-IN")}`
            : undefined,
      }))
    );
  }

  function update(id: string, patch: Partial<CalcRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function saveRow(r: CalcRow, selling: number, original: number, netProfit: number, margin: number) {
    if (!r.sku.trim()) {
      toast.error("Open the row and enter a SKU before saving.");
      update(r.id, { expanded: true });
      return;
    }
    addSaved({
      id: `${Date.now()}-${r.id}`,
      date: new Date().toISOString(),
      sku: r.sku.trim(),
      productName: r.name,
      cost: r.cost,
      sellingPrice: selling,
      originalPrice: original,
      discountPct: r.discountPct,
      netProfit,
      netMargin: margin,
    });
    onSaved();
    toast.success(`Saved ${r.sku}`);
  }

  const selectCls =
    "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <Card className="shadow-soft border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="font-display text-xl">Cost Calculator</CardTitle>
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {(["USD", "INR"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                className="h-8 px-3"
                variant={currency === c ? "default" : "ghost"}
                onClick={() => setCurrency(c)}
              >
                {c === "USD" ? "$ USD" : "₹ INR"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={7}
            className="font-mono text-base"
            placeholder={"Silver 25000\n14KT LGD 55686\nABC Ring 300"}
          />

          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={calculate} className="h-11 px-6 hidden md:inline-flex">
              <CalcIcon className="h-4 w-4 mr-2" />
              Calculate
            </Button>

            {/* Discount */}
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Discount
              </Label>
              <div className="flex items-center gap-2">
                <select
                  value={discountMode}
                  onChange={(e) => setDiscountMode(e.target.value as typeof discountMode)}
                  className={selectCls}
                >
                  <option value="none">No Discount</option>
                  <option value="preset">Preset %</option>
                  <option value="custom">Custom %</option>
                </select>
                {discountMode === "preset" && (
                  <select
                    value={discountPreset}
                    onChange={(e) => setDiscountPreset(parseFloat(e.target.value))}
                    className={selectCls}
                  >
                    {DISCOUNTS.filter((d) => d > 0).map((d) => (
                      <option key={d} value={d}>
                        {d}%
                      </option>
                    ))}
                  </select>
                )}
                {discountMode === "custom" && (
                  <Input
                    type="number"
                    value={discountCustom}
                    onChange={(e) => setDiscountCustom(e.target.value)}
                    placeholder="0"
                    className="h-9 w-20 text-right"
                  />
                )}
              </div>
            </div>

            {/* Target Net Profit Margin */}
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Target Net Profit Margin
              </Label>
              <div className="flex items-center gap-2">
                <select
                  value={marginMode}
                  onChange={(e) => setMarginMode(e.target.value as typeof marginMode)}
                  className={selectCls}
                >
                  <option value="none">Use Saved Target</option>
                  <option value="preset">Preset %</option>
                  <option value="custom">Custom</option>
                </select>
                {marginMode === "preset" && (
                  <select
                    value={marginPreset}
                    onChange={(e) => setMarginPreset(parseFloat(e.target.value))}
                    className={selectCls}
                  >
                    {MARGIN_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}%
                      </option>
                    ))}
                  </select>
                )}
                {marginMode === "custom" && (
                  <>
                    <select
                      value={marginKind}
                      onChange={(e) => setMarginKind(e.target.value as typeof marginKind)}
                      className={selectCls}
                    >
                      <option value="pct">%</option>
                      <option value="amount">Amount</option>
                    </select>
                    {marginKind === "amount" && (
                      <select
                        value={marginCurrency}
                        onChange={(e) =>
                          setMarginCurrency(e.target.value as typeof marginCurrency)
                        }
                        className={selectCls}
                      >
                        <option value="USD">$</option>
                        <option value="INR">₹</option>
                      </select>
                    )}
                    <Input
                      type="number"
                      value={marginCustom}
                      onChange={(e) => setMarginCustom(e.target.value)}
                      placeholder="0"
                      className="h-9 w-24 text-right"
                    />
                  </>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 hidden md:inline-flex"
              onClick={() => {
                setInput("");
                setRows([]);
              }}
            >
              Clear
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Write anything — a name plus a number per line. Use ₹ or $ to force a currency,
            otherwise the selected one is used (₹{settings.usdInrRate}/$1). A full jewelry
            quotation table can be pasted here too.
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          {/* Mobile results */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <MobileResult
                key={r.id}
                row={r}
                settings={settings}
                update={update}
                onSave={saveRow}
              />
            ))}
          </div>

          {/* Desktop results */}
          <Card className="shadow-soft border-border/60 overflow-hidden hidden md:block">
            <CardHeader>
              <CardTitle className="font-display text-xl">Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead className="w-8" />
                      <TableHead className="min-w-[150px]">Product</TableHead>
                      <TableHead className="w-[110px] text-right">Cost</TableHead>
                      <TableHead className="w-[120px] text-right">Selling</TableHead>
                      <TableHead className="w-[104px]">Discount</TableHead>
                      <TableHead className="w-[110px] text-right">Original</TableHead>
                      <TableHead className="w-[110px] text-right">Net Profit</TableHead>
                      <TableHead className="w-[74px] text-right">Margin</TableHead>
                      <TableHead className="w-[88px] text-right">Save</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <RowItem
                        key={r.id}
                        row={r}
                        settings={settings}
                        update={update}
                        onSave={saveRow}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sticky mobile calculate */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur p-3 flex gap-2">
        <Button onClick={calculate} className="flex-1 h-12 text-base">
          <CalcIcon className="h-4 w-4 mr-2" /> Calculate
        </Button>
        <Button
          variant="outline"
          className="h-12"
          onClick={() => {
            setInput("");
            
            setRows([]);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

type SaveFn = (
  row: CalcRow,
  selling: number,
  original: number,
  netProfit: number,
  margin: number
) => void;

function DiscountSelect({
  row,
  update,
}: {
  row: CalcRow;
  update: (id: string, patch: Partial<CalcRow>) => void;
}) {
  const preset = DISCOUNTS.includes(row.discountPct);
  return (
    <div className="flex items-center gap-1">
      <select
        value={preset ? String(row.discountPct) : "custom"}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") update(row.id, { discountPct: row.discountPct || 0 });
          else update(row.id, { discountPct: parseFloat(v) });
        }}
        className="h-9 w-[76px] rounded-md border border-input bg-background px-2 text-sm"
      >
        {DISCOUNTS.map((d) => (
          <option key={d} value={d}>
            {d === 0 ? "None" : `${d}%`}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {!preset && (
        <Input
          type="number"
          value={row.discountPct}
          onChange={(e) => update(row.id, { discountPct: parseFloat(e.target.value) || 0 })}
          className="h-9 w-16 text-right px-2"
          min={0}
          max={95}
        />
      )}
    </div>
  );
}

function RowControls({
  row,
  auto,
  update,
}: {
  row: CalcRow;
  auto: number;
  update: (id: string, patch: Partial<CalcRow>) => void;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Cost ($)
        </Label>
        <Input
          type="number"
          step="0.01"
          value={Number(row.cost.toFixed(2))}
          onChange={(e) => update(row.id, { cost: parseFloat(e.target.value) || 0 })}
          className="h-10 mt-1"
        />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Selling Price
        </Label>
        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="h-10"
            variant={row.priceMode === "auto" ? "default" : "outline"}
            onClick={() => update(row.id, { priceMode: "auto" })}
          >
            Auto
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-10"
            variant={row.priceMode === "manual" ? "default" : "outline"}
            onClick={() =>
              update(row.id, {
                priceMode: "manual",
                manualPrice: row.manualPrice || auto,
              })
            }
          >
            Manual
          </Button>
          {row.priceMode === "manual" && (
            <Input
              type="number"
              step="0.01"
              value={row.manualPrice}
              onChange={(e) => update(row.id, { manualPrice: parseFloat(e.target.value) || 0 })}
              className="h-10 w-24 text-right"
            />
          )}
        </div>
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Ads
        </Label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-10"
            variant={row.adsOn ? "default" : "outline"}
            onClick={() => update(row.id, { adsOn: true })}
          >
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-10"
            variant={!row.adsOn ? "default" : "outline"}
            onClick={() => update(row.id, { adsOn: false })}
          >
            No
          </Button>
          {row.adsOn && (
            <>
              <select
                value={ADS_PRESETS.includes(row.adsPct) ? String(row.adsPct) : "custom"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v !== "custom") update(row.id, { adsPct: parseFloat(v) });
                }}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                {ADS_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}%
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
              <Input
                type="number"
                step="0.01"
                value={row.adsPct}
                onChange={(e) => update(row.id, { adsPct: parseFloat(e.target.value) || 0 })}
                className="h-10 w-20 text-right"
              />
            </>
          )}
        </div>
      </div>
      <div className="sm:col-span-3">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          SKU
        </Label>
        <Input
          value={row.sku}
          onChange={(e) => update(row.id, { sku: e.target.value })}
          placeholder="LP-XX-000"
          className="h-10 mt-1 max-w-xs"
        />
      </div>
    </div>
  );
}

function MobileResult({
  row,
  settings,
  update,
  onSave,
}: {
  row: CalcRow;
  settings: PricingSettings;
  update: (id: string, patch: Partial<CalcRow>) => void;
  onSave: SaveFn;
}) {
  const { base, marginAmount, auto, selling, bd, original, minApplied } = useRowCalc(row, settings);

  return (
    <Card className="shadow-soft border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium min-w-0 break-words">{row.name}</p>
          <button
            onClick={() => update(row.id, { expanded: !row.expanded })}
            className="p-1 rounded hover:bg-muted shrink-0"
            aria-label="Details"
          >
            {row.expanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost</p>
            <Dual value={row.cost} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Selling</p>
            <Dual value={selling} className="font-semibold text-success" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Original</p>
            <Dual value={original} className="text-muted-foreground text-sm" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Net Profit
            </p>
            <Dual value={bd.netProfit} className="font-semibold text-success" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <DiscountSelect row={row} update={update} />
          <Badge variant="secondary">{bd.netProfitPct.toFixed(1)}% margin</Badge>
        </div>
        {row.expanded && (
          <div className="space-y-4 rounded-xl bg-secondary/30 p-4">
            <RowControls row={row} auto={auto} update={update} />
            <PriceBuildup
              minApplied={minApplied}
              minNetProfit={settings.minNetProfit}
              row={row}
              base={base}
              marginAmount={marginAmount}
              selling={selling}
              original={original}
              bd={bd}
            />
            <BreakdownGrid
              bd={bd}
              compareAt={original}
              discountPct={row.discountPct}
              settings={settings}
              adsLabel={row.adsOn ? `${row.adsPct}%` : "No ads"}
            />
          </div>
        )}
        <Button
          className="w-full h-11"
          onClick={() => onSave(row, selling, original, bd.netProfit, bd.netProfitPct)}
        >
          <Save className="h-4 w-4 mr-2" /> Save SKU
        </Button>
      </CardContent>
    </Card>
  );
}

function RowItem({
  row,
  settings,
  update,
  onSave,
}: {
  row: CalcRow;
  settings: PricingSettings;
  update: (id: string, patch: Partial<CalcRow>) => void;
  onSave: SaveFn;
}) {
  const { base, marginAmount, auto, selling, bd, original, minApplied } = useRowCalc(row, settings);

  return (
    <>
      <TableRow className="align-top">
        <TableCell className="p-2 align-middle">
          <button
            onClick={() => update(row.id, { expanded: !row.expanded })}
            className="p-1 hover:bg-muted rounded"
            aria-label="Expand"
          >
            {row.expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="break-words">{row.name}</div>
          {row.costNote && (
            <div className="text-[11px] text-muted-foreground">{row.costNote}</div>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Dual value={row.cost} className="ml-auto" />
        </TableCell>
        <TableCell className="text-right">
          <Dual
            value={selling}
            className="ml-auto font-semibold text-success"
            inrClass="text-success/70"
          />
        </TableCell>
        <TableCell>
          <DiscountSelect row={row} update={update} />
        </TableCell>
        <TableCell className="text-right">
          <Dual value={original} className="ml-auto text-xs text-muted-foreground" />
        </TableCell>
        <TableCell className="text-right">
          <Dual
            value={bd.netProfit}
            className="ml-auto font-semibold text-success"
            inrClass="text-success/70"
          />
        </TableCell>
        <TableCell className="text-right tabular-nums align-middle">
          {bd.netProfitPct.toFixed(1)}%
        </TableCell>
        <TableCell className="text-right align-middle">
          <Button
            size="sm"
            onClick={() => onSave(row, selling, original, bd.netProfit, bd.netProfitPct)}
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
      {row.expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-secondary/30 p-6 space-y-6">
            <RowControls row={row} auto={auto} update={update} />
            <PriceBuildup
              minApplied={minApplied}
              minNetProfit={settings.minNetProfit}
              row={row}
              base={base}
              marginAmount={marginAmount}
              selling={selling}
              original={original}
              bd={bd}
            />
            <BreakdownGrid
              bd={bd}
              compareAt={original}
              discountPct={row.discountPct}
              settings={settings}
              adsLabel={row.adsOn ? `${row.adsPct}%` : "No ads"}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PriceBuildup({
  row,
  base,
  marginAmount,
  selling,
  original,
  bd,
  minApplied,
  minNetProfit,
}: {
  row: CalcRow;
  base: number;
  marginAmount: number;
  selling: number;
  original: number;
  bd: ReturnType<typeof computeBreakdown>;
  minApplied?: boolean;
  minNetProfit?: number;
}) {
  const lines: [string, string][] = [
    ["Cost", fmtDual(row.cost)],
    [
      `Base Required Selling Price (${
        row.marginType === "pct" && row.marginPct
          ? "saved target"
          : "target"
      })`,
      fmtDual(base),
    ],
    [
      row.marginType === "pct" && row.marginPct
        ? `Adjustment for ${row.marginPct}% Target Net Profit Margin`
        : "Added Margin",
      marginAmount !== 0 ? `${marginAmount > 0 ? "+ " : "- "}${fmtDual(Math.abs(marginAmount))}` : "—",
    ],
    [
      "Selling Price After Margin",
      fmtDual(row.priceMode === "auto" ? base + marginAmount : selling),
    ],
    ["Discount", row.discountPct > 0 ? `${row.discountPct}%` : "No discount"],
    ["Original Etsy / List Price", fmtDual(original)],
    ["Final Customer Selling Price", fmtDual(selling)],
    ["Net Profit", fmtDual(bd.netProfit)],
    ["Net Profit Margin", `${bd.netProfitPct.toFixed(2)}%`],
  ];
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-sans">
        Price Build-up
      </h4>
      {minApplied && (
        <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium">
          Minimum Profit Rule Applied — {fmtUsdOnly(minNetProfit ?? 0)}
        </div>
      )}
      <dl className="rounded-xl bg-card border border-border p-4 space-y-1 text-sm">
        {lines.map(([k, v], i) => (
          <div
            key={k}
            className={`flex justify-between gap-4 py-1 ${
              i >= lines.length - 2 ? "font-semibold text-primary" : ""
            }`}
          >
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular-nums whitespace-nowrap">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BreakdownGrid({
  bd,
  compareAt,
  discountPct,
  settings,
  adsLabel,
}: {
  bd: ReturnType<typeof computeBreakdown>;
  compareAt: number;
  discountPct: number;
  settings: PricingSettings;
  adsLabel?: string;
}) {
  const rows: ([string, string] | [string, string, "total"])[] = [
    ["Customer Product Price", fmtDual(bd.sellingPrice)],
    ["Etsy Transaction Fee", `− ${fmtDual(bd.transactionFee)}`],
    [
      `Payment Processing Fee (incl. ${fmtUsdOnly(bd.processingFeeFixed)} fixed)`,
      `− ${fmtDual(bd.processingFee)}`,
    ],
    ["Regulatory Operating Fee", `− ${fmtDual(bd.regulatoryFee)}`],
    ...(settings.sellerFeeGst > 0
      ? ([["GST on Seller Fees", `− ${fmtDual(bd.sellerFeeGst)}`]] as [string, string][])
      : []),
    ...(settings.offsiteAdsOn
      ? ([
          [`Offsite Ads Fee (${settings.offsiteAdsPct}%)`, `− ${fmtDual(bd.offsiteAds)}`],
        ] as [string, string][])
      : []),
    ["Revenue After Etsy Fees", fmtDual(bd.revenueAfterEtsyFees), "total"],
    ["TDS Withheld", `− ${fmtDual(bd.tds)}`],
    ["TCS Withheld", `− ${fmtDual(bd.tcs)}`],
    ["Expected Etsy Cash Payout", fmtDual(bd.cashPayout), "total"],
    [`Payoneer Fee (${settings.payoneerFee}%)`, `− ${fmtDual(bd.payoneerFee)}`],
    ["Expected Bank Receipt", fmtDual(bd.bankReceipt), "total"],
    [`Etsy Ads Cost (${adsLabel ?? `${settings.adsSpend}%`})`, `− ${fmtDual(bd.adsSpend)}`],
    ["Shipping", `− ${fmtDual(bd.shipping)}`],
    ["Product Cost", `− ${fmtDual(bd.productCost)}`],
    ...(settings.tdsTcsFinalCost
      ? ([["TDS + TCS (final cost)", `− ${fmtDual(bd.withheldTotal)}`]] as [string, string][])
      : []),
    ["Profit Before Income Tax", fmtDual(bd.profitBeforeTax)],
    ["Income Tax", `− ${fmtDual(bd.incomeTax)}`],
    ["Final Net Profit", fmtDual(bd.netProfit), "total"],
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-sans">
          Money Flow Breakdown
        </h4>
        <dl className="space-y-1 text-sm">
          {rows.map(([k, v, kind]) => (
            <div
              key={k}
              className={`flex justify-between gap-4 py-1.5 ${
                kind === "total"
                  ? "border-t border-primary/30 pt-2 mt-1 font-semibold text-primary"
                  : ""
              }`}
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular-nums font-medium text-foreground whitespace-nowrap">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between pt-2 text-xs text-muted-foreground">
            <dt>Net Profit Margin</dt>
            <dd className="tabular-nums">{bd.netProfitPct.toFixed(2)}%</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-sans">
            Discount Calculator
          </h4>
          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground text-sm">Original Etsy Price</span>
              <span className="tabular-nums font-semibold">{fmtDual(compareAt)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-muted-foreground text-sm">
                <Badge variant="secondary">{discountPct}%</Badge> Discount
              </span>
              <span className="tabular-nums text-destructive">
                −{fmtDual(Math.max(0, compareAt - bd.sellingPrice))}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-t pt-3">
              <span className="text-muted-foreground text-sm">Customer Product Price</span>
              <span className="tabular-nums font-semibold text-primary">
                {fmtDual(bd.sellingPrice)}
              </span>
            </div>
          </div>
        </div>

        {!settings.tdsTcsFinalCost && (
          <div className="rounded-xl bg-secondary/50 border border-border p-5 text-sm space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              TDS / TCS Tax Credit (Withholding)
            </p>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">TDS + TCS withheld</span>
              <span className="tabular-nums font-semibold">{fmtDual(bd.withheldTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Reduces cash payout only — claimable as tax credit, so it does not reduce economic
              net profit.
            </p>
          </div>
        )}

        {settings.buyerTaxOn && (
          <div className="rounded-xl bg-card border border-border p-5 text-sm space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Buyer Tax Simulator
            </p>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Actual Product Selling Price</span>
              <span className="tabular-nums">{fmtDual(bd.sellingPrice)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Buyer Tax ({settings.buyerTaxPct}%) — collected & remitted by Etsy
              </span>
              <span className="tabular-nums">{fmtDual(bd.buyerTax)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
              <span>Buyer Pays</span>
              <span className="tabular-nums">{fmtDual(bd.buyerPays)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ---------------- Settings ---------------- */

type NumKey = {
  [K in keyof PricingSettings]: PricingSettings[K] extends number ? K : never;
}[keyof PricingSettings];

const FEE_FIELDS: { key: NumKey; label: string; suffix: string; hint?: string }[] = [
  { key: "transactionFee", label: "Etsy Transaction Fee", suffix: "%" },
  { key: "processingFee", label: "Payment Processing Fee", suffix: "%" },
  { key: "processingFeeFixedInr", label: "Processing Fixed Fee", suffix: "₹" },
  { key: "usdInrRate", label: "USD → INR Rate", suffix: "₹/$" },
  { key: "regulatoryFee", label: "Regulatory Operating Fee", suffix: "%" },
  { key: "sellerFeeGst", label: "GST on Seller Fees", suffix: "%" },
  {
    key: "payoneerFee",
    label: "Payoneer Withdrawal / Conversion Fee",
    suffix: "%",
    hint: "Charged by Payoneer on the Etsy cash payout, not by Etsy",
  },
];

const TAX_FIELDS: { key: NumKey; label: string; suffix: string }[] = [
  { key: "tds", label: "TDS Withheld", suffix: "%" },
  { key: "tcs", label: "TCS Withheld", suffix: "%" },
  { key: "incomeTax", label: "Income Tax on Profit", suffix: "%" },
];

const COST_FIELDS: { key: NumKey; label: string; suffix: string }[] = [
  { key: "adsSpend", label: "Average Etsy Ads Cost", suffix: "%" },
  { key: "shipping", label: "Shipping Cost", suffix: "$" },
  { key: "targetNetProfit", label: "Target Net Profit", suffix: "%" },
  { key: "minNetProfit", label: "Minimum Net Profit", suffix: "$" },
];

function NumField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-11 pr-12"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground mt-1">{hint}</span>}
      </span>
      <span
        className={`mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`block h-5 w-5 mt-0.5 rounded-full bg-card shadow-soft transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function SettingsView({
  settings,
  onChange,
}: {
  settings: PricingSettings;
  onChange: (s: PricingSettings) => void;
}) {
  const [draft, setDraft] = useState<PricingSettings>(settings);
  useEffect(() => setDraft(settings), [settings]);
  const set = (patch: Partial<PricingSettings>) => setDraft({ ...draft, ...patch });

  return (
    <Card className="shadow-soft border-border/60 max-w-3xl">
      <CardHeader>
        <CardTitle className="font-display text-xl">Pricing Logic</CardTitle>
        <p className="text-sm text-muted-foreground">
          Every value drives the selling-price solver. Saved on this device and applied to all
          calculations.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Etsy Fees</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEE_FIELDS.map((f) => (
              <NumField
                key={f.key}
                label={f.label}
                suffix={f.suffix}
                value={draft[f.key]}
                onChange={(n) => set({ [f.key]: n } as Partial<PricingSettings>)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Fixed processing fee is converted using the USD/INR rate above — never hardcoded.
            Keep GST on seller fees at 0% unless Etsy actually charges it on your statements.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
            Tax Withholding
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {TAX_FIELDS.map((f) => (
              <NumField
                key={f.key}
                label={f.label}
                suffix={f.suffix}
                value={draft[f.key]}
                onChange={(n) => set({ [f.key]: n } as Partial<PricingSettings>)}
              />
            ))}
          </div>
          <Toggle
            label="Treat TDS / TCS as final cost"
            hint="OFF: deducted from cash payout only and shown as recoverable tax credit. ON: also priced in as a real cost."
            checked={draft.tdsTcsFinalCost}
            onChange={(v) => set({ tdsTcsFinalCost: v })}
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
            Ads, Shipping & Target
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {COST_FIELDS.map((f) => (
              <NumField
                key={f.key}
                label={f.label}
                suffix={f.suffix}
                value={draft[f.key]}
                onChange={(n) => set({ [f.key]: n } as Partial<PricingSettings>)}
              />
            ))}
          </div>
          <Toggle
            label="Offsite Ads Sale"
            hint="Separate from your average Etsy ads cost. Applied on top when a sale comes from Offsite Ads."
            checked={draft.offsiteAdsOn}
            onChange={(v) => set({ offsiteAdsOn: v })}
          />
          {draft.offsiteAdsOn && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Offsite Ads Fee
                </Label>
                <div className="mt-1.5 flex gap-2">
                  {[12, 15].map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={draft.offsiteAdsPct === p ? "default" : "outline"}
                      onClick={() => set({ offsiteAdsPct: p })}
                      className="h-11"
                    >
                      {p}%
                    </Button>
                  ))}
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.offsiteAdsPct}
                    onChange={(e) => set({ offsiteAdsPct: parseFloat(e.target.value) || 0 })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
            Buyer Tax Simulator
          </h3>
          <Toggle
            label="Simulate buyer sales tax"
            hint="Display only — buyer tax is collected and remitted by Etsy and is never seller revenue."
            checked={draft.buyerTaxOn}
            onChange={(v) => set({ buyerTaxOn: v })}
          />
          {draft.buyerTaxOn && (
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField
                label="Estimated Buyer Tax"
                suffix="%"
                value={draft.buyerTaxPct}
                onChange={(n) => set({ buyerTaxPct: n })}
              />
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => {
              onChange(draft);
              toast.success("Pricing logic saved.");
            }}
          >
            <Save className="h-4 w-4 mr-2" /> Save Logic
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(DEFAULT_SETTINGS);
              onChange(DEFAULT_SETTINGS);
              toast.success("Restored default settings.");
            }}
          >
            Reset Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Saved ---------------- */

function SavedView({
  saved,
  refresh,
  settings,
}: {
  saved: SavedPrice[];
  refresh: () => void;
  settings: PricingSettings;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof SavedPrice>("date");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE = 10;

  const filtered = useMemo(() => {
    let list = saved.filter(
      (r) =>
        r.sku.toLowerCase().includes(q.toLowerCase()) ||
        r.productName.toLowerCase().includes(q.toLowerCase())
    );
    list = list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return asc ? cmp : -cmp;
    });
    return list;
  }, [saved, q, sortKey, asc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);

  function toggleSort(k: keyof SavedPrice) {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(true);
    }
  }

  function exportCsv(delimiter = ",", filename = "lepdo-prices.csv") {
    const headers = [
      "Date",
      "SKU",
      "Product",
      "Cost",
      "Selling Price",
      "Original Price",
      "Discount %",
      "Net Profit",
      "Net Margin %",
    ];
    const lines = [headers.join(delimiter)];
    for (const r of filtered) {
      lines.push(
        [
          new Date(r.date).toISOString(),
          csvEscape(r.sku),
          csvEscape(r.productName),
          r.cost,
          r.sellingPrice,
          r.originalPrice,
          r.discountPct,
          r.netProfit.toFixed(2),
          (r.netMargin ?? (r.sellingPrice > 0 ? (r.netProfit / r.sellingPrice) * 100 : 0)).toFixed(2),
        ].join(delimiter)
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-soft border-border/60">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search SKU or product…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="max-w-xs h-10"
          />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(",", "lepdo-prices.csv")}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCsv("\t", "lepdo-prices.xls")}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                {[
                  ["date", "Date"],
                  ["sku", "SKU"],
                  ["productName", "Product"],
                  ["cost", "Cost"],
                  ["sellingPrice", "Selling"],
                  ["originalPrice", "Original"],
                  ["discountPct", "Disc %"],
                  ["netProfit", "Net Profit"],
                ].map(([k, label]) => (
                  <TableHead
                    key={k}
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort(k as keyof SavedPrice)}
                  >
                    {label}
                    {sortKey === k && (
                      <span className="ml-1 text-xs">{asc ? "▲" : "▼"}</span>
                    )}
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No saved products yet.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((r) => (
                <SavedRow key={r.id} row={r} refresh={refresh} settings={settings} />
              ))}
            </TableBody>
          </Table>
        </div>
        {pageCount > 1 && (
          <div className="p-4 flex items-center justify-between border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {pageCount} · {filtered.length} items
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SavedRow({
  row,
  refresh,
  settings,
}: {
  row: SavedPrice;
  refresh: () => void;
  settings: PricingSettings;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(row);
  useEffect(() => setDraft(row), [row]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  if (edit) {
    return (
      <TableRow className="bg-secondary/20">
        <TableCell className="text-xs text-muted-foreground">
          {new Date(row.date).toLocaleDateString()}
        </TableCell>
        <TableCell>
          <Input
            value={draft.sku}
            onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <Input
            value={draft.productName}
            onChange={(e) => setDraft({ ...draft, productName: e.target.value })}
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={draft.cost}
            onChange={(e) => setDraft({ ...draft, cost: parseFloat(e.target.value) || 0 })}
            className="h-8 w-20 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={draft.sellingPrice}
            onChange={(e) => setDraft({ ...draft, sellingPrice: parseFloat(e.target.value) || 0 })}
            className="h-8 w-20 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={draft.originalPrice}
            onChange={(e) => setDraft({ ...draft, originalPrice: parseFloat(e.target.value) || 0 })}
            className="h-8 w-20 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={draft.discountPct}
            onChange={(e) => setDraft({ ...draft, discountPct: parseFloat(e.target.value) || 0 })}
            className="h-8 w-16 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={draft.netProfit}
            onChange={(e) => setDraft({ ...draft, netProfit: parseFloat(e.target.value) || 0 })}
            className="h-8 w-20 text-right"
          />
        </TableCell>
        <TableCell className="text-right space-x-1 whitespace-nowrap">
          <Button
            size="sm"
            onClick={() => {
              updateSaved(row.id, draft);
              refresh();
              setEdit(false);
              toast.success("Updated");
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEdit(false)}>
            Cancel
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(row.date).toLocaleDateString()}
      </TableCell>
      <TableCell className="font-mono font-medium">{row.sku}</TableCell>
      <TableCell>{row.productName}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtUsd(row.cost)}</TableCell>
      <TableCell className="text-right tabular-nums font-semibold text-primary">
        {fmtUsd(row.sellingPrice)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground line-through">
        {fmtUsd(row.originalPrice)}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="secondary">{row.discountPct}%</Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums text-success font-semibold">
        {fmtUsd(row.netProfit)}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <div className="inline-flex gap-1">
          <IconBtn onClick={() => copy(String(row.sellingPrice), "Price")} label="Copy price">
            <Copy className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn onClick={() => copy(row.sku, "SKU")} label="Copy SKU">
            <Files className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn
            onClick={() => {
              addSaved({ ...row, id: `${Date.now()}`, date: new Date().toISOString() });
              refresh();
              toast.success("Duplicated");
            }}
            label="Duplicate"
          >
            <Files className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn
            onClick={() => {
              const price = roundPrice(calculateSellingPrice(row.cost, settings));
              if (!Number.isFinite(price)) {
                toast.error("Target unreachable with current pricing logic.");
                return;
              }
              const bd = computeBreakdown(row.cost, price, settings);
              updateSaved(row.id, {
                sellingPrice: price,
                originalPrice: compareAtPrice(price, row.discountPct),
                netProfit: bd.netProfit,
                netMargin: bd.netProfitPct,
              });
              refresh();
              toast.success("Recalculated with latest pricing logic");
            }}
            label="Recalculate with latest pricing logic"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn onClick={() => setEdit(true)} label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn
            onClick={() => {
              if (confirm(`Delete ${row.sku}?`)) {
                deleteSaved(row.id);
                refresh();
              }
            }}
            label="Delete"
            danger
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </TableCell>
    </TableRow>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`p-1.5 rounded-md border border-border hover:bg-muted transition-colors ${
        danger ? "hover:bg-destructive/10 hover:text-destructive" : ""
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Utils ---------------- */

function fmtUsd(n: number) {
  return fmtDual(n);
}
function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// Consumed to satisfy TS unused imports check (X icon used below if drawer close needed elsewhere)
void X;
