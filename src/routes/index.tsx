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
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  type PricingSettings,
  calculateSellingPrice,
  computeBreakdown,
  parseProducts,
  roundPrice,
} from "@/lib/pricing";
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
  getCalcCount,
  getTodayCalcCount,
  type SavedPrice,
} from "@/lib/storage";

const PASSWORD = "2424";

export const Route = createFileRoute("/")({
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

type Section = "calculator" | "settings" | "saved";

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
                  : "Saved SKUs & Prices"}
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
              savedCount={saved.length}
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
            <SavedView saved={saved} refresh={refreshSaved} />
          )}
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
          alt="LEPDO Lifestyle"
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
  sellingPrice: number;
  sku: string;
  discountPct: number;
  expanded: boolean;
}

const DEFAULT_INPUT = `Silver $100
9KT $270
14KT $366
18KT $441`;

function CalculatorView({
  settings,
  onSaved,
  savedCount,
}: {
  settings: PricingSettings;
  onSaved: () => void;
  savedCount: number;
}) {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [rows, setRows] = useState<CalcRow[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });

  useEffect(() => {
    setStats({ total: getCalcCount(), today: getTodayCalcCount() });
  }, [rows]);

  function calculate() {
    const parsed = parseProducts(input);
    if (!parsed.length) {
      toast.error("No products detected. Format: 'Silver $100' per line.");
      return;
    }
    const nextRows: CalcRow[] = parsed.map((p, i) => {
      const raw = calculateSellingPrice(p.cost, settings);
      const price = Number.isFinite(raw) ? roundPrice(raw) : 0;
      return {
        id: `${Date.now()}-${i}`,
        name: p.name,
        cost: p.cost,
        sellingPrice: price,
        sku: "",
        discountPct: 30,
        expanded: false,
      };
    });
    setRows(nextRows);
    bumpCalcCount(nextRows.length);
    setStats({ total: getCalcCount(), today: getTodayCalcCount() });
    toast.success(`Calculated ${nextRows.length} product${nextRows.length > 1 ? "s" : ""}.`);
  }

  function update(id: string, patch: Partial<CalcRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const savedAvg = useMemo(() => {
    const list = loadSaved();
    if (!list.length) return { price: 0, profit: 0, cost: 0 };
    const p = list.reduce((a, b) => a + b.sellingPrice, 0) / list.length;
    const pr = list.reduce((a, b) => a + b.netProfit, 0) / list.length;
    const c = list.reduce((a, b) => a + b.cost, 0) / list.length;
    return { price: p, profit: pr, cost: c };
  }, [savedCount]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Saved Products" value={String(savedCount)} />
        <StatCard label="Avg Selling" value={fmtUsd(savedAvg.price)} />
        <StatCard label="Avg Profit" value={fmtUsd(savedAvg.profit)} />
        <StatCard label="Avg Cost" value={fmtUsd(savedAvg.cost)} />
        <StatCard label="Total Calcs" value={String(stats.total)} />
        <StatCard label="Today" value={String(stats.today)} />
      </div>

      <Card className="shadow-soft border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-xl">Paste Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="Silver $100&#10;9KT $270&#10;14KT $366"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={calculate} className="h-11 px-6">
              <CalcIcon className="h-4 w-4 mr-2" />
              Calculate Selling Price
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInput("");
                setRows([]);
              }}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Detected format: <span className="font-mono">Name $Cost</span> — one per line.
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="shadow-soft border-border/60 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display text-xl">Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead className="w-8" />
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right">Compare At</TableHead>
                    <TableHead className="text-right">Disc %</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <RowItem
                      key={r.id}
                      row={r}
                      settings={settings}
                      update={update}
                      onSave={() => {
                        if (!r.sku.trim()) {
                          toast.error("Enter a SKU before saving.");
                          return;
                        }
                        const bd = computeBreakdown(r.cost, r.sellingPrice, settings);
                        const compare = r.discountPct > 0
                          ? roundPrice(r.sellingPrice / (1 - r.discountPct / 100))
                          : r.sellingPrice;
                        addSaved({
                          id: `${Date.now()}-${r.id}`,
                          date: new Date().toISOString(),
                          sku: r.sku.trim(),
                          productName: r.name,
                          cost: r.cost,
                          sellingPrice: r.sellingPrice,
                          originalPrice: compare,
                          discountPct: r.discountPct,
                          netProfit: bd.netProfit,
                        });
                        onSaved();
                        toast.success(`Saved ${r.sku}`);
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
  onSave: () => void;
}) {
  const bd = useMemo(
    () => computeBreakdown(row.cost, row.sellingPrice, settings),
    [row.cost, row.sellingPrice, settings]
  );
  const compare =
    row.discountPct > 0 && row.discountPct < 100
      ? roundPrice(row.sellingPrice / (1 - row.discountPct / 100))
      : row.sellingPrice;

  return (
    <>
      <TableRow className="align-middle">
        <TableCell className="p-2">
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
        <TableCell className="font-medium">{row.name}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtUsd(row.cost)}</TableCell>
        <TableCell className="text-right tabular-nums font-semibold text-primary">
          {fmtUsd(row.sellingPrice)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground line-through">
          {fmtUsd(compare)}
        </TableCell>
        <TableCell className="text-right">
          <Input
            type="number"
            value={row.discountPct}
            onChange={(e) =>
              update(row.id, { discountPct: parseFloat(e.target.value) || 0 })
            }
            className="w-20 h-8 text-right"
            min={0}
            max={95}
          />
        </TableCell>
        <TableCell className="text-right tabular-nums text-success font-semibold">
          {fmtUsd(bd.netProfit)}
        </TableCell>
        <TableCell>
          <Input
            value={row.sku}
            onChange={(e) => update(row.id, { sku: e.target.value })}
            placeholder="LP-XX-000"
            className="w-32 h-8"
          />
        </TableCell>
        <TableCell className="text-right">
          <Button size="sm" onClick={onSave}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save
          </Button>
        </TableCell>
      </TableRow>
      {row.expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-secondary/30 p-6">
            <BreakdownGrid bd={bd} compareAt={compare} discountPct={row.discountPct} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function BreakdownGrid({
  bd,
  compareAt,
  discountPct,
}: {
  bd: ReturnType<typeof computeBreakdown>;
  compareAt: number;
  discountPct: number;
}) {
  const rows: [string, string][] = [
    ["Selling Price (Customer Pays)", fmtUsd(bd.sellingPrice)],
    ["Etsy Transaction Fee", `− ${fmtUsd(bd.transactionFee)}`],
    ["GST on Transaction Fee", `− ${fmtUsd(bd.gstOnTransactionFee)}`],
    ["Processing Fee", `− ${fmtUsd(bd.processingFee)}`],
    ["GST on Processing Fee", `− ${fmtUsd(bd.gstOnProcessingFee)}`],
    ["Ads Spend", `− ${fmtUsd(bd.adsSpend)}`],
    ["Bank Received", fmtUsd(bd.bankReceived)],
    ["GST After Bank Receipt", `− ${fmtUsd(bd.gstAfterBank)}`],
    ["Shipping Charge", `− ${fmtUsd(bd.shipping)}`],
    ["Product Cost", `− ${fmtUsd(bd.productCost)}`],
    ["Profit Before Income Tax", fmtUsd(bd.profitBeforeTax)],
    ["Income Tax", `− ${fmtUsd(bd.incomeTax)}`],
    ["Net Profit", fmtUsd(bd.netProfit)],
  ];
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-sans">
          Money Flow Breakdown
        </h4>
        <dl className="space-y-1.5 text-sm">
          {rows.map(([k, v], i) => (
            <div
              key={k}
              className={`flex justify-between py-1.5 ${
                i === rows.length - 1
                  ? "border-t border-primary/30 pt-3 mt-2 font-semibold text-success text-base"
                  : ""
              }`}
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular-nums font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-sans">
          Discount Calculator
        </h4>
        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Compare At (Original)</span>
            <span className="tabular-nums font-semibold text-lg">{fmtUsd(compareAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Discount</span>
            <Badge variant="secondary">{discountPct}%</Badge>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground text-sm">Discounted (Selling) Price</span>
            <span className="tabular-nums font-semibold text-primary text-lg">
              {fmtUsd(bd.sellingPrice)}
            </span>
          </div>
          <div className="pt-2 text-xs text-muted-foreground">
            Net Profit Margin: {bd.netProfitPct.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 border border-border/60 shadow-soft">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-primary tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}

/* ---------------- Settings ---------------- */

const SETTING_FIELDS: {
  key: keyof PricingSettings;
  label: string;
  suffix: string;
}[] = [
  { key: "transactionFee", label: "Transaction Fee", suffix: "%" },
  { key: "gstOnTransactionFee", label: "GST on Transaction Fee", suffix: "%" },
  { key: "processingFee", label: "Processing Fee", suffix: "%" },
  { key: "gstOnProcessingFee", label: "GST on Processing Fee", suffix: "%" },
  { key: "adsSpend", label: "Ads Spend", suffix: "%" },
  { key: "gstAfterBank", label: "GST After Bank Receipt", suffix: "%" },
  { key: "incomeTax", label: "Income Tax on Profit", suffix: "%" },
  { key: "targetNetProfit", label: "Target Net Profit", suffix: "%" },
  { key: "shipping", label: "Shipping Charge", suffix: "$" },
];

function SettingsView({
  settings,
  onChange,
}: {
  settings: PricingSettings;
  onChange: (s: PricingSettings) => void;
}) {
  const [draft, setDraft] = useState<PricingSettings>(settings);
  useEffect(() => setDraft(settings), [settings]);

  return (
    <Card className="shadow-soft border-border/60 max-w-3xl">
      <CardHeader>
        <CardTitle className="font-display text-xl">Pricing Logic</CardTitle>
        <p className="text-sm text-muted-foreground">
          These values drive every calculation. Changes apply instantly to future calculations and are stored on this device.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          {SETTING_FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {f.label}
              </Label>
              <div className="relative mt-1.5">
                <Input
                  type="number"
                  step="0.01"
                  value={draft[f.key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: parseFloat(e.target.value) || 0 })
                  }
                  className="h-11 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {f.suffix}
                </span>
              </div>
            </div>
          ))}
        </div>
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

function SavedView({ saved, refresh }: { saved: SavedPrice[]; refresh: () => void }) {
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
      const av = a[sortKey];
      const bv = b[sortKey];
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
                <SavedRow key={r.id} row={r} refresh={refresh} />
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

function SavedRow({ row, refresh }: { row: SavedPrice; refresh: () => void }) {
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
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// Consumed to satisfy TS unused imports check (X icon used below if drawer close needed elsewhere)
void X;
