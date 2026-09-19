import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, type PricingSettings } from "./pricing";

const K_AUTH = "lepdo.auth.v1";
const K_CALC_COUNT = "lepdo.calcCount.v1";
const K_CALC_LOG = "lepdo.calcLog.v1"; // ISO dates of each calculation
const SETTINGS_ID = "global";

export interface SavedPrice {
  id: string;
  date: string; // ISO
  sku: string;
  productName: string;
  cost: number;
  sellingPrice: number;
  originalPrice: number;
  discountPct: number;
  netProfit: number;
  netMargin?: number;
}

/* ---------------- in-memory cache (kept in sync with the cloud DB) --------- */

let settingsCache: PricingSettings = DEFAULT_SETTINGS;
let savedCache: SavedPrice[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeStorage(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

type Row = {
  id: string;
  date: string;
  sku: string | null;
  product_name: string | null;
  cost: number | string | null;
  selling_price: number | string | null;
  original_price: number | string | null;
  discount_pct: number | string | null;
  net_profit: number | string | null;
  net_margin: number | string | null;
};

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

function toSaved(r: Row): SavedPrice {
  return {
    id: r.id,
    date: r.date,
    sku: r.sku ?? "",
    productName: r.product_name ?? "",
    cost: num(r.cost),
    sellingPrice: num(r.selling_price),
    originalPrice: num(r.original_price),
    discountPct: num(r.discount_pct),
    netProfit: num(r.net_profit),
    netMargin: r.net_margin === null || r.net_margin === undefined ? undefined : Number(r.net_margin),
  };
}

interface SavedRowPatch {
  date?: string;
  sku?: string;
  product_name?: string;
  cost?: number;
  selling_price?: number;
  original_price?: number;
  discount_pct?: number;
  net_profit?: number;
  net_margin?: number;
}

function toRow(p: Partial<SavedPrice>): SavedRowPatch {
  const out: SavedRowPatch = {};
  if (p.date !== undefined) out.date = p.date;
  if (p.sku !== undefined) out.sku = p.sku;
  if (p.productName !== undefined) out.product_name = p.productName;
  if (p.cost !== undefined) out.cost = p.cost;
  if (p.sellingPrice !== undefined) out.selling_price = p.sellingPrice;
  if (p.originalPrice !== undefined) out.original_price = p.originalPrice;
  if (p.discountPct !== undefined) out.discount_pct = p.discountPct;
  if (p.netProfit !== undefined) out.net_profit = p.netProfit;
  if (p.netMargin !== undefined) out.net_margin = p.netMargin;
  return out;
}

async function fetchSettings() {
  const { data } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  const raw = (data?.data ?? {}) as Partial<PricingSettings>;
  settingsCache = { ...DEFAULT_SETTINGS, ...raw };
}

/** Fetch ALL saved rows. The API caps a single request at 1000 rows, so page through. */
async function fetchSaved() {
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("saved_prices")
      .select("*")
      .order("date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) break;
    const chunk = (data ?? []) as Row[];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  savedCache = all.map(toSaved);
}

/** Load everything from the cloud and keep it live-synced across users. */
export async function initStorage(): Promise<void> {
  if (initialized) {
    await Promise.all([fetchSettings(), fetchSaved()]);
    notify();
    return;
  }
  initialized = true;
  await Promise.all([fetchSettings(), fetchSaved()]);
  notify();

  supabase
    .channel("lepdo-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "saved_prices" }, () => {
      void fetchSaved().then(notify);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => {
      void fetchSettings().then(notify);
    })
    .subscribe();
}

/* ---------------- settings ---------------- */

export function loadSettings(): PricingSettings {
  return settingsCache;
}

export function saveSettings(s: PricingSettings) {
  settingsCache = s;
  notify();
  void supabase
    .from("app_settings")
    .upsert({ id: SETTINGS_ID, data: JSON.parse(JSON.stringify(s)), updated_at: new Date().toISOString() });
}

/* ---------------- saved prices ---------------- */

export function loadSaved(): SavedPrice[] {
  return savedCache;
}

export async function addSaved(p: SavedPrice): Promise<void> {
  const normalizedSku = p.sku.trim();
  const matchingRows = normalizedSku
    ? savedCache.filter((r) => r.sku.trim().toUpperCase() === normalizedSku.toUpperCase())
    : [];
  const existing = matchingRows[0];
  const id = existing?.id ?? (
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );
  const row: SavedPrice = { ...p, id, date: p.date || new Date().toISOString() };
  const matchingIds = new Set(matchingRows.map((match) => match.id));
  savedCache = [row, ...savedCache.filter((saved) => !matchingIds.has(saved.id))];
  notify();

  if (matchingRows.length > 1) {
    const duplicateIds = matchingRows.slice(1).map((match) => match.id);
    const { error: duplicateError } = await supabase.from("saved_prices").delete().in("id", duplicateIds);
    if (duplicateError) throw duplicateError;
  }

  const payload = { id, ...toRow(row) };
  const result = existing
    ? await supabase.from("saved_prices").update(toRow(row)).eq("id", id)
    : await supabase.from("saved_prices").insert(payload);
  if (result.error) {
    await fetchSaved();
    notify();
    throw result.error;
  }
  await fetchSaved();
  notify();
}

export function updateSaved(id: string, patch: Partial<SavedPrice>) {
  savedCache = savedCache.map((r) => (r.id === id ? { ...r, ...patch } : r));
  notify();
  void supabase.from("saved_prices").update(toRow(patch)).eq("id", id);
}

export function deleteSaved(id: string) {
  savedCache = savedCache.filter((r) => r.id !== id);
  notify();
  void supabase.from("saved_prices").delete().eq("id", id);
}

/**
 * Delete a whole Main SKU group. Removes the known rows by id AND any row in the
 * database whose SKU belongs to the same Main SKU, so nothing can survive a delete.
 */
export async function deleteSavedGroup(base: string, ids: string[]) {
  const idSet = new Set(ids);
  const prefix = base.trim();
  savedCache = savedCache.filter(
    (r) => !idSet.has(r.id) && !(prefix && (r.sku === prefix || r.sku.startsWith(`${prefix}-`)))
  );
  notify();
  if (ids.length) {
    const { error } = await supabase.from("saved_prices").delete().in("id", ids);
    if (error) {
      await fetchSaved();
      notify();
      throw error;
    }
  }
  if (prefix) {
    const { error: exactError } = await supabase.from("saved_prices").delete().eq("sku", prefix);
    if (exactError) throw exactError;
    const escapedPrefix = prefix.replace(/([%_\\])/g, "\\$1");
    const { error: prefixError } = await supabase
      .from("saved_prices")
      .delete()
      .like("sku", `${escapedPrefix}-%`);
    if (prefixError) throw prefixError;
  }
  await fetchSaved();
  notify();
}

export function writeSaved(list: SavedPrice[]) {
  savedCache = list;
  notify();
}

/* ---------------- local-only session / counters ---------------- */

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(K_AUTH) === "1";
}
export function setAuthed(v: boolean) {
  if (v) localStorage.setItem(K_AUTH, "1");
  else localStorage.removeItem(K_AUTH);
}

export function bumpCalcCount(n: number) {
  const cur = parseInt(localStorage.getItem(K_CALC_COUNT) || "0", 10);
  localStorage.setItem(K_CALC_COUNT, String(cur + n));
  const log: string[] = JSON.parse(localStorage.getItem(K_CALC_LOG) || "[]");
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < n; i++) log.push(today);
  localStorage.setItem(K_CALC_LOG, JSON.stringify(log));
}
export function getCalcCount(): number {
  return parseInt(localStorage.getItem(K_CALC_COUNT) || "0", 10);
}
export function getTodayCalcCount(): number {
  const log: string[] = JSON.parse(localStorage.getItem(K_CALC_LOG) || "[]");
  const today = new Date().toISOString().slice(0, 10);
  return log.filter((d) => d === today).length;
}
